# ⚡ FreeLang v4 Async/Await 구현 계획서

**예상 시간**: 48시간 (6일) | **난이도**: 상 (9/10)

**전략**: Promise 기반 상태 머신 변환

---

## 1. 현황 분석

### 현재 상태

| 컴포넌트 | 현재 상태 | 필요 추가 | 예상 변경량 |
|---------|---------|---------|----------|
| **Lexer** | async/await 없음 | ASYNC, AWAIT 토큰 | 5줄 |
| **AST** | 기본 정의만 | isAsync 플래그, await_expr | 15줄 |
| **Parser** | Pratt 파서 동작 | fn async 처리, await 연산자 | 20줄 |
| **Type Checker** | 기본 타입만 | Promise<T> 타입, async fn 검사 | 60줄 |
| **Compiler** | spawn 기반 | 상태 머신 생성, 새 opcode | 125줄 |
| **VM** | 동기식 실행 | Promise 저장소, Event loop | 300줄 |
| **총계** | - | - | **525줄** |

---

## 2. 비동기 모델 선택: Promise 기반

### 선택 이유
1. **JavaScript/TypeScript 호환성**
2. **표준화된 의미론**
3. **명확한 타입 안전성**
4. **깊은 중첩 시 스택 오버플로우 없음**

### 변환 흐름
```
async fn foo(): T { body }
    ↓ (컴파일러)
fn foo(): Promise<T> { 상태 머신 }
    ↓ (VM 실행)
Event loop + Task queue
```

---

## 3. 문법 설계

### Async 함수
```freeLang
async fn fetchData(): Promise<string> {
  await delay(100)
  return "data"
}
```

### Await 연산자
```freeLang
async fn main() {
  let result = await fetchData()  // ✅ OK
}

fn sync() {
  let x = await something()       // ❌ Error
}
```

### 에러 처리
```freeLang
async fn safe(): Promise<i32> {
  try {
    return await risky()
  } catch(e) {
    throw Error("Error: " + e.message)
  }
}
```

---

## 4. 타입 시스템 확장

### 새 타입
```typescript
// ast.ts
{ kind: "promise"; element: TypeAnnotation }

// checker.ts
{ kind: "promise"; element: Type }
```

### 타입 규칙
```
1. async fn f(): T → fn f(): Promise<T> (자동 변환)
2. await e: Promise<T> → e: T
3. f(): Promise<i32> → await f() 필수
4. await f() (f가 Promise 아님) → Type error
```

---

## 5. 상태 머신 변환 예시

### 입력 코드
```freeLang
async fn getUserProfile(id: i32): Promise<string> {
  let user = await fetchUser(id)
  let profile = await fetchProfile(user)
  return profile.name
}
```

### 상태 분석
```
상태 0: fetchUser(id) 호출 → await (Promise 대기)
상태 1: user 저장 → fetchProfile(user) 호출 → await
상태 2: profile 저장 → profile.name 계산 → Promise 해결
```

### 생성된 바이트코드 (의사 코드)
```
PROMISE_NEW
STORE_LOCAL #promise

STATE_0:
  LOAD_LOCAL id
  CALL fetchUser
  AWAIT

STATE_1:
  STORE_LOCAL user
  LOAD_LOCAL user
  CALL fetchProfile
  AWAIT

STATE_2:
  STORE_LOCAL profile
  LOAD_LOCAL profile
  FIELD_ACCESS "name"
  PROMISE_RESOLVE
  RETURN
```

---

## 6. 구현 단계 및 일정

### Phase 1: 기초 (12시간)

**1. Lexer 수정** (1시간)
```typescript
// src/lexer.ts에 추가
enum TokenType {
  ASYNC = "ASYNC",
  AWAIT = "AWAIT",
}

keywords['async'] = TokenType.ASYNC
keywords['await'] = TokenType.AWAIT
```

**2. AST 확장** (1시간)
```typescript
// src/ast.ts
type TypeAnnotation =
  | { kind: "promise"; element: TypeAnnotation }

type FnDecl = {
  isAsync: boolean  // 새로 추가
  // ... 나머지
}

type Expr =
  | { kind: "await"; expr: Expr; line: number; col: number }
```

**3. Parser 수정** (2시간)
```typescript
// async fn 문법
private parseFnDecl(): Stmt {
  const isAsync = this.match(TokenType.ASYNC);
  this.consume(TokenType.FN, "expect 'fn'");
  // ... 나머지
  return { kind: "fn_decl", isAsync, ... }
}

// await 연산자
private parseAwait(): Expr {
  this.consume(TokenType.AWAIT, "expect 'await'");
  return { kind: "await", expr: this.parseUnary() }
}
```

**4. Type Checker 확장** (2시간)
```typescript
// Promise 타입 호환성 검사
function isPromiseCompatible(t: Type): boolean {
  return t.kind === "promise";
}

// async fn 검사
case "fn_decl":
  if (stmt.isAsync) {
    returnType = { kind: "promise", element: returnType }
  }

// await 식 검사
case "await":
  const exprType = this.checkExpr(expr.expr);
  if (exprType.kind !== "promise") {
    this.error("can only await on Promise", expr.line, expr.col);
  }
  return exprType.element;
```

**5. 테스트 & 검증** (1시간)

### Phase 2: 컴파일러 (10시간)

**1. Async 함수 분석** (2시간)
- await 포인트 찾기
- 로컬 변수 상태 추적

**2. 상태 머신 바이트코드 생성** (4시간)
- 상태 ID 할당
- 각 상태 간 전이 코드 생성
- Promise 체이닝

**3. OpCode 추가** (2시간)
```typescript
enum Op {
  PROMISE_NEW = 0x90,
  PROMISE_RESOLVE = 0x91,
  PROMISE_REJECT = 0x92,
  AWAIT = 0x93,
}
```

**4. 함수 호출 수정** (1시간)
- async 함수 감지
- Promise 자동 래핑

### Phase 3: VM 확장 (14시간)

**1. Promise 저장소** (3시간)
```c
typedef struct {
  int id;
  int state;              // 0=pending, 1=fulfilled, 2=rejected
  Value value;            // 결과 값
  const char* reason;     // 에러 메시지
  uint32_t created_at;
  uint32_t resolved_at;
} Promise;

#define MAX_PROMISES 256
Promise promises[MAX_PROMISES];
```

**2. Event Loop** (3시간)
```c
typedef struct {
  int id;
  int state;              // 0=pending, 1=running, 2=waiting, 3=done
  int promise_id;         // 대기 중인 Promise
  uint32_t pc;            // Program counter
  uint32_t wait_until;    // 대기 종료 tick
} Task;

void async_event_loop(VM* vm) {
  while (task_count > 0) {
    for (int i = 0; i < task_count; i++) {
      if (can_run(&tasks[i])) {
        execute_task(vm, &tasks[i]);
      }
    }
    tick++;
  }
}
```

**3. OpCode 실행 로직** (5시간)
- PROMISE_NEW: 새 Promise 생성
- AWAIT: 현재 Task 대기 상태로
- PROMISE_RESOLVE: Promise 해결, Task 재개

**4. 내장 함수** (2시간)
```freeLang
setTimeout(fn: () -> void, ms: i32) -> Promise<void>
delay(ms: i32) -> Promise<void>
```

### Phase 4: 통합 & 최적화 (12시간)

**1. Promise rejection 처리** (2시간)
**2. Promise.all, Promise.race** (2시간)
**3. 메모리 누수 방지** (2시간)
**4. 성능 최적화** (2시간)
**5. 통합 테스트** (4시간)

---

## 7. 테스트 케이스 (13개)

### 기본 테스트
```freeLang
// T1: 간단한 async 함수
async fn simple(): Promise<i32> {
  return 42
}

// T2: await with delay
async fn delayed(): Promise<i32> {
  await delay(100)
  return 42
}

// T3: 순차 await
async fn sequential(): Promise<i32> {
  let a = await delay_and_return(100, 10)
  let b = await delay_and_return(100, 20)
  return a + b
}

// T4: Promise.all 동시 실행
async fn concurrent(): Promise<i32> {
  let results = await Promise.all([
    delay_and_return(100, 10),
    delay_and_return(100, 20),
    delay_and_return(100, 30)
  ])
  return results[0] + results[1] + results[2]
}

// T5: Try-catch in async
async fn safe(): Promise<i32> {
  try {
    return await risky()
  } catch(e) {
    return -1
  }
}
```

---

## 8. VM 런타임 구조

### Promise 저장소
```c
#define MAX_PROMISES 256
typedef struct {
  int id;
  int state;              // 0=pending, 1=fulfilled, 2=rejected
  Value value;
  const char* reason;
  int callback_count;
  int callback_ids[16];
  uint32_t created_at;
  uint32_t resolved_at;
} Promise;

Promise promises[MAX_PROMISES];
int promise_count = 0;
```

### Task Queue
```c
#define MAX_TASKS 128
typedef struct {
  int id;
  int state;              // 0=pending, 1=running, 2=waiting, 3=done
  int promise_id;         // 대기 중인 Promise
  uint32_t pc;            // Program counter
  uint32_t wait_until;    // 대기 종료 tick
} Task;

Task tasks[MAX_TASKS];
int task_count = 0;
```

---

## 9. 성능 특성

### 메모리 오버헤드
```
Promise 객체: 64B × 256 = 16KB
Task 객체: 128B × 128 = 16KB
콜백 배열: 32KB
────────────────────────
총 메모리: ~64KB (전체의 ~2%)
```

### 실행 시간
```
순차 await (3개):
  A + B + C = 300ms (상태 머신이므로 동일)

동시 실행 (Promise.all):
  max(A, B, C) = 100ms

단일 await 오버헤드: +5% (Task context switch)
```

### 처리량
```
초당 Task 처리: ~10,000
동시 Promise: 256개
메시지 처리율: ~1,000/sec
```

---

## 10. 내장 함수

### Promise 관련
| 함수 | 시그니처 | 설명 |
|------|---------|------|
| `Promise.resolve` | `<T>(value: T) -> Promise<T>` | 즉시 해결 |
| `Promise.reject` | `(reason: string) -> Promise<void>` | 즉시 거부 |
| `Promise.all` | `<T>([Promise<T>]) -> Promise<T[]>` | 모두 대기 |
| `Promise.race` | `<T>([Promise<T>]) -> Promise<T>` | 최초 대기 |

### 타이밍
| 함수 | 시그니처 |
|------|---------|
| `setTimeout` | `(fn: () -> void, ms: i32) -> Promise<void>` |
| `delay` | `(ms: i32) -> Promise<void>` |

---

## 11. 파일 변경 요약

| 파일 | 변경 타입 | 라인 수 |
|------|---------|--------|
| src/lexer.ts | 수정 | +5 |
| src/ast.ts | 수정 | +15 |
| src/parser.ts | 수정 | +20 |
| src/checker.ts | 수정 | +60 |
| src/compiler.ts | 수정 | +125 |
| c-vm/async_runtime.c | 신규 | 300 |
| 테스트 파일 | 신규 | 200+ |
| **총계** | | **725줄** |

---

## 12. 위험 요소 & 완화

| 위험 | 확률 | 심각도 | 완화 방법 |
|------|------|--------|---------|
| 상태 머신 복잡도 | 중간 | 높음 | 광범위한 테스트 |
| 메모리 누수 | 낮음 | 높음 | 콜백 정리 검증 |
| 데드락 | 낮음 | 중간 | Timeout 메커니즘 |
| 타이밍 버그 | 중간 | 중간 | 로깅 + 디버깅 도구 |

---

## 13. 성공 기준

- ✅ 모든 13개 테스트 통과
- ✅ 기존 프로그램 호환성 유지
- ✅ 성능 저하 <10%
- ✅ 메모리 오버헤드 <5MB
- ✅ 문서 완성도 100%

---

## ✅ 체크리스트

- [ ] Lexer: ASYNC, AWAIT 토큰 추가
- [ ] AST: Promise 타입, await_expr, isAsync 추가
- [ ] Parser: async fn, await 연산자 파싱
- [ ] Type Checker: Promise 타입 검증
- [ ] Compiler: 상태 머신 바이트코드 생성
- [ ] VM: Promise 저장소, Event loop 구현
- [ ] 내장 함수: setTimeout, delay, Promise.all/race
- [ ] 모든 13개 테스트 통과
- [ ] 성능 벤치마킹
- [ ] 문서 작성

---

**구현 일정**: 6일 (Phase 1-4 순차 진행)
