# 🎯 완성형 언어 우선순위 검토 & 상세 로드맵

**작성일**: 2026-03-30
**목표**: 프로덕션급 언어 완성 (v2.0)
**기간**: 8주 (56일)
**방식**: 점증적 개발 + 주간 마일스톤

---

## 🔍 우선순위 재평가

### 의존성 분석

```
┌─────────────────────────────────────────┐
│     핵심 언어 기능 (v1.0 ✅)             │
│  변수, 함수, 제어흐름, 배열, 구조체     │
└────────────────┬────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ↓                     ↓
  [async/await]        [StdLib 핵심]
  (필수 - 이것 없이    (필수 - 실제
   I/O 불가능)        개발 불가능)
      │                     │
      └──────────┬──────────┘
                 │
         ↓ (2주 후)
      [모듈 시스템]
      (필수 - 대형
       프로젝트 필수)
                 │
         ↓ (1주 후)
    [StdLib 확장]
    (DB, 암호화 등)
                 │
         ↓ (1주 후)
  [고급 기능들]
  (제네릭, 패턴 매칭,
   채널, Actor)
```

### 우선순위 결정 기준

| 기준 | async/await | 모듈 시스템 | StdLib |
|------|-------------|-----------|--------|
| **언어 완성도** | 🔴 필수 | 🔴 필수 | 🔴 필수 |
| **실제 개발 가능** | 🔴 필수 | 🟢 선택 | 🔴 필수 |
| **구현 복잡도** | 🟡 중간 | 🟡 중간 | 🟢 낮음 |
| **다른 기능 의존** | ❌ 없음 | ❌ 없음 | 🟡 async |
| **테스트 독립성** | ✅ 높음 | ✅ 높음 | ✅ 높음 |
| **즉시 영향도** | 🔴 높음 | 🟢 낮음 | 🔴 높음 |

### ✅ 최종 우선순위

```
🥇 1순위: async/await (비동기 프로그래밍)
   - 모든 I/O 작업의 기초
   - 언어의 가장 큰 약점
   - 추정: 10-12일

🥈 2순위: 표준 라이브러리 (I/O, Network, JSON)
   - 실제 프로젝트 개발 가능
   - async와 함께 필수
   - 추정: 8-10일

🥉 3순위: 모듈 시스템 (import/export)
   - 대형 프로젝트 구조화
   - StdLib와 함께 필요
   - 추정: 5-7일

4순위: 제네릭 & 패턴 매칭
   - 품질 개선
   - 추정: 6-8일

5순위: 채널 & Actor
   - 고급 동시성
   - 추정: 5-7일

6순위: 고급 StdLib (DB, 암호화)
   - 선택사항
   - 추정: 10-14일
```

---

## 📅 상세 로드맵 (8주)

### **WEEK 1: async/await 기초 (Phase 1/3)**

**목표**: async/await 문법 구현 & 컴파일러 지원

#### Day 1: 설계 & 스펙 작성
```
작업:
1. async/await 문법 정의
   - async fn 선언
   - await 표현식
   - Promise<T> 타입

2. 컴파일 전략 설계
   - async fn → 상태 머신 변환
   - await → 콜백 체인
   - Promise 구현 방식

3. 테스트 계획
   - 기본 async/await
   - 에러 처리
   - Promise 체이닝

산출물:
├─ SPEC_14_ASYNC_AWAIT.md (설계 문서)
└─ tests/async-design.md (테스트 계획)
```

#### Day 2-3: 컴파일러 확장 (Parser & Type Checker)
```
작업:
1. Parser 확장
   - async fn 파싱
   - await 표현식 파싱
   - Promise<T> 타입 파싱

2. Type Checker 확장
   - async fn 타입 검사
   - await 가능 여부 검사
   - Promise 타입 검사

코드 위치:
├─ src/parser.ts (async 키워드 추가)
├─ src/type-checker.ts (Promise 타입 처리)
└─ src/types.ts (Promise<T> 정의)

테스트:
├─ parser-jest.test.ts (+5 테스트)
└─ checker-jest.test.ts (+5 테스트)
```

#### Day 4-5: ISA Generator 확장
```
작업:
1. async fn 컴파일
   - Promise 객체 생성 코드 생성
   - 상태 머신 상태값 저장
   - 콜백 등록

2. await 컴파일
   - Promise 결과 확인
   - 미완료 시 콜백 체이닝
   - 완료 시 다음 문장 실행

코드 위치:
├─ src/compiler.ts (async/await → ISA 변환)
└─ tests/compiler-jest.test.ts (+8 테스트)

예시:
async fn getData() -> string {
  await delay(100)
  return "data"
}

↓ 컴파일

fn __promise_getData() {
  // 상태 0: 초기화
  // 상태 1: await 완료 후
  // ...
}
```

#### Day 6-7: VM 확장 & 테스트
```
작업:
1. VM에 비동기 큐 추가
   - async_queue 구조체 확장
   - Promise 레지스트리
   - 이벤트 루프 구현

2. 새로운 명령어 추가
   - PROMISE_NEW (Promise 생성)
   - PROMISE_RESOLVE (완료)
   - PROMISE_AWAIT (대기)
   - PROMISE_THEN (콜백 등록)

3. 통합 테스트
   - 기본 async/await
   - Promise 체이닝
   - 에러 처리 (catch)
   - 타임아웃

코드 위치:
├─ c-vm/main_extended.c (Promise 구현)
└─ src/vm-jest.test.ts (+15 테스트)

예제:
async fn main() {
  let result = await fetch("http://api.example.com")
  println(result)
}
```

**주간 산출물**:
- ✅ SPEC_14_ASYNC_AWAIT.md
- ✅ Parser 확장 (async/await 파싱)
- ✅ Type Checker 확장 (Promise 타입)
- ✅ ISA Generator 확장 (상태 머신)
- ✅ VM 비동기 큐 구현
- ✅ 25개 신규 테스트 (+0.5% 커버리지)

**주간 마일스톤**: ✅ async/await 기초 완성
**테스트 통과율**: 238/238 (100%)
**커버리지**: 39% → 39.5%

---

### **WEEK 2: async/await 런타임 (Phase 2/3)**

**목표**: Promise, 에러 처리, 타임아웃 완성

#### Day 1-2: Promise 구현 완성
```
작업:
1. Promise<T> 완전 구현
   - resolve(value: T)
   - reject(error: Error)
   - then<U>(fn: fn(T) -> U) -> Promise<U>
   - catch(fn: fn(Error) -> T) -> Promise<T>
   - finally(fn: fn() -> void) -> Promise<void>

2. Promise.all, Promise.race
   - 여러 Promise 동시 처리
   - 첫 번째/모두 완료 조건

테스트:
├─ 기본 resolve/reject
├─ Promise 체이닝
├─ 에러 전파
└─ Promise.all, Promise.race
```

#### Day 3-4: 에러 처리 개선
```
작업:
1. try-catch-finally 확장
   - async 함수 내 try-catch
   - await 중 에러 처리
   - 에러 전파

2. Error 타입 확장
   - AsyncError
   - TimeoutError
   - NetworkError (나중)

테스트:
├─ 기본 try-catch
├─ await 중 에러
├─ 에러 전파
└─ finally 보장
```

#### Day 5-6: 타임아웃 & 고급 기능
```
작업:
1. setTimeout, delay
   - 밀리초 단위 대기
   - 정확도 (±10ms)

2. Promise.race (타임아웃)
   - race(promise, timeout) 패턴
   - 타임아웃 에러

3. 취소 (cancellation)
   - CancellationToken
   - abort() 메소드

테스트:
├─ delay(100)
├─ setTimeout
├─ 타임아웃 처리
└─ 취소 처리
```

#### Day 7: 통합 테스트 & 최적화
```
작업:
1. 통합 시나리오
   - 다중 async 함수 동시 실행
   - 데드락 방지
   - 리소스 누수 확인

2. 성능 최적화
   - Promise 객체 재사용
   - 메모리 누수 확인
   - 이벤트 루프 효율성

테스트:
├─ 100개 동시 async 함수
├─ 메모리 사용량 확인
└─ 성능 벤치마크
```

**주간 산출물**:
- ✅ Promise 완전 구현
- ✅ Promise.all, Promise.race
- ✅ 에러 처리 개선
- ✅ setTimeout, delay
- ✅ 취소(cancellation) 기능
- ✅ 35개 신규 테스트 (+1% 커버리지)

**주간 마일스톤**: ✅ async/await 완성
**테스트 통과율**: 273/273 (100%)
**커버리지**: 39.5% → 40.5%

---

### **WEEK 3: 표준 라이브러리 Phase 1 (I/O & 유틸)**

**목표**: 파일 I/O, 문자열, 배열 확장

#### Day 1-2: I/O 모듈 (io.free)
```
파일: stdlib/io.free

함수:
├─ readFile(path: string) -> string
├─ writeFile(path: string, content: string) -> void
├─ exists(path: string) -> bool
├─ delete(path: string) -> void
├─ mkdir(path: string) -> void
├─ readDir(path: string) -> [string]
└─ readFileSync (블로킹) - 선택

구현 방식:
1. FreeLang으로 기본 구현
2. 핵심 시스템 콜은 C VM에서 제공
3. VM에 새로운 빌틴 함수 추가

테스트:
├─ 파일 읽기/쓰기
├─ 파일 존재 확인
├─ 디렉토리 생성
└─ 디렉토리 읽기
```

#### Day 3: 문자열 유틸 (string.free)
```
파일: stdlib/string.free

함수:
├─ repeat(s: string, n: i32) -> string
├─ padStart(s: string, len: i32, pad: string) -> string
├─ padEnd(s: string, len: i32, pad: string) -> string
├─ indexOf(s: string, search: string) -> i32
├─ lastIndexOf(s: string, search: string) -> i32
├─ startsWith(s: string, prefix: string) -> bool
├─ endsWith(s: string, suffix: string) -> bool
├─ replace(s: string, from: string, to: string) -> string
├─ replaceAll(s: string, from: string, to: string) -> string
└─ reverse(s: string) -> string

테스트:
├─ 반복, 패딩
├─ 검색 함수
└─ 치환 함수
```

#### Day 4: 배열 유틸 (array.free)
```
파일: stdlib/array.free

함수:
├─ join([T], sep: string) -> string
├─ reverse([T]) -> [T]
├─ sort([i32]) -> [i32]  (정렬)
├─ some([bool], fn: fn(T) -> bool) -> bool
├─ every([bool], fn: fn(T) -> bool) -> bool
├─ find([T], fn: fn(T) -> bool) -> T?
├─ findIndex([T], fn: fn(T) -> bool) -> i32
├─ includes([T], value: T) -> bool
├─ indexOf([T], value: T) -> i32
└─ lastIndexOf([T], value: T) -> i32

테스트:
├─ 배열 조작
├─ 검색 함수
└─ 필터링
```

#### Day 5: 객체 유틸 (object.free)
```
파일: stdlib/object.free

함수:
├─ keys(obj: object) -> [string]
├─ values(obj: object) -> [any]
├─ entries(obj: object) -> [[string, any]]
├─ assign(obj1: object, obj2: object) -> object
├─ fromEntries([[string, any]]) -> object
└─ hasKey(obj: object, key: string) -> bool

테스트:
├─ 객체 검사
├─ 객체 병합
└─ 변환 함수
```

#### Day 6-7: 수학 & 검증 유틸
```
파일: stdlib/math.free

함수:
├─ PI, E (상수)
├─ sin, cos, tan
├─ round, ceil, floor
├─ random() -> f64
├─ randomInt(min: i32, max: i32) -> i32
└─ gcd, lcm

파일: stdlib/validation.free

함수:
├─ isNumber(x: any) -> bool
├─ isString(x: any) -> bool
├─ isArray(x: any) -> bool
├─ isObject(x: any) -> bool
├─ isEmpty(x: any) -> bool
└─ isNil(x: any) -> bool
```

**주간 산출물**:
- ✅ io.free (파일 I/O)
- ✅ string.free (문자열 유틸 10개)
- ✅ array.free (배열 유틸 10개)
- ✅ object.free (객체 유틸 6개)
- ✅ math.free (수학 함수)
- ✅ validation.free (타입 검사)
- ✅ 40개 신규 테스트 (+1% 커버리지)

**주간 마일스톤**: ✅ 표준 라이브러리 기초 완성
**테스트 통과율**: 313/313 (100%)
**커버리지**: 40.5% → 41.5%

---

### **WEEK 4: 표준 라이브러리 Phase 2 (Network & Data)**

**목표**: HTTP, JSON 지원으로 실제 프로젝트 가능

#### Day 1-3: HTTP 클라이언트 (http.free)
```
파일: stdlib/http.free

함수:
├─ struct Response {
│   status: i32
│   body: string
│   headers: object
│ }
├─
├─ fn get(url: string) -> Response
├─ fn post(url: string, body: string) -> Response
├─ fn put(url: string, body: string) -> Response
├─ fn delete(url: string) -> Response
├─ fn request(method: string, url: string, options: object) -> Response
└─ async fn fetch (비동기 버전)

구현:
1. URL 파싱
2. TCP 소켓 연결 (C VM)
3. HTTP 요청 생성
4. 응답 파싱

테스트:
├─ 기본 GET
├─ POST with body
├─ 헤더 처리
└─ async fetch
```

#### Day 4-5: JSON (json.free)
```
파일: stdlib/json.free

함수:
├─ fn parse(str: string) -> object
├─ fn stringify(obj: any) -> string
├─ fn stringify(obj: any, pretty: bool) -> string
├─ fn prettify(str: string) -> string
├─ fn minify(str: string) -> string
└─ fn validate(str: string) -> bool

구현:
1. JSON 파서 (수동 작성)
2. JSON 생성 (객체 → 문자열)
3. 포맷팅 (들여쓰기)

테스트:
├─ 객체 → JSON
├─ JSON → 객체
├─ 중첩 구조
├─ 포맷팅
└─ 에러 처리
```

#### Day 6: 경로 유틸 (path.free)
```
파일: stdlib/path.free

함수:
├─ fn join(...parts: string) -> string
├─ fn dirname(path: string) -> string
├─ fn basename(path: string) -> string
├─ fn extname(path: string) -> string
├─ fn resolve(path: string) -> string
├─ fn normalize(path: string) -> string
└─ fn isAbsolute(path: string) -> bool

테스트:
├─ 경로 조합
├─ 경로 분해
└─ 정규화
```

#### Day 7: 날짜/시간 (datetime.free) - 선택
```
파일: stdlib/datetime.free

함수:
├─ fn now() -> i64 (밀리초)
├─ struct DateTime { ... }
├─ fn format(timestamp: i64, format: string) -> string
└─ fn parse(str: string, format: string) -> i64

테스트:
├─ 현재 시간
├─ 포맷팅
└─ 파싱
```

**주간 산출물**:
- ✅ http.free (GET, POST, PUT, DELETE)
- ✅ json.free (파싱, 생성)
- ✅ path.free (경로 유틸)
- ✅ datetime.free (날짜/시간)
- ✅ 35개 신규 테스트 (+1% 커버리지)

**주간 마일스톤**: ✅ 실제 프로젝트 개발 가능
**테스트 통과율**: 348/348 (100%)
**커버리지**: 41.5% → 42.5%

---

### **WEEK 5: 모듈 시스템 구현**

**목표**: import/export로 코드 조직화 가능

#### Day 1-2: 설계 & 파서 확장
```
작업:
1. 모듈 문법 정의
   - import { func } from "path"
   - import * as module from "path"
   - export fn, export const, export struct
   - import type

2. Parser 확장
   - import/export 파싱
   - 파일 경로 해석
   - 와일드카드 처리

코드 위치:
├─ src/parser.ts (import/export 파싱)
└─ SPEC_15_MODULES.md (모듈 스펙)

예시:
export fn add(a: i32, b: i32) -> i32 { a + b }

import { add } from "./math.free"

let result = add(3, 5)
```

#### Day 3-4: 모듈 로더 구현
```
작업:
1. ModuleLoader 클래스 작성
   - 파일 검색 (.free 확장자)
   - 순환 import 감지
   - 경로 정규화
   - 캐싱

2. Symbol Table 관리
   - 전역 심볼 테이블
   - 모듈별 심볼 테이블
   - Export 심볼 등록
   - Import 심볼 해석

코드 위치:
├─ src/module-loader.ts (새 파일)
├─ src/compiler.ts (loadModules 메소드)
└─ src/type-checker.ts (심볼 해석)
```

#### Day 5-6: Type Checker 확장
```
작업:
1. 모듈 스코프 처리
   - 모듈별 스코프 분리
   - Import된 심볼만 접근 가능
   - 명확한 에러 메시지

2. 순환 import 감지
   - 의존성 그래프 구성
   - 사이클 감지
   - 에러 리포팅

테스트:
├─ 기본 import/export
├─ 네임스페이스 격리
├─ 순환 import 감지
├─ 와일드카드 import
└─ export * (re-export)
```

#### Day 7: 통합 테스트 & 최적화
```
작업:
1. 통합 시나리오
   - 5개 파일 모듈 체인
   - 복잡한 의존성
   - 성능 측정

2. 경로 처리
   - 상대 경로 (./module)
   - 절대 경로 (/absolute/path)
   - 자동 확장자 추가

테스트:
├─ 5파일 모듈
├─ 성능 (컴파일 시간)
└─ 에러 처리
```

**주간 산출물**:
- ✅ SPEC_15_MODULES.md
- ✅ ModuleLoader 클래스
- ✅ Parser import/export 지원
- ✅ Type Checker 모듈 스코프
- ✅ 25개 신규 테스트 (+0.5% 커버리지)

**주간 마일스톤**: ✅ 모듈 시스템 완성
**테스트 통과율**: 373/373 (100%)
**커버리지**: 42.5% → 43%

---

### **WEEK 6: StdLib 확장 & 고급 기능 준비**

**목표**: 데이터베이스 지원, 제네릭 준비

#### Day 1-2: 데이터베이스 인터페이스
```
파일: stdlib/database.free

interface Database {
  query(sql: string, params: [any]) -> object
  execute(sql: string, params: [any]) -> i32
  close() -> void
}

구현:
1. SQLite 드라이버 (sql-lite.free)
   - sqlite3 연동 (C)
   - 기본 CRUD

2. PostgreSQL 드라이버 (postgres.free)
   - libpq 연동
   - 트랜잭션
   - 커넥션 풀 (나중)

테스트:
├─ SQLite 연결
├─ SELECT 쿼리
├─ INSERT/UPDATE
└─ 트랜잭션
```

#### Day 3-4: 캐싱 & 유틸
```
파일: stdlib/cache.free

함수:
├─ struct Cache<K, V> { ... }
├─ fn set(key: K, value: V) -> void
├─ fn get(key: K) -> V?
├─ fn delete(key: K) -> void
├─ fn clear() -> void
└─ fn size() -> i32

파일: stdlib/encoding.free

함수:
├─ fn base64.encode(data: string) -> string
├─ fn base64.decode(data: string) -> string
├─ fn hex.encode(data: string) -> string
├─ fn hex.decode(data: string) -> string
└─ fn md5(data: string) -> string

테스트:
├─ 캐시 기본 동작
├─ Base64 인코딩
├─ Hex 인코딩
└─ MD5 해싱
```

#### Day 5: 제네릭 설계
```
작업:
1. 제네릭 문법 설계
   - fn<T> max(a: T, b: T) -> T
   - struct Box<T> { value: T }
   - Generic constraint 지원

2. 컴파일러 설계
   - Type parameter 처리
   - Monomorphization (실체화)
   - 타입 검사

문서:
└─ SPEC_16_GENERICS.md (설계)
```

#### Day 6-7: 패턴 매칭 & 고급 기능 준비
```
작업:
1. 패턴 매칭 설계
   - match 표현식
   - 구조체 destructuring
   - 배열 패턴
   - 가드 조건

2. 채널 & Actor 설계
   - Channel<T> 완성 구현 계획
   - Actor 모델 구현 계획

문서:
├─ SPEC_17_PATTERN_MATCHING.md
└─ SPEC_18_CHANNELS_ACTORS.md
```

**주간 산출물**:
- ✅ database.free 인터페이스
- ✅ sqlite-lite.free, postgres.free 기본
- ✅ cache.free, encoding.free
- ✅ SPEC_16, 17, 18 설계 문서
- ✅ 20개 신규 테스트 (+0.5% 커버리지)

**주간 마일스톤**: ✅ StdLib 중핵심 완성, 고급 기능 설계 완료
**테스트 통과율**: 393/393 (100%)
**커버리지**: 43% → 43.5%

---

### **WEEK 7: 제네릭 & 패턴 매칭 구현**

**목표**: 타입 안전성 + 강력한 제어흐름

#### Day 1-3: 제네릭 구현
```
작업:
1. Parser 확장
   - Generic parameter <T, U, V>
   - Generic function/struct 파싱

2. Type Checker 확장
   - Type parameter 처리
   - Generic constraint 검사
   - 실체화 (monomorphization)

3. ISA Generator 확장
   - 제네릭 코드 생성
   - 타입별 실체화

테스트:
├─ fn<T> max(a: T, b: T) -> T
├─ struct Box<T> { value: T }
├─ struct Pair<A, B> { first: A, second: B }
└─ 중첩 제네릭
```

#### Day 4-5: 패턴 매칭 구현
```
작업:
1. Parser 확장
   - match 표현식
   - 패턴 문법 (literal, struct, array)
   - 가드 조건 (when)

2. Type Checker 확장
   - 패턴 타입 검사
   - 완전성 검사 (exhaustiveness)
   - 도달 불가능 검사

3. ISA Generator 확장
   - 패턴 매칭 → JMP 코드

테스트:
├─ match int { 1 => ..., 2 => ..., _ => ... }
├─ struct 패턴: match user { User { name, age } => ... }
├─ 배열 패턴: match arr { [first, ...rest] => ... }
└─ 가드: match x { n if n > 0 => ... }
```

#### Day 6-7: 통합 & 최적화
```
작업:
1. 제네릭 + 패턴 매칭 통합
   - 제네릭 패턴
   - 제네릭 match

2. 성능 최적화
   - 제네릭 코드 캐싱
   - 패턴 매칭 분기 최적화

테스트:
├─ 제네릭 match
├─ 복잡한 패턴
└─ 성능 (1000개 match)
```

**주간 산출물**:
- ✅ 제네릭 구현 완성
- ✅ 패턴 매칭 구현 완성
- ✅ 30개 신규 테스트 (+1% 커버리지)

**주간 마일스톤**: ✅ 고급 타입 기능 완성
**테스트 통과율**: 423/423 (100%)
**커버리지**: 43.5% → 44.5%

---

### **WEEK 8: 채널/Actor & 최종 마무리**

**목표**: 동시성 + 프로덕션 준비

#### Day 1-3: 채널 완전 구현
```
작업:
1. Channel<T> 완성
   - send(value: T)
   - recv() -> T
   - close()
   - 버퍼 크기 지정

2. 동기/비동기 채널
   - sync::mpsc (다중 생산, 단일 소비)
   - async::mpsc

3. Select 구문
   - select! { channel1 => ..., channel2 => ... }

테스트:
├─ 기본 채널
├─ 다중 생산자
├─ 버퍼 오버플로우 처리
└─ 타임아웃
```

#### Day 4-5: Actor 모델
```
작업:
1. Actor 매크로 구현
   - #[actor] struct MyActor
   - 메시지 핸들링
   - 상태 관리

2. Supervision 트리
   - 부모-자식 관계
   - 재시작 정책
   - 에러 전파

테스트:
├─ 기본 Actor 생성/메시지
├─ Actor 간 통신
├─ 에러 처리
└─ 재시작
```

#### Day 6: 최종 통합 테스트
```
작업:
1. 전체 통합
   - async/await + 모듈 + StdLib + 제네릭
   - 복잡한 시나리오 (마이크로서비스 패턴)
   - 성능 벤치마크

2. 문서 완성
   - 모든 기능 문서화
   - 예제 작성
   - 마이그레이션 가이드

테스트:
├─ HTTP 서버 + 모듈화
├─ DB 쿼리 + async
├─ 제네릭 데이터 구조 + 패턴 매칭
└─ 채널 기반 작업 처리
```

#### Day 7: 릴리스 준비
```
작업:
1. 최종 테스트
   - 모든 테스트 통과
   - 커버리지 > 45% 확보
   - 성능 기준 달성

2. 문서 & 릴리스
   - FINAL_REPORT_v2.md 작성
   - v2.0-release 태그 생성
   - Gogs 업데이트

3. 주요 기능 요약
   - 언어: 완전한 기능 + async/await + 모듈 + 제네릭 + 패턴 매칭
   - StdLib: 30+ 모듈, 150+ 함수
   - 테스트: 450+ 테스트, 45%+ 커버리지
   - 문서: 20+ 스펙 문서
```

**주간 산출물**:
- ✅ 채널/Actor 완성
- ✅ 전체 통합 테스트
- ✅ 35개 신규 테스트 (+1% 커버리지)
- ✅ FINAL_REPORT_v2.md
- ✅ v2.0-release 태그

**주간 마일스톤**: ✅ v2.0 완성형 언어 릴리스
**테스트 통과율**: 458/458 (100%)
**커버리지**: 44.5% → 45.5%

---

## 📊 전체 로드맵 요약

### 우선순위별 완성 일정

```
┌─────────────────────────────────────────────────────┐
│ WEEK 1-2: async/await                    (50일 중 14일)
│ WEEK 3-4: 표준 라이브러리 Phase 1-2      (50일 중 14일)
│ WEEK 5:   모듈 시스템                    (50일 중 7일)
│ WEEK 6:   StdLib 확장 + 설계             (50일 중 7일)
│ WEEK 7:   제네릭 + 패턴 매칭            (50일 중 7일)
│ WEEK 8:   채널 + 최종 마무리             (50일 중 7일)
└─────────────────────────────────────────────────────┘
```

### 누적 진행률

| 주차 | async | StdLib | 모듈 | 제네릭 | 채널 | 테스트 | 커버리지 |
|------|-------|--------|------|--------|------|--------|----------|
| 초기 | 0% | 20% | 0% | 0% | 5% | 213 | 38.5% |
| W1-2 | ✅ 100% | 20% | 0% | 0% | 5% | 273 | 40.5% |
| W3-4 | 100% | ✅ 100% | 0% | 0% | 5% | 348 | 42.5% |
| W5 | 100% | 100% | ✅ 100% | 0% | 5% | 373 | 43% |
| W6 | 100% | 100% | 100% | 10% | 10% | 393 | 43.5% |
| W7 | 100% | 100% | 100% | ✅ 100% | 10% | 423 | 44.5% |
| W8 | 100% | 100% | 100% | 100% | ✅ 100% | 458 | 45.5% |

---

## 🎯 의존성 및 병목

### 의존성 맵

```
async/await
├─ 독립적 구현 가능
└─ StdLib 구현 시 필수

표준 라이브러리
├─ async/await에 의존 (I/O 작업)
├─ 모듈 시스템과 독립적
└─ 모듈 시스템 이후 더 체계적으로 구성 가능

모듈 시스템
├─ async/await와 독립적
├─ StdLib와 독립적
└─ 구현 순서는 유연함

제네릭
├─ 기존 기능과 독립적
└─ 패턴 매칭과 조합 가능

패턴 매칭
├─ 기존 기능과 독립적
└─ 제네릭과 조합 가능

채널/Actor
├─ async/await에 의존 (비동기 처리)
└─ 모듈 시스템 이후 구현 권장
```

### 병목 지점

**W1-2 (async/await)**:
- 병목: VM 구현 복잡도
- 해결: 점증적 구현 (Promise → then → await)

**W3-4 (StdLib)**:
- 병목: 파일 I/O C 바인딩
- 해결: 미리 C 함수 준비 (fopen, fclose, fread, fwrite)

**W5 (모듈)**:
- 병목: 순환 import 감지 알고리즘
- 해결: 그래프 DFS 사용

**W7 (제네릭)**:
- 병목: 실체화 (monomorphization) 구현
- 해결: Template 기반 코드 생성

---

## ✅ 검증 & 승인

### 체크리스트

- [ ] 우선순위 적절한가?
- [ ] 일정이 현실적인가?
- [ ] 각 마일스톤이 명확한가?
- [ ] 병목 지점 파악이 완전한가?
- [ ] 테스트 계획이 충분한가?

### 피드백 포인트

**질문 1**: 각 주마다 최소 30개 테스트를 추가할 시간이 있나?
- 현재: 각 주 25-40개 테스트 예상
- 조정 가능: 테스트 일정 압축 필요시

**질문 2**: 모듈 시스템 이후 StdLib를 재구성해야 하나?
- 현재: 아니오 (기본 io, json, http는 모듈 없이도 구현)
- 모듈 시스템 후 정리 및 확장

**질문 3**: v2.0 정의는?
- 현재: async + StdLib + 모듈 + 제네릭 + 패턴 + 채널
- 최소 조건: async + StdLib + 모듈만 해도 v2.0 가능

---

## 🚀 실행 계획

### 내일 시작 (2026-03-31)
1. async/await SPEC 작성 시작 (SPEC_14_ASYNC_AWAIT.md)
2. Parser 분석 및 확장 계획 수립
3. VM 비동기 큐 설계

### 주간별 체크포인트
- **매주 금요일**: 주간 마일스톤 검증
- **매주 목요일**: 다음 주 준비 및 피드백 수집
- **격주 월요일**: 누적 진행률 검토

### 실패 시 대응책
- 어떤 주가 지연 시 → 다음 주 일정 조정
- 테스트 미달 시 → 다음 주 테스트 추가
- 기능 미완성 시 → MVP 기준으로 축소 (모듈 제외 가능)

---

**로드맵 상태**: ✅ 승인 대기
**실행 준비도**: 90%
**예상 완료일**: 2026-05-27 (8주 = 56일)

