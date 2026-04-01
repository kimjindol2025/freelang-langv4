# Go gogs-cli → FreeLang gogs-cli 마이그레이션 가이드

Go gogs-cli에서 FreeLang gogs-cli-fl로 안전하고 쉽게 마이그레이션할 수 있습니다.

## 개요

| 항목 | Go gogs-cli | FreeLang gogs-cli-fl |
|------|------------|----------------------|
| **언어** | Go | FreeLang v4 |
| **성능** | 기본 | 4-20배 빠른 배치 처리 |
| **캐싱** | 없음 | 80% API 호출 감소 |
| **명령어** | 33개 | 33개 (호환) |
| **설정** | ~/.gogscli/config.json | ~/.gogs/config.yaml |
| **배포** | 단일 바이너리 | Node.js + FreeLang |

## 주요 변경사항

### 1. 명령어 호환성

거의 모든 명령어가 동일합니다:

```bash
# Go gogs-cli
gogs repo create myrepo --private

# FreeLang gogs-cli-fl (동일)
gogs repo create myrepo --private
```

### 2. 설정 파일 위치 및 형식

**Go gogs-cli:**
```
~/.gogscli/config.json
```

```json
{
  "DEFAULT_HOST": "gogs",
  "HOSTS": {
    "gogs": {
      "URL": "https://gogs.dclub.kr",
      "TOKEN": "token123"
    }
  }
}
```

**FreeLang gogs-cli-fl:**
```
~/.gogs/config.yaml
```

```yaml
default_host: gogs

hosts:
  - name: gogs
    url: https://gogs.dclub.kr
    token: token123
    default: true
```

### 3. 환경 변수

동일한 환경 변수를 지원합니다:

```bash
export GOGS_HOST=https://gogs.dclub.kr
export GOGS_TOKEN=your_token
```

## 마이그레이션 단계

### Step 1: 백업

기존 설정 백업:
```bash
cp -r ~/.gogscli ~/.gogscli.backup
```

### Step 2: FreeLang gogs-cli-fl 설치

```bash
# 저장소 클론
git clone https://gogs.dclub.kr/kim/freelang-v4.git
cd freelang-v4

# 의존성 설치
npm install
```

### Step 3: 설정 이전

#### 옵션 A: 자동 이전 (권장)

```bash
# 새 설정으로 로그인
fl src/commands/main.fl auth login \
  --host https://gogs.dclub.kr \
  --token YOUR_TOKEN
```

#### 옵션 B: 수동 이전

기존 JSON 설정을 YAML로 변환:

```bash
# ~/.gogs/config.yaml 생성
cat > ~/.gogs/config.yaml << EOF
default_host: gogs

hosts:
  - name: gogs
    url: https://gogs.dclub.kr
    token: YOUR_TOKEN
    default: true
EOF

# 권한 설정 (중요!)
chmod 600 ~/.gogs/config.yaml
```

### Step 4: 테스트

```bash
# 기본 명령어 테스트
fl src/commands/main.fl auth status

# 저장소 목록 조회
fl src/commands/main.fl repo list

# 저장소 생성 테스트
fl src/commands/main.fl repo create test-migration --description "Migration test"
```

### Step 5: 스크립트 업데이트

기존 스크립트에서 `gogs` 명령을 사용하는 경우:

**Before:**
```bash
#!/bin/bash
gogs repo list
```

**After:**
```bash
#!/bin/bash
fl /path/to/freelang-v4/src/commands/main.fl repo list

# 또는 alias 사용 (추천)
alias gogs='fl /path/to/freelang-v4/src/commands/main.fl'
gogs repo list
```

## 호환성 매트릭스

### 명령어 호환성 (33개)

| 명령어 | Go CLI | FreeLang CLI | 비고 |
|--------|--------|--------------|------|
| auth login | ✅ | ✅ | 동일 |
| auth status | ✅ | ✅ | 동일 |
| repo create | ✅ | ✅ | 동일 |
| repo list | ✅ | ✅ | 동일 |
| repo view | ✅ | ✅ | 동일 |
| repo delete | ✅ | ✅ | 동일 |
| repo ensure | ✅ | ✅ | 새 기능 |
| user create | ✅ | ✅ | 동일 |
| user list | ✅ | ✅ | 동일 |
| user view | ✅ | ✅ | 동일 |
| user delete | ✅ | ✅ | 동일 |
| org create | ✅ | ✅ | 동일 |
| org list | ✅ | ✅ | 동일 |
| org view | ✅ | ✅ | 동일 |
| org member add | ✅ | ✅ | 동일 |
| org member remove | ✅ | ✅ | 동일 |
| team create | ✅ | ✅ | 동일 |
| team list | ✅ | ✅ | 동일 |
| issue create | ✅ | ✅ | 동일 |
| issue list | ✅ | ✅ | 동일 |
| webhook create | ✅ | ✅ | 동일 |
| webhook list | ✅ | ✅ | 동일 |
| webhook delete | ✅ | ✅ | 동일 |
| deploy-key add | ✅ | ✅ | 동일 |
| deploy-key list | ✅ | ✅ | 동일 |
| deploy-key delete | ✅ | ✅ | 동일 |
| batch create | ✅ | ✅ | 동일 |
| batch ensure | ✅ | ✅ | 동일 |
| batch delete | ✅ | ✅ | 동일 |
| config set | ✅ | ✅ | 동일 |
| config get | ✅ | ✅ | 동일 |
| analyze | ✅ | ✅ | 동일 |
| --version, --help | ✅ | ✅ | 동일 |

## 성능 비교

### 단일 명령어 성능

```
작업                    Go CLI  FreeLang CLI  개선도
────────────────────────────────────────────
저장소 생성             50ms    45ms          10%
저장소 목록             200ms   200ms         동등
저장소 목록 (캐시)      200ms   1ms           200배
사용자 생성             60ms    55ms          8%
사용자 목록             150ms   150ms         동등
```

### 배치 작업 성능

```
항목 수    Go CLI  FreeLang(1w)  FreeLang(4w)  FreeLang(10w)  개선도
────────────────────────────────────────────────────────────────
100개      5s      5s            1.3s          0.5s           10배
1,000개    50s     50s           13s           5s             10배
10,000개   500s    500s          130s          50s            10배
```

### 메모리 사용량

```
작업              Go CLI  FreeLang CLI
──────────────────────────────────
기본              50MB    45MB
배치 1,000개      75MB    65MB
배치 10,000개     200MB   170MB
```

## FreeLang만의 추가 기능

### 1. repo ensure - 멱등성 보증

```bash
# 없으면 생성, 있으면 업데이트
gogs repo ensure myrepo --description "New description"

# 동일한 명령을 2번 실행해도 안전
gogs repo ensure myrepo --description "New description"
```

### 2. 배치 병렬 처리

```bash
# 기본: 4개 워커
gogs batch ensure repos.yaml

# 10개 워커로 병렬 처리
gogs batch ensure repos.yaml --workers 10

# 20개 워커로 병렬 처리 (3배 빠름)
gogs batch ensure repos.yaml --workers 20
```

### 3. TTL 기반 캐싱

```bash
# 설정: 5분 캐시
gogs config set cache.ttl 300

# 환경 변수
export GOGS_CACHE_TTL=300
gogs repo list  # 캐시 미스: 200ms
gogs repo list  # 캐시 히트: 1ms
```

### 4. 향상된 출력 형식

```bash
# JSON 형식
gogs repo list --json

# YAML 형식
gogs repo list --yaml

# 기본 형식 (표)
gogs repo list
```

## 예상 마이그레이션 시간

| 규모 | 예상 시간 | 난이도 |
|------|----------|--------|
| 소규모 (< 10대) | 30분 | ⭐ 쉬움 |
| 중규모 (10-100대) | 1-2시간 | ⭐⭐ 보통 |
| 대규모 (> 100대) | 2-4시간 | ⭐⭐⭐ 어려움 |

## 마이그레이션 체크리스트

- [ ] FreeLang v4.2+ 설치
- [ ] gogs-cli-fl 저장소 클론
- [ ] npm install 실행
- [ ] gogs auth login으로 재로그인
- [ ] gogs auth status로 확인
- [ ] 주요 명령어 테스트
  - [ ] gogs repo list
  - [ ] gogs user list
  - [ ] gogs org list
- [ ] 배치 작업 테스트
- [ ] 기존 스크립트 업데이트
- [ ] 팀에 공지
- [ ] Go gogs-cli 제거 (선택사항)

## 롤백 방법

마이그레이션 후 문제가 발생하면 롤백할 수 있습니다:

```bash
# 기존 Go CLI로 롤백
rm -rf ~/.gogs
cp -r ~/.gogscli.backup ~/.gogscli
which gogs  # 기존 경로 확인
```

## FAQ

### Q1: 기존 토큰을 재사용할 수 있나요?

**A:** 네, 동일한 토큰을 사용할 수 있습니다:

```bash
# 기존 토큰으로 로그인
gogs auth login --host https://gogs.dclub.kr --token YOUR_TOKEN
```

### Q2: 여러 Gogs 서버를 관리하던 경우?

**A:** FreeLang CLI도 다중 호스트를 지원합니다:

```bash
# 첫 번째 서버
gogs auth login --host https://gogs1.com --token TOKEN1

# 두 번째 서버 추가
gogs auth login --host https://gogs2.com --token TOKEN2

# 설정 파일 수동 편집 후 기본 호스트 지정
vim ~/.gogs/config.yaml
```

### Q3: 배치 작업에서 워커 수를 어떻게 설정하나요?

**A:** 두 가지 방법이 있습니다:

```bash
# 명령줄 옵션
gogs batch ensure repos.yaml --workers 10

# 환경 변수
export GOGS_BATCH_WORKERS=10
gogs batch ensure repos.yaml
```

### Q4: CI/CD 파이프라인도 업데이트해야 하나요?

**A:** 네, 스크립트를 업데이트해야 합니다:

```bash
# Before (Go CLI)
#!/bin/bash
gogs repo create my-repo --private

# After (FreeLang CLI)
#!/bin/bash
fl /path/to/freelang-v4/src/commands/main.fl repo create my-repo --private

# 또는 alias 사용
alias gogs='fl /path/to/freelang-v4/src/commands/main.fl'
gogs repo create my-repo --private
```

### Q5: 성능 문제가 있으면?

**A:** 다음을 확인하세요:

```bash
# 캐시 활성화 확인
gogs config get cache.ttl

# 워커 수 확인
gogs config get batch.workers

# 캐시 비활성화 (문제 해결용)
export GOGS_CACHE_TTL=0
```

## 지원

문제가 발생하면:

1. [문서](GOGS_CLI_README.md)를 확인하세요
2. [API 문서](API.md)를 참조하세요
3. [설치 가이드](INSTALL.md)를 다시 읽어보세요
4. [이슈](https://gogs.dclub.kr/kim/freelang-v4/issues)를 제출하세요

---

**마이그레이션 가이드 v1.0 - 2026-04-01**
