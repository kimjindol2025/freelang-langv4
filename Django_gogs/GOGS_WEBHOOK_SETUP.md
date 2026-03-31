# Gogs Webhook 설정 가이드

FreeLang v4.2 Django 프로젝트에서 Gogs 저장소의 푸시 이벤트를 감지하고 처리하는 방법입니다.

## 1단계: 웹훅 URL 설정

Django 서버가 실행 중인 상태에서 Gogs 저장소의 Settings → Webhooks 메뉴로 이동합니다.

### URL 설정

```
http://your-server.com/api/webhook/gogs/
```

**예시:**
- 로컬 테스트: `http://localhost:8000/api/webhook/gogs/`
- 프로덕션: `https://freelang.example.com/api/webhook/gogs/`

### 2단계: Webhook 이벤트 설정

1. Gogs 저장소 → Settings → Webhooks → Add Webhook
2. **URL**: 위의 주소로 설정
3. **Content Type**: `application/json` 선택
4. **Events**: `Push Events` 체크
5. **Active**: 체크 활성화
6. **Save** 클릭

## 3단계: 테스트 푸시

Gogs 저장소에 커밋을 푸시하면 웹훅이 자동으로 호출됩니다.

```bash
git commit -m "Test webhook trigger"
git push origin main
```

## 4단계: 로그 확인

Django 콘솔에서 다음과 같은 로그가 나타나면 성공입니다:

```
INFO [2026-03-31 10:00:00] Gogs webhook received: {
  "timestamp": "2026-03-31T10:00:00.123456",
  "repository": "freelang-v4",
  "pusher": "kim",
  "branch": "main",
  "commits": 1,
  "message": "kim pushed 1 commit(s) to freelang-v4/main"
}
```

## 웹훅 페이로드 형식

Gogs에서 전송하는 JSON 페이로드 예시:

```json
{
  "secret": "",
  "commits": [
    {
      "id": "abc123def456...",
      "message": "feat: Phase 2 complete",
      "url": "https://gogs.example.com/kim/freelang-v4/commit/abc123...",
      "author": {
        "name": "Kim Jin Dol",
        "email": "kim@example.com"
      },
      "committer": {
        "name": "Kim Jin Dol",
        "email": "kim@example.com"
      },
      "added": ["file1.ts", "file2.ts"],
      "removed": [],
      "modified": ["file3.ts"],
      "timestamp": "2026-03-31T10:00:00+09:00"
    }
  ],
  "ref": "refs/heads/main",
  "before": "oldcommit...",
  "after": "newcommit...",
  "repository": {
    "id": 1,
    "name": "freelang-v4",
    "full_name": "kim/freelang-v4",
    "html_url": "https://gogs.example.com/kim/freelang-v4",
    "description": "Official FreeLang v4 Repository",
    "private": false,
    "owner": {
      "id": 1,
      "username": "kim",
      "name": "Kim Jin Dol",
      "email": "kim@example.com"
    }
  },
  "pusher": {
    "id": 1,
    "username": "kim",
    "name": "Kim Jin Dol",
    "email": "kim@example.com"
  }
}
```

## 캐시 무효화 메커니즘

웹훅이 호출될 때 다음 작업이 수행됩니다:

1. **캐시 무효화**: 모든 FreeLang 컴파일 캐시 제거
2. **이벤트 로깅**: 푸시 이벤트 로그 기록
3. **커밋 분석**: 변경된 파일 및 커밋 메시지 파싱

```python
# views.py에서 수행되는 작업
cache_keys = cache.keys('freelang:compile:*')  # 모든 캐시 키 조회
cache.delete_many(cache_keys)                   # 캐시 일괄 삭제
logger.info(f"Invalidated {len(cache_keys)} cache entries")  # 로깅
```

## 문제 해결

### 웹훅이 호출되지 않음

**1. Gogs에서 확인할 사항**
- Webhooks 메뉴에서 해당 웹훅이 "Active" 상태인지 확인
- URL이 정확한지 확인
- Recent Deliveries 탭에서 에러 메시지 확인

**2. 네트워크 확인**
- Django 서버가 실행 중인지 확인
- 방화벽이 해당 포트를 차단하지 않는지 확인
- `curl` 명령으로 수동 테스트:

```bash
curl -X POST http://localhost:8000/api/webhook/gogs/ \
  -H "Content-Type: application/json" \
  -d '{
    "commits": [],
    "pusher": {"name": "test"},
    "repository": {"name": "test-repo"},
    "ref": "refs/heads/main"
  }'
```

### 웹훅이 호출되지만 캐시가 무효화되지 않음

**로그 확인:**
```bash
tail -f logs/freelang.log
```

**Redis 연결 확인:**
```bash
redis-cli ping
# 응답: PONG
```

**캐시 상태 확인:**
```python
from django.core.cache import cache
print(cache.keys('freelang:compile:*'))
```

### HTTP 500 에러

Django 콘솔 또는 로그에서 에러 메시지를 확인하세요:

```bash
python manage.py runserver --verbosity 3
```

## 고급 설정

### 특정 브랜치만 처리

웹훅이 특정 브랜치에서만 동작하도록 수정:

```python
# views.py
ref = payload.get('ref', '')
if ref == 'refs/heads/main':  # main 브랜치만
    cache.delete_many(cache.keys('freelang:compile:*'))
```

### 커밋별 로그 저장

```python
# models.py
from django.db import models

class WebhookLog(models.Model):
    repository = models.CharField(max_length=100)
    pusher = models.CharField(max_length=100)
    branch = models.CharField(max_length=100)
    commits = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
```

### Slack 알림 연동

```python
import requests

def notify_slack(message):
    webhook_url = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    requests.post(webhook_url, json={'text': message})

# views.py에서 호출
notify_slack(f"✅ {pusher_name} pushed {len(commits)} commit(s) to {repo_name}")
```

## 보안

### CSRF 보호 설정

`views.py`에서 이미 `@csrf_exempt` 데코레이터를 사용하고 있습니다.
프로덕션 환경에서는 더 강력한 보안을 위해 토큰 검증을 추가하세요:

```python
# views.py
@require_http_methods(["POST"])
def gogs_webhook(request):
    # 서명 검증 (Gogs가 지원하는 경우)
    signature = request.headers.get('X-Gogs-Signature')
    if not verify_signature(signature, request.body):
        return JsonResponse({'error': 'Invalid signature'}, status=403)
```

### IP 화이트리스트 설정

Gogs 서버의 IP만 웹훅을 수신하도록 제한:

```python
from django.http import JsonResponse

GOGS_IP_WHITELIST = [
    '192.168.1.100',  # Gogs 서버 IP
]

def check_gogs_ip(request):
    client_ip = request.META.get('REMOTE_ADDR')
    return client_ip in GOGS_IP_WHITELIST

def gogs_webhook(request):
    if not check_gogs_ip(request):
        return JsonResponse({'error': 'IP not allowed'}, status=403)
```

## 모니터링

### 웹훅 통계

```bash
# 최근 웹훅 호출 확인
tail -20 logs/freelang.log | grep "Gogs webhook"

# 캐시 무효화 횟수 확인
grep "Invalidated" logs/freelang.log | wc -l

# 저장소별 푸시 횟수
grep "repository" logs/freelang.log | cut -d'"' -f4 | sort | uniq -c
```

## 참고자료

- [Gogs Webhook 공식 문서](https://gogs.io/docs/features/webhook)
- [Django Webhook 처리](https://docs.djangoproject.com/en/4.2/topics/signals/)
- [Redis 캐싱](https://django-redis.readthedocs.io/)
