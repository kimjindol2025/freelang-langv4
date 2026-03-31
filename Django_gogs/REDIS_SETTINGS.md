# Django Redis 캐싱 설정 가이드

## settings.py에 추가할 Redis 설정

### 1. INSTALLED_APPS에 추가
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_extensions',
]
```

### 2. CACHES 설정 추가
```python
# Redis 캐시 설정
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {'max_connections': 50},
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'PARSER': 'redis.connection.HiredisParser'
        }
    }
}

# 세션 저장소로 Redis 사용 (선택사항)
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

### 3. 로깅 설정 (선택사항)
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django_redis': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## views.py 사용 예제

### Redis 캐싱 적용
```python
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response

class FreeLangCompileView(APIView):
    """FreeLang 컴파일러 API (Redis 캐싱 적용)"""

    def post(self, request):
        code = request.data.get('code')
        cache_key = f'compile:{hash(code)}'

        # 캐시에서 조회
        result = cache.get(cache_key)
        if result:
            return Response({'result': result, 'cached': True})

        # 컴파일 실행
        result = compile_freelang(code)

        # 결과를 캐시에 저장 (1시간)
        cache.set(cache_key, result, timeout=3600)

        return Response({'result': result, 'cached': False})
```

### Gogs Webhook 처리
```python
from django.views.decorators.http import csrf_exempt
from django.http import JsonResponse
import json

@csrf_exempt
def gogs_webhook(request):
    """Gogs 푸시 이벤트 처리"""
    if request.method == 'POST':
        payload = json.loads(request.body)

        repository = payload['repository']['name']
        pusher = payload['pusher']['name']
        commits = payload['commits']

        # 캐시 무효화
        cache.delete_many(list(cache.keys(f'compile:*')))

        # 이벤트 로깅
        log_webhook_event(repository, pusher, len(commits))

        return JsonResponse({'status': 'received'})

    return JsonResponse({'error': 'POST required'}, status=400)
```

## Redis 서버 실행

### Docker로 실행
```bash
docker run -d -p 6379:6379 redis:latest
```

### Linux
```bash
sudo apt-get install redis-server
redis-server
```

### macOS
```bash
brew install redis
brew services start redis
```

## 테스트

### 캐시 테스트
```python
from django.core.cache import cache

# 저장
cache.set('test_key', 'test_value', timeout=300)

# 조회
value = cache.get('test_key')

# 삭제
cache.delete('test_key')

# 전체 조회
all_keys = cache.keys('*')
```
