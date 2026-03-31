# Django + FreeLang 통합 (Redis 캐싱 + Gogs Webhook)

FreeLang v4.2 컴파일러를 Django 웹 프레임워크와 통합하는 프로젝트입니다.

## 주요 기능

- **Redis 캐싱**: 컴파일 결과를 Redis에 캐시하여 성능 향상
- **Gogs Webhook**: Gogs 저장소 푸시 이벤트를 감지하여 캐시 무효화
- **REST API**: FreeLang 코드를 컴파일하는 REST API 제공
- **캐시 관리**: 캐시 통계 조회 및 수동 초기화 기능

## 설치 및 실행

### 1. 의존성 설치

```bash
pip install -r requirements.txt
```

### 2. Redis 서버 실행

#### Docker 사용
```bash
docker run -d -p 6379:6379 redis:latest
```

#### Linux
```bash
sudo apt-get install redis-server
redis-server
```

#### macOS
```bash
brew install redis
brew services start redis
```

### 3. Django 설정

```bash
cd freelang_django
python manage.py migrate
python manage.py createsuperuser  # 관리자 계정 생성
```

### 4. 개발 서버 실행

```bash
python manage.py runserver 0.0.0.0:8000
```

## API 엔드포인트

### 1. FreeLang 코드 컴파일

**POST** `/api/compile/`

**요청:**
```json
{
  "code": "var x = 42\nprintln(x)"
}
```

**응답 (성공):**
```json
{
  "status": "success",
  "result": "42",
  "cached": false,
  "compile_time_ms": 50
}
```

**응답 (캐시 히트):**
```json
{
  "status": "success",
  "result": "42",
  "cached": true,
  "compile_time_ms": 0
}
```

### 2. 캐시 통계 조회

**GET** `/api/cache/stats/`

**응답:**
```json
{
  "status": "success",
  "cache_backend": "redis",
  "cached_compilations": 42,
  "cache_entries": [
    "freelang:compile:abc123...",
    "freelang:compile:def456..."
  ]
}
```

### 3. 캐시 초기화

**DELETE** `/api/cache/clear/`

**응답:**
```json
{
  "status": "success",
  "cleared": 42,
  "message": "Cleared 42 cache entries"
}
```

### 4. Gogs Webhook

**POST** `/api/webhook/gogs/`

Gogs 저장소 설정에서 다음과 같이 webhook을 추가하세요:
- **URL**: `http://your-server.com/api/webhook/gogs/`
- **Events**: Push events
- **Content Type**: `application/json`

**응답:**
```json
{
  "status": "received",
  "repository": "freelang-v4",
  "branch": "main",
  "pusher": "kim",
  "commits": 3,
  "commit_details": [
    {
      "id": "abc1234",
      "message": "feat: Phase 2 complete",
      "author": "Kim",
      "timestamp": "2026-03-31T10:00:00Z"
    }
  ],
  "cache_invalidated": true
}
```

## 설정 수정

### Redis 연결 설정

`settings.py`의 `CACHES` 섹션을 수정하세요:

```python
CACHES = {
    'default': {
        'LOCATION': 'redis://[호스트]:[포트]/[DB번호]',
        # 예: 'redis://redis.example.com:6379/1'
    }
}
```

### 데이터베이스 변경

SQLite에서 PostgreSQL로 변경하려면:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'freelang_db',
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

## 프로덕션 배포

### 환경 변수 설정

`.env` 파일을 생성하세요:

```env
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
REDIS_URL=redis://your-redis-host:6379/1
DATABASE_URL=postgresql://user:password@localhost/db
```

### Gunicorn으로 실행

```bash
pip install gunicorn
gunicorn freelang_django.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### Docker로 배포

`Dockerfile` 예제:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

CMD ["gunicorn", "freelang_django.wsgi:application", "--bind", "0.0.0.0:8000"]
```

## 테스트

### 단위 테스트

```bash
python manage.py test
```

### 캐시 수동 테스트

```python
from django.core.cache import cache

# 값 저장
cache.set('test_key', 'test_value', timeout=300)

# 값 조회
value = cache.get('test_key')
print(value)  # 'test_value'

# 값 삭제
cache.delete('test_key')
```

## 문제 해결

### Redis 연결 실패
```
Error: ConnectionError: Error -2 connecting to 127.0.0.1:6379
```

**해결책:**
1. Redis 서버가 실행 중인지 확인: `redis-cli ping`
2. 포트 6379가 열려있는지 확인: `lsof -i :6379`

### Gogs Webhook이 도착하지 않음

1. Webhook 설정 확인: Gogs → Repository Settings → Webhooks
2. 방화벽 설정 확인
3. 로그 확인: Django 콘솔 또는 `logs/freelang.log`

### 캐시 메모리 부족

Redis 메모리 정책을 설정하세요:

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 256mb
```

## 아키텍처 다이어그램

```
┌─────────────────────────────────┐
│  Gogs 저장소 (Push Event)        │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  Webhook Handler                │
│  /api/webhook/gogs/             │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  Django View                    │
│  - 캐시 무효화                  │
│  - 이벤트 로깅                  │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  Redis Cache                    │
│  - 컴파일 결과 저장             │
│  - 세션 정보                    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  클라이언트 (REST API)           │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  FreeLang Compile API           │
│  POST /api/compile/             │
└──────────────┬──────────────────┘
               │
        ┌──────▼───────┐
        │ 캐시 조회    │
        │ (Hit/Miss)   │
        └──────┬───────┘
               │
        ┌──────▼────────────────────┐
        │ FreeLang Compiler         │
        │ (Lexer → Parser → Codegen)│
        └──────┬────────────────────┘
               │
        ┌──────▼─────┐
        │ 결과 캐시  │
        │ (1시간)    │
        └────────────┘
```

## 라이선스

MIT License
