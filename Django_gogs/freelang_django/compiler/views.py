# Django Views — FreeLang 컴파일러 + Redis 캐싱 + Gogs Webhook

import json
import hashlib
import logging
from datetime import datetime
from django.views.decorators.http import csrf_exempt
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

class FreeLangCompileAPIView(APIView):
    """
    FreeLang 코드 컴파일 API

    POST /api/compile/
    {
        "code": "var x = 42\nprintln(x)",
        "lang": "freelang"  # 기본값: freelang
    }

    Response:
    {
        "status": "success" | "error",
        "result": "...",
        "cached": true | false,
        "compile_time_ms": 123
    }
    """

    def post(self, request):
        """FreeLang 코드 컴파일"""
        try:
            code = request.data.get('code')
            if not code:
                return Response(
                    {'status': 'error', 'message': 'code is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 캐시 키 생성
            code_hash = hashlib.md5(code.encode()).hexdigest()
            cache_key = f'freelang:compile:{code_hash}'

            # 캐시에서 먼저 조회
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit: {cache_key}")
                return Response({
                    'status': 'success',
                    'result': cached_result['output'],
                    'cached': True,
                    'compile_time_ms': 0
                })

            # 캐시 미스: 실제 컴파일 수행
            # TODO: FreeLang 컴파일러 호출
            # result = compile_freelang(code)

            # 임시 응답
            result = {
                'output': 'Compilation result (Redis cached)',
                'errors': []
            }

            # 결과를 캐시에 저장 (1시간)
            cache.set(cache_key, result, timeout=3600)

            logger.info(f"Compiled and cached: {cache_key}")
            return Response({
                'status': 'success',
                'result': result['output'],
                'cached': False,
                'compile_time_ms': 50
            })

        except Exception as e:
            logger.error(f"Compilation error: {str(e)}")
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request):
        """캐시 통계"""
        try:
            cache_keys = cache.keys('freelang:compile:*')
            return Response({
                'status': 'success',
                'cached_compilations': len(cache_keys) if cache_keys else 0,
                'total_cache_size': 'unknown'
            })
        except Exception as e:
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@csrf_exempt
def gogs_webhook(request):
    """
    Gogs 저장소 푸시 이벤트 Webhook 핸들러

    Gogs webhook 설정:
    - URL: /api/webhook/gogs/
    - Events: push
    - Content Type: application/json

    Payload: https://gogs.io/docs/features/webhook
    """
    if request.method != 'POST':
        return JsonResponse(
            {'error': 'POST method required'},
            status=405
        )

    try:
        payload = json.loads(request.body)

        # 기본 정보 추출
        repo_name = payload.get('repository', {}).get('name', 'unknown')
        repo_url = payload.get('repository', {}).get('html_url', '')
        pusher_name = payload.get('pusher', {}).get('name', 'unknown')
        commits = payload.get('commits', [])
        ref = payload.get('ref', 'unknown')
        branch = ref.split('/')[-1] if '/' in ref else ref

        # 웹훅 이벤트 로깅
        event_log = {
            'timestamp': datetime.now().isoformat(),
            'repository': repo_name,
            'pusher': pusher_name,
            'branch': branch,
            'commits': len(commits),
            'repository_url': repo_url,
            'message': f"{pusher_name} pushed {len(commits)} commit(s) to {repo_name}/{branch}"
        }

        logger.info(f"Gogs webhook received: {json.dumps(event_log)}")

        # 캐시 무효화 (해당 저장소의 컴파일 캐시 제거)
        # 선택사항: 대규모 캐시 정리가 필요할 수 있음
        cache_pattern = f'freelang:compile:*'
        try:
            cache_keys = cache.keys(cache_pattern)
            if cache_keys:
                cache.delete_many(cache_keys)
                logger.info(f"Invalidated {len(cache_keys)} cache entries")
        except Exception as e:
            logger.warning(f"Cache invalidation failed: {str(e)}")

        # 커밋 상세 정보 처리
        commit_details = []
        for commit in commits:
            commit_details.append({
                'id': commit.get('id', '')[:8],
                'message': commit.get('message', '').split('\n')[0],
                'author': commit.get('author', {}).get('name', 'unknown'),
                'timestamp': commit.get('timestamp', '')
            })

        # 성공 응답
        response = {
            'status': 'received',
            'repository': repo_name,
            'branch': branch,
            'pusher': pusher_name,
            'commits': len(commits),
            'commit_details': commit_details,
            'cache_invalidated': True,
            'message': f"Webhook processed: {len(commits)} commit(s) received"
        }

        logger.info(f"Webhook processed successfully: {repo_name}/{branch}")
        return JsonResponse(response, status=200)

    except json.JSONDecodeError:
        logger.error("Invalid JSON in webhook payload")
        return JsonResponse(
            {'error': 'Invalid JSON'},
            status=400
        )
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        return JsonResponse(
            {'error': f'Webhook processing failed: {str(e)}'},
            status=500
        )


@csrf_exempt
def cache_clear(request):
    """
    캐시 수동 초기화 엔드포인트

    DELETE /api/cache/clear/
    """
    if request.method == 'DELETE':
        try:
            cache_pattern = 'freelang:compile:*'
            cache_keys = cache.keys(cache_pattern)
            deleted_count = 0

            if cache_keys:
                cache.delete_many(cache_keys)
                deleted_count = len(cache_keys)

            logger.info(f"Cache cleared: {deleted_count} entries")
            return JsonResponse({
                'status': 'success',
                'cleared': deleted_count,
                'message': f'Cleared {deleted_count} cache entries'
            })
        except Exception as e:
            logger.error(f"Cache clear failed: {str(e)}")
            return JsonResponse(
                {'error': str(e)},
                status=500
            )
    else:
        return JsonResponse(
            {'error': 'DELETE method required'},
            status=405
        )


def cache_stats(request):
    """
    캐시 통계 조회

    GET /api/cache/stats/
    """
    try:
        cache_keys = cache.keys('freelang:compile:*')
        cache_count = len(cache_keys) if cache_keys else 0

        return Response({
            'status': 'success',
            'cache_backend': 'redis',
            'cached_compilations': cache_count,
            'cache_entries': cache_keys if cache_keys else [],
            'cache_location': 'redis://127.0.0.1:6379/1'
        })
    except Exception as e:
        logger.error(f"Cache stats error: {str(e)}")
        return Response(
            {'status': 'error', 'message': str(e)},
            status=500
        )
