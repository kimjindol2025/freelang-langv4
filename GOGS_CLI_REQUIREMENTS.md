# FreeLang v4로 gogs-cli 구현 - 필수 기능 분석

**프로젝트**: gogs-cli-fl (FreeLang 기반)
**상태**: 요구사항 분석 중
**작성일**: 2026-04-01

---

## 📋 필수 기능 체크리스트

### ✅ 이미 있는 것

```
HTTP/네트워크
├─ fetch() - 비동기 HTTP 요청
├─ http_get() - GET 요청
├─ http_post() - POST 요청
├─ http_post_json() - JSON POST
└─ async/await - 비동기 지원 ✅ 완성

JSON 처리
├─ json_parse() - JSON 파싱
├─ json_stringify() - JSON 직렬화
├─ json_validate() - JSON 검증
└─ json_pretty() - JSON 포맷팅

파일 I/O
├─ read_file() - 파일 읽기
├─ write_file() - 파일 쓰기
├─ exists() - 파일 존재 확인
└─ delete_file() - 파일 삭제

데이터베이스
├─ sqlite_open() - DB 연결
├─ sqlite_query() - SELECT
├─ sqlite_execute() - INSERT/UPDATE/DELETE
└─ sqlite_close() - 연결 해제

타입/구조체
├─ struct - 사용자 정의 타입
├─ impl - 메서드 구현
├─ enum - 열거형
├─ generic <T> - 제네릭 (부분 지원)
└─ trait - 인터페이스

동시성
├─ async fn - 비동기 함수
├─ await - 비동기 대기
├─ channel - 채널 기반 통신
└─ goroutine 같은 동시성

문자열
├─ startsWith() - 접두사 확인
├─ endsWith() - 접미사 확인
├─ substring() - 부분 문자열
├─ trim() - 공백 제거
├─ split() - 분할 (추측)
└─ join() - 연결

기타
├─ println() - 출력
├─ print() - 출력 (개행 없음)
├─ str() - 문자열 변환
├─ length() - 길이
├─ now() - 현재 시간
└─ sleep() - 지연
```

---

## ❌ 부족한 것 (우선순위순)

### **Tier 1: 즉시 필요** (Critical)

#### 1. **YAML 파서** ⭐⭐⭐⭐⭐
```freelang
// gogs-cli는 YAML 설정 파일 필요
// 예: repos.yaml, desired.yaml

fn parse_yaml(content: string) -> {string: any}  // ❌ 없음

// 필요한 형식:
// repos:
//   - owner: "team-a"
//     name: "backend"
//     private: true
```

**영향**: 배치 작업의 핵심 (매우 중요)
**대체안**:
- [ ] JSON으로 변경 (gogs 명령에선 JSON 사용)
- [x] 간단한 YAML 파서 구현
- [ ] Node.js 라이브러리 호출

**우선순위**: **1순위** - 먼저 구현

#### 2. **split() 함수** ⭐⭐⭐⭐
```freelang
fn split(s: string, sep: string) -> [string]  // ❌ 없음

// 필요: CLI 파싱, 경로 분석
gogs repo create myrepo --private
         ^^^^^^ ^^^^^^ ^^^^^^^^^
         파싱하려면 split 필요
```

**현황**: 표준 라이브러리에 없음
**대체안**: string_utils에 추가

**우선순위**: **2순위**

#### 3. **Map/Dictionary 자료구조** ⭐⭐⭐⭐
```freelang
struct Map<K, V> {
    // 현재: HashMap 부분 구현만 있음
}

// 필요: API 응답 캐싱, 설정 저장소
var cache = Map::new()
cache.set("repos:list", repos_data)
var repos = cache.get("repos:list")
```

**현황**: collections.fl에 HashMap 있음 (제한적)
**개선**: 완전한 구현 필요

**우선순위**: **3순위**

#### 4. **Command Line 파싱** ⭐⭐⭐⭐
```freelang
// gogs repo create myrepo --private --description "test"
// 파싱 로직 필요

struct CliArgs {
    command: string
    subcommand: string
    args: [string]
    flags: {string: string}
}

fn parse_cli_args() -> CliArgs  // ❌ 없음
```

**현황**: 없음
**필요성**: CLI 구현의 기본

**우선순위**: **4순위**

---

### **Tier 2: 중요** (High Priority)

#### 5. **설정 파일 관리** ⭐⭐⭐
```freelang
// ~/.gogs/config.yaml 읽고 쓰기

struct Config {
    hosts: {string: HostConfig}
}

struct HostConfig {
    url: string
    token: string
}

fn load_config() -> Config  // ❌ 없음
fn save_config(cfg: Config) -> void  // ❌ 없음
```

**우선순위**: **5순위**

#### 6. **HTTP 헤더 처리** ⭐⭐⭐
```freelang
// 현재: headers: Value 타입 (불명확)
// 필요: 명확한 Map<string, string> 인터페이스

struct HttpHeaders {
    data: {string: string}
}

fn new_headers() -> HttpHeaders
fn add_header(self, key: string, value: string)
```

**우선순위**: **6순위**

#### 7. **Error 타입 & Result** ⭐⭐⭐
```freelang
enum Result<T> {
    Ok(T)
    Err(string)
}

enum Error {
    NotFound(string)
    InvalidInput(string)
    NetworkError(string)
}

// match 문법으로 처리 필요
```

**현황**: 부분 지원
**필요성**: 에러 처리 표준화

**우선순위**: **7순위**

---

### **Tier 3: 향후** (Nice to Have)

#### 8. **정규표현식** ⭐⭐
```freelang
fn regex_match(s: string, pattern: string) -> bool
fn regex_replace(s: string, pattern: string, replacement: string) -> string
```

**현황**: 없음
**필요성**: API 응답 유효성 검증

#### 9. **시간/날짜 처리** ⭐⭐
```freelang
fn format_time(ts: i64, format: string) -> string
fn parse_time(s: string, format: string) -> i64
```

**현황**: datetime.fl 부분 구현
**필요성**: 로그/캐시 TTL

#### 10. **암호화 (해싱)** ⭐
```freelang
fn sha256(s: string) -> string
fn md5(s: string) -> string
```

**필요성**: 토큰 저장소

---

## 🎯 구현 순서 (우선순위)

### **Phase 1: 기본 인프라 (1주)**

| # | 기능 | 파일 | 상태 |
|---|------|------|------|
| 1 | split() 함수 | string_utils.fl | ⬜ |
| 2 | 간단한 YAML 파서 | yaml.fl (신규) | ⬜ |
| 3 | CliArgs 파싱 | cli_utils.fl (신규) | ⬜ |
| 4 | HttpHeaders 래퍼 | http_utils.fl (신규) | ⬜ |

### **Phase 2: 도메인 모델 (1주)**

| # | 기능 | 파일 | 상태 |
|---|------|------|------|
| 5 | Config 관리 | config.fl (신규) | ⬜ |
| 6 | API 응답 모델 | models.fl (신규) | ⬜ |
| 7 | Result<T> 에러 처리 | errors.fl (신규) | ⬜ |
| 8 | Map<K,V> 완전 구현 | collections.fl 확장 | ⬜ |

### **Phase 3: 핵심 로직 (2주)**

| # | 기능 | 파일 | 상태 |
|---|------|------|------|
| 9 | HTTP 클라이언트 | client.fl | ⬜ |
| 10 | ensure 알고리즘 | ensure.fl | ⬜ |
| 11 | 배치 엔진 | batch.fl | ⬜ |
| 12 | 캐싱 시스템 | cache.fl | ⬜ |

### **Phase 4: API 서비스 (2주)**

| # | 기능 | 파일 | 상태 |
|---|------|------|------|
| 13 | RepoService | services/repo.fl | ⬜ |
| 14 | UserService | services/user.fl | ⬜ |
| 15 | OrgService | services/org.fl | ⬜ |
| 16 | 나머지 서비스 | services/*.fl | ⬜ |

### **Phase 5: CLI & 통합 (1주)**

| # | 기능 | 파일 | 상태 |
|---|------|------|------|
| 17 | 명령어 디스패치 | commands/ | ⬜ |
| 18 | 전체 통합 테스트 | test/ | ⬜ |

---

## 📊 상세 요구사항

### 1️⃣ split() 함수

```freelang
// 필요: CLI 파싱, 배열 처리

// 현재 gogs-cli에서:
// "gogs repo create myrepo --private"
// → ["gogs", "repo", "create", "myrepo", "--private"]

fn split(s: string, sep: string) -> [string] {
    var result = []
    var current = ""
    var i: i32 = 0
    var sep_len = length(sep)

    while i < length(s) {
        // sep 패턴 찾기
        if i + sep_len <= length(s) {
            var sub = substring(s, i, i + sep_len)
            if sub == sep {
                result.push(current)
                current = ""
                i = i + sep_len
                continue
            }
        }
        current = current + char_at(s, i)
        i = i + 1
    }

    if length(current) > 0 {
        result.push(current)
    }

    result
}

// 테스트
var arr = split("a,b,c", ",")  // ["a", "b", "c"]
var args = split("repo create myrepo", " ")  // ["repo", "create", "myrepo"]
```

### 2️⃣ YAML 파서 (간단 버전)

```freelang
// 최소한의 YAML 지원: 리스트, 맵

struct YamlValue {
    kind: string  // "string", "number", "bool", "list", "map"
    str_val: string
    num_val: f64
    bool_val: bool
    list_val: [YamlValue]
    map_val: {string: YamlValue}
}

fn parse_yaml(content: string) -> YamlValue {
    // 간단한 파서 구현
    // - 들여쓰기 기반 (탭/스페이스)
    // - 기본 타입만 지원
}

// 예시:
// repos:
//   - owner: "team-a"
//     name: "backend"
//
// 파싱 결과:
// {
//   "repos": [
//     {"owner": "team-a", "name": "backend"}
//   ]
// }
```

### 3️⃣ CLI 파싱

```freelang
struct CliArgs {
    command: string         // "repo"
    subcommand: string      // "create"
    positional: [string]    // ["myrepo"]
    flags: {string: string} // {"--private": "true"}
}

fn parse_args(args: [string]) -> CliArgs {
    // gogs repo create myrepo --private --description "test"
    //
    // Result:
    // {
    //   command: "repo",
    //   subcommand: "create",
    //   positional: ["myrepo"],
    //   flags: {
    //     "private": "true",
    //     "description": "test"
    //   }
    // }
}
```

---

## 🛠️ 구현 전략

### **Strategy A: 점진적 구현** (추천 ⭐)
```
Week 1: Phase 1 (기본 도구)
Week 2: Phase 2 (모델)
Week 3-4: Phase 3 (핵심 로직)
Week 5-6: Phase 4 (API 서비스)
Week 7: Phase 5 (CLI)

장점:
- 조기 검증 가능
- 작은 변화씩 테스트
- 부족한 것 발견 쉬움

단점:
- 시간이 더 걸릴 수 있음
```

### **Strategy B: 병렬 구현**
```
stdlib 확장 <---> gogs-cli 모델 <---> 핵심 로직

장점:
- 빠른 완성
- 모든 것을 동시에 검증

단점:
- 복잡한 의존성 관리
```

### 추천: **Strategy A + 부분 B**
```
Phase 1 완료 후, 동시에:
- stdlib 확장 계속
- gogs-cli 기본 구조 시작
```

---

## 📈 예상 작업량

```
기능                  라인수    시간
─────────────────────────────────
split()              50        1h
YAML 파서            300       4h
CLI 파싱             200       3h
HttpHeaders          100       1h
Config 관리          150       2h
Models              200       3h
Error/Result        100       1h
HTTP 클라이언트     300       4h
ensure 알고리즘     250       4h
배치 엔진            400       6h
캐싱                 200       3h
API 서비스          1500      20h
CLI 명령어          1000      15h
테스트              1000      15h
─────────────────────────────────
총합               ~6000      ~82h (~8-10주)
```

---

## ✅ 결론

**gogs-cli-fl 구현 가능성**: **매우 높음** ✅

**필요한 작업**:
1. ✅ 기존 자원 활용 (HTTP, JSON, async 등)
2. ⬜ stdlib 확장 (split, YAML, CLI, Map)
3. ⬜ 도메인 모델 구현 (Config, Models, Errors)
4. ⬜ 핵심 로직 (ensure, batch, cache)
5. ⬜ API 서비스 구현
6. ⬜ CLI 통합

**예상 일정**: 8-10주 (주 20-30시간 투자 시)

**즉시 시작 가능**: **네 ✅**

---

**다음 단계**:
1. Phase 1 시작 (split, YAML, CLI 파서)
2. 동시에 프로토타입 HTTP 클라이언트 구현
3. 조기 테스트 & 피드백
