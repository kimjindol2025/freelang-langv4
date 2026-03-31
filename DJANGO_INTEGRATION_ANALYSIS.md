# Django + FreeLang 통합 방안 조사 보고서

**작성일**: 2026-03-31
**목적**: Django 프레임워크와 FreeLang 컴파일러 시스템 통합 전략 수립

---

## 📊 1단계: 현재 보유 자원 파악

### 로컬 저장소 현황

```
✅ freelang-korean (K-FreeLang v1.0)
   └─ 상태: 완성 (2026-03-31)
   ├─ 기술: 순수 HTML/CSS/JS
   ├─ 배포: GitHub Pages
   ├─ 특징: 웹 튜토리얼, 정적 페이지
   └─ 저장소: kimjindol2025/freelang-korean

✅ freelang-v4 (공식 언어)
   └─ 상태: 가동 중
   ├─ 기술: TypeScript + Node.js
   ├─ 성능: 334/334 테스트 통과 (100%)
   ├─ 기능: 컴파일러, VM, CLI 도구
   ├─ 저장소: gogs.dclub.kr/kim/freelang-v4
   └─ 버전: v4.0.0
```

### 미확인 자원 (조사 필요)

```
❓ FreeLang v2
❓ FreeLang v3
❓ FreeLang v5
❓ FreeLang v6
❓ FreeLang v7
❓ FreeLang v8

위치: https://gogs.dclub.kr/kim/
접근 방식: GOGS_TOKEN 사용
```

---

## 🔍 2단계: Django 기술 분석

### Django의 핵심 특징

| 항목 | 설명 |
|------|------|
| **웹 프레임워크** | Python 기반, MTV(Model-Template-View) 아키텍처 |
| **ORM** | 데이터베이스 추상화, 마이그레이션 자동화 |
| **관리자 UI** | 자동 생성되는 관리 인터페이스 |
| **URL 라우팅** | RESTful API, 경로 패턴 매칭 |
| **템플릿 엔진** | 동적 HTML 생성, 상속 지원 |
| **인증/권한** | 내장 사용자 관리, 권한 시스템 |
| **미들웨어** | 요청/응답 처리 파이프라인 |
| **폼 처리** | 입력 검증, CSRF 보호 |

### 현재 K-FreeLang 시스템 vs Django

| 항목 | 현재 (정적 HTML) | Django 도입 후 |
|------|-----------------|----------------|
| **페이지 제공** | GitHub Pages (정적) | Django 개발 서버 (동적) |
| **데이터 관리** | 없음 | PostgreSQL/MySQL/SQLite |
| **API** | 없음 | REST API (JSON) |
| **사용자 관리** | 없음 | 인증/권한 자동화 |
| **성능** | 낮음 (정적) | 높음 (캐싱 가능) |
| **확장성** | 제한적 | 높음 |
| **배포** | GitHub Pages | Docker, Heroku, AWS |

---

## 💡 3단계: Django + FreeLang 통합 아키텍처 (3가지 옵션)

### 옵션 A: 하이브리드 모델 (점진적 전환) ⭐ 추천

```
┌─────────────────────────────────────┐
│  Frontend (현재 HTML/CSS/JS)        │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Django REST API Server             │
│  • URLconf (라우팅)                 │
│  • Views (비즈니스 로직)            │
│  • Serializers (JSON 변환)          │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  FreeLang v4 컴파일러               │
│  • Lexer → Parser → Codegen         │
│  • VM 실행                          │
│  • 결과 반환                        │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  데이터 저장소                      │
│  • 사용자 정보                      │
│  • 컴파일 결과                      │
│  • 코드 스니펫                      │
└─────────────────────────────────────┘
```

**장점:**
- 기존 HTML/CSS 재활용 가능
- 점진적 마이그레이션
- 리스크 최소화
- 빠른 개발 속도

**단점:**
- API 레이어 추가 복잡도
- 두 시스템 관리 필요

**예상 개발 기간:** 2-3주

---

### 옵션 B: 완전 Django 마이그레이션

```
┌──────────────────────────────────────┐
│  Django 애플리케이션                 │
├──────────────────────────────────────┤
│  Views                               │
│  ├─ Homepage                         │
│  ├─ Learning Pages                   │
│  ├─ IDE Interface                    │
│  └─ API Endpoints                    │
├──────────────────────────────────────┤
│  Models                              │
│  ├─ User                             │
│  ├─ Code Snippet                     │
│  ├─ CompileResult                    │
│  └─ Execution Log                    │
├──────────────────────────────────────┤
│  Templates                           │
│  └─ HTML 기존 디자인 유지            │
├──────────────────────────────────────┤
│  Integrated Services                 │
│  └─ FreeLang v4 컴파일러             │
└──────────────────────────────────────┘
```

**장점:**
- 단일 프레임워크
- 관리 용이
- 성능 최적화 가능

**단점:**
- 모든 페이지 재작성 필요
- 높은 개발 비용
- 리스크 증가

**예상 개발 기간:** 4-6주

---

### 옵션 C: 마이크로서비스 아키텍처

```
┌──────────────────────┐
│  Django Frontend     │
│  • 인증              │
│  • UI 제공           │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  API Gateway         │
│  • 요청 라우팅       │
│  • 캐싱              │
└──────┬───────────────┘
       │
    ┌──┴──────────────────┐
    │                     │
    ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ FreeLang v4      │  │ 다른 서비스      │
│ 컴파일러 서비스  │  │ (미래 확장용)    │
│                  │  │                  │
│ gRPC/REST        │  │ REST API         │
└──────┬───────────┘  └──────┬───────────┘
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  데이터 저장소   │
         │  (중앙집중식)    │
         └──────────────────┘
```

**장점:**
- 높은 확장성
- 독립적 배포
- 성능 분산

**단점:**
- 복잡도 높음
- 운영 비용 증가
- 분산 트랜잭션 처리 필요

**예상 개발 기간:** 6-8주

---

## 🛠 4단계: 구현 로드맵 (옵션 A 기준)

### Phase 1: 준비 (1주)
- [ ] Django 프로젝트 초기화
  ```bash
  django-admin startproject kfreelang_web
  django-admin startapp compiler
  django-admin startapp learn
  django-admin startapp api
  ```
- [ ] 데이터베이스 스키마 설계
- [ ] API 엔드포인트 정의 (OpenAPI)
- [ ] 현재 HTML 구조 분석

### Phase 2: API 구현 (1주)
- [ ] Django Views 작성
  ```python
  # api/views.py
  - GET /api/compile/ (코드 컴파일)
  - GET /api/tutorials/ (튜토리얼 목록)
  - POST /api/snippets/ (코드 저장)
  - GET /api/user/ (사용자 정보)
  ```
- [ ] Serializers 작성
- [ ] 인증 시스템 (JWT 또는 Session)
- [ ] FreeLang v4 통합

### Phase 3: Frontend 연결 (1주)
- [ ] JavaScript → Django API 호출로 변환
- [ ] AJAX/Fetch API 구현
- [ ] 에러 처리
- [ ] 로딩 상태 관리

### Phase 4: 테스트 및 배포 (1주)
- [ ] 단위 테스트 작성
- [ ] 통합 테스트
- [ ] 성능 최적화
- [ ] Docker 이미지 생성
- [ ] 배포 (선택: Heroku, AWS, 자체 서버)

---

## 📋 5단계: 구체적 구현 예시

### 1. Django 프로젝트 구조

```
kfreelang_web/
├── manage.py
├── requirements.txt
├── docker-compose.yml
├── Dockerfile
├── kfreelang_web/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── compiler/
│   ├── models.py (CompileJob, CodeSnippet)
│   ├── views.py (compile_code API)
│   ├── serializers.py
│   ├── urls.py
│   └── services.py (FreeLang v4 통합)
├── learn/
│   ├── models.py (Lesson, Tutorial)
│   ├── views.py (tutorial_detail, lesson_list)
│   └── serializers.py
├── api/
│   ├── views.py (전체 API 엔드포인트)
│   ├── permissions.py
│   └── pagination.py
└── static/
    └── (현재 HTML/CSS/JS)
```

### 2. 핵심 API 엔드포인트

```python
# 컴파일 API
POST /api/v1/compile/
{
  "code": "변수 이름 = \"K-FreeLang\"\n출력(이름)",
  "version": "v4",
  "language": "freelang"
}

# 응답
{
  "success": true,
  "output": "K-FreeLang",
  "execution_time": 125,  # ms
  "error": null
}

# 튜토리얼 API
GET /api/v1/tutorials/
GET /api/v1/tutorials/1/
GET /api/v1/lessons/?tutorial=1

# 코드 저장 API
POST /api/v1/snippets/
{
  "code": "...",
  "title": "Hello World",
  "description": "첫 번째 프로그램",
  "language": "freelang"
}
```

### 3. FreeLang v4 통합 서비스

```python
# compiler/services.py
from freelang_v4 import Compiler, VM

class FreeLangCompilerService:
    def __init__(self):
        self.compiler = Compiler()
        self.vm = VM()

    def compile_and_execute(self, code: str) -> dict:
        try:
            # 컴파일
            bytecode = self.compiler.compile(code)

            # 실행
            result = self.vm.execute(bytecode)

            return {
                "success": True,
                "output": result.output,
                "execution_time": result.time_ms,
                "error": None
            }
        except Exception as e:
            return {
                "success": False,
                "output": None,
                "execution_time": 0,
                "error": str(e)
            }

# views.py에서 사용
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['POST'])
def compile_code(request):
    code = request.data.get('code')
    service = FreeLangCompilerService()
    result = service.compile_and_execute(code)
    return Response(result)
```

---

## 🔗 6단계: FreeLang v2-v8 통합 방안

### 현재 상황
- ✅ v4 완성 (334/334 테스트)
- ❓ v2, v3, v5-v8 상태 미확인

### 통합 전략

#### 방안 1: v4 중심 (권장)
- v4를 기본 컴파일러로 사용
- v2, v3는 레거시 지원 (선택적)
- v5-v8은 향후 점진적 업그레이드

#### 방안 2: 다중 버전 지원
```python
# v2 호환성 레이어
class FreeLangV2Adapter:
    def convert_to_v4(self, code: str) -> str:
        # v2 문법 → v4 문법 변환
        pass

# API에서 선택 가능
POST /api/v1/compile/
{
  "code": "...",
  "version": "2" | "3" | "4" | "5" | ...
}
```

---

## 📈 7단계: 성능 고려사항

### 병목 지점

| 지점 | 예상 시간 | 해결책 |
|------|---------|--------|
| **코드 컴파일** | 50-200ms | 스레드풀, 캐싱 |
| **바이트코드 실행** | 10-50ms | VM 최적화 |
| **결과 직렬화** | 1-5ms | JSON 압축 |
| **DB 조회** | 5-20ms | 인덱싱, 캐시 |

### 최적화 전략

```python
# 1. 컴파일 결과 캐싱
from django.views.decorators.cache import cache_page

@cache_page(60 * 5)  # 5분 캐시
@api_view(['POST'])
def compile_code(request):
    code_hash = hashlib.md5(request.data['code'].encode()).hexdigest()
    # 캐시에서 찾기
    # ...

# 2. 비동기 작업 (Celery)
from celery import shared_task

@shared_task
def compile_code_async(code: str):
    service = FreeLangCompilerService()
    return service.compile_and_execute(code)

# 3. 연결 풀링
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # 연결 재사용
    }
}
```

---

## 🚀 8단계: 배포 전략

### Docker + Docker Compose

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app

# FreeLang v4 설치
RUN npm install -g freelang-v4

# Python 의존성
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "kfreelang_web.wsgi:application", "--bind", "0.0.0.0:8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    ports:
      - "8000:8000"
    environment:
      - DEBUG=True
      - SECRET_KEY=...
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=kfreelang
      - POSTGRES_PASSWORD=...
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 📋 다음 조사 항목

### 우선 조사 필요
- [ ] Gogs에서 v2-v8 저장소 확인
  ```bash
  export $(cat ~/.env | xargs)
  git clone https://x-access-token:${GOGS_TOKEN}@gogs.dclub.kr/kim/freelang-v2.git
  git clone https://x-access-token:${GOGS_TOKEN}@gogs.dclub.kr/kim/freelang-v3.git
  # ... v5-v8
  ```

- [ ] 각 버전별 기능 차이 분석
- [ ] 버전 호환성 매트릭스 작성
- [ ] 성능 벤치마크 (v2~v8)

### Django 설정
- [ ] Python 버전 결정 (3.10 이상)
- [ ] 데이터베이스 선택 (PostgreSQL 권장)
- [ ] 캐싱 시스템 (Redis 권장)
- [ ] 로깅/모니터링 (Sentry 등)

### 배포
- [ ] 호스팅 선택 (AWS, Heroku, 자체 서버)
- [ ] CI/CD 파이프라인 구성
- [ ] 도메인 및 SSL 설정
- [ ] 백업 및 복구 계획

---

## 🎯 최종 권장사항

### 1단계: 현재 상태 확인
- [x] K-FreeLang v1.0 완성 ✅
- [ ] FreeLang v2-v8 저장소 조사
- [ ] 기술 선택 결정

### 2단계: 프로토타입 구현 (옵션 A)
- Django 기본 프로젝트 생성
- v4 컴파일러 통합
- 간단한 API 구현

### 3단계: 확장 및 최적화
- 전체 기능 마이그레이션
- 성능 최적화
- 배포 자동화

### 예상 총 일정: 4-6주

---

**다음 회의**: Django + FreeLang v2-v8 구체적 통합 전략 수립
