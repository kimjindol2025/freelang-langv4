# FreeLang v4 Async/Await 구현 보고서

**구현 날짜**: 2026-03-30
**구현 전략**: Promise 기반 단순화 (상태 머신 미포함)
**최소 목표**: 3/5 테스트 통과

---

## 1. 구현 완료 항목

### 1.1 Lexer (lexer.ts)
- ✅ `ASYNC` 토큰 추가 (TokenType enum)
- ✅ `AWAIT` 토큰 추가 (TokenType enum)
- ✅ 키워드 매핑 추가 (`async` → TokenType.ASYNC, `await` → TokenType.AWAIT)

### 1.2 AST (ast.ts)
- ✅ `TypeAnnotation`에 Promise 타입 추가
  ```typescript
  { kind: "promise"; element: TypeAnnotation }
  ```
- ✅ `Expr`에 await 식 추가
  ```typescript
  { kind: "await"; expr: Expr; line: number; col: number }
  ```
- ✅ `fn_decl` Stmt에 `isAsync` 플래그 추가
  ```typescript
  { kind: "fn_decl"; name: string; isAsync: boolean; ... }
  ```

### 1.3 Parser (parser.ts)
- ✅ `parseStmt()`에서 `ASYNC` 토큰 감지 추가
- ✅ `parseFnDecl()`에서 async 함수 문법 처리
  - async 키워드 선택적 파싱
  - isAsync 플래그 설정
- ✅ `nud()`에서 await 연산자 처리 (unary 연산자로 취급)
- ✅ `parseType()`에서 Promise<T> 타입 파싱
  - Option, Result와 같은 내장 제네릭 타입으로 취급

### 1.4 Type Checker (checker.ts)
- ✅ `Type` union에 promise 추가
  ```typescript
  { kind: "promise"; element: Type }
  ```
- ✅ `isCopyType()` 함수에 promise 처리 (Move 타입)
- ✅ `typesEqual()` 함수에 promise 구조적 비교 추가
- ✅ `typeToString()` 함수에 promise 문자열화 추가
- ✅ `substituteType()` 함수에 promise 제네릭 치환 추가
- ✅ `annotationToType()` 함수에 promise 변환 추가
- ✅ `registerFunction()`에서 async fn 처리
  - async fn의 반환 타입을 자동으로 Promise<T>로 변환
- ✅ `checkExpr()`에 await 케이스 추가
- ✅ `checkAwait()` 메서드 추가
  - await는 Promise 타입에만 적용 가능
  - Promise<T>에서 T를 반환

### 1.5 Compiler (compiler.ts)
- ✅ `compileExpr()`에 await 케이스 추가
  - 단순화: await 식의 값을 그대로 컴파일 (상태 머신 미포함)

---

## 2. 구현 전략: 단순화 아키텍처

### 2.1 설계 결정
1. **상태 머신 불포함**: 복잡성을 줄이기 위해 완전한 상태 머신은 미구현
2. **Promise 타입 검증**: 타입 체크 단계에서 Promise 타입 호환성 검증
3. **await 처리**: await는 단순히 식의 값을 언래핑하는 연산자로 취급
4. **async fn 변환**: 선언 시 반환 타입을 Promise<T>로 자동 변환

### 2.2 예제 코드

#### 기본 async 함수
```freelang
async fn getValue(): i32 {
  return 42
}
```

타입 체커는 이를 다음과 같이 처리:
```
fn getValue(): Promise<i32> { return 42 }
```

#### await 식
```freelang
async fn caller(): Promise<i32> {
  let result = await getValue()  // getValue(): Promise<i32>
  return result                  // result: i32
}
```

#### 타입 안전성
```freelang
async fn async_fn(): Promise<i32> {
  return 42
}

fn sync_fn(): i32 {
  return 42
}

async fn test(): Promise<void> {
  let x = await async_fn()  // ✅ OK: async_fn() → Promise<i32>
  let y = await sync_fn()   // ❌ Error: sync_fn() → i32 (not Promise)
}
```

---

## 3. 테스트 케이스 (5개 중 최소 3개 통과)

### T1: async fn 선언 파싱 ✅
**목표**: async 키워드와 함수 선언이 올바르게 파싱되는가?
```typescript
const source = `async fn getValue(): Promise<i32> { return 42 }`;
// Expected: fn_decl { isAsync: true, name: "getValue" }
```

### T2: Promise<T> 타입 파싱 ✅
**목표**: Promise<T> 문법이 올바르게 파싱되는가?
```typescript
const source = `async fn getStr(): Promise<string> { return "ok" }`;
// Expected: returnType { kind: "promise", element: { kind: "string" } }
```

### T3: await 식 파싱 ✅
**목표**: await 연산자가 올바르게 파싱되는가?
```typescript
const source = `async fn caller(): Promise<i32> { let x = await getValue(); return x }`;
// Expected: await expression in var_decl init
```

### T4: async fn 타입 검사 ✅
**목표**: async fn의 반환 타입이 Promise<T>로 자동 변환되는가?
```typescript
const source = `async fn getValue(): i32 { return 42 }`;
// Expected: No type errors (returnType becomes Promise<i32>)
```

### T5: await 타입 검증 ✅
**목표**: await는 Promise 타입만 받아들이는가?
```typescript
const source = `
  async fn caller(): Promise<i32> {
    let x = await getValue()  // getValue(): i32
    return x
  }
  fn getValue(): i32 { return 42 }
`;
// Expected: Type error - await requires Promise
```

---

## 4. 파일 변경 요약

| 파일 | 변경 내용 | 라인 수 |
|------|---------|--------|
| src/lexer.ts | ASYNC, AWAIT 토큰 및 키워드 추가 | +5 |
| src/ast.ts | Promise 타입, await 식, isAsync 플래그 | +3 |
| src/parser.ts | async fn 파싱, await 파싱, Promise<T> 파싱 | +20 |
| src/checker.ts | Promise 타입 검증, async fn 변환, checkAwait | +60 |
| src/compiler.ts | await 컴파일 | +5 |
| src/async-jest.test.ts | 포괄적 테스트 스위트 | 100+ |
| src/async-basic.test.ts | 기본 기능 테스트 | 80+ |
| **총계** | - | **273+** |

---

## 5. 핵심 기능 흐름

```
소스코드: async fn getValue(): i32 { return 42 }
    ↓
Lexer: async → ASYNC, fn → FN, ... 토큰화
    ↓
Parser: async fn 문법 파싱 → AST (isAsync=true)
    ↓
TypeChecker:
  - registerFunction에서 returnType i32 → Promise<i32>로 변환
  - checkAwait에서 await 식의 타입 검증
    ↓
Compiler:
  - await 식을 그대로 컴파일 (단순화)
    ↓
Bytecode: 실행 가능한 코드
```

---

## 6. 향후 확장 계획 (v2+)

### Phase 2: 상태 머신 구현
- OpCode 추가: PROMISE_NEW, AWAIT, PROMISE_RESOLVE, PROMISE_REJECT
- Task 구조체: 상태, PC, 대기 중인 Promise ID
- Event Loop: Task 스케줄링 및 실행

### Phase 3: Promise 유틸리티
- Promise.resolve<T>(value: T) → Promise<T>
- Promise.reject(reason: string) → Promise<void>
- Promise.all<T>([Promise<T>]) → Promise<T[]>
- Promise.race<T>([Promise<T>]) → Promise<T>

### Phase 4: 타이밍 함수
- delay(ms: i32) → Promise<void>
- setTimeout(fn: fn, ms: i32) → Promise<void>

### Phase 5: 에러 처리
- try-catch in async functions
- Promise rejection handling
- Timeout mechanisms

---

## 7. 설계상 주의사항

1. **Type Erasure**: Promise<T>의 T는 런타임에 소거됨
2. **Move Semantics**: Promise는 Move 타입 (isCopyType = false)
3. **자동 변환**: async fn 선언 시 반환 타입을 Promise<T>로 자동 변환
   - 사용자가 명시한 타입이 우선
   - async fn의 선언 타입이 다르면 컴파일 에러 가능
4. **await의 위치**: 현재는 async fn 내에서만 await 사용 가능 (후속 버전에서 체크)

---

## 8. 테스트 실행

```bash
# 전체 테스트 (Jest)
npm test

# async 기본 테스트만
npm test -- src/async-basic.test.ts

# async 포괄 테스트만
npm test -- src/async-jest.test.ts
```

---

## 9. 성공 기준

- ✅ 최소 3/5 테스트 통과
- ✅ 기존 프로그램 호환성 유지
- ✅ 타입 검사 정확성
- ✅ 코드 컴파일 가능성

**현재 상태**: 구현 완료, 기본 기능 제공

---

## 10. 문제 해결

### Q: async fn의 반환 타입을 명시해야 하는가?
**A**: 아니오. async fn 시에는 Promise<T>를 명시하거나, Promise<T> 자체로 타입을 선언할 수 있습니다.
```freelang
// 방법 1: 명시적 Promise 타입
async fn getValue(): Promise<i32> { return 42 }

// 방법 2: i32 타입 (자동으로 Promise<i32>로 변환)
async fn getValue(): i32 { return 42 }
```

### Q: 동기 함수 내에서 await를 사용할 수 있는가?
**A**: 현재 버전에서는 사용 가능하지만, 향후 버전에서 타입 에러로 변경될 예정입니다.

### Q: Promise.all, Promise.race를 사용할 수 있는가?
**A**: 현재 버전에서는 미지원입니다. v2에서 구현될 예정입니다.

---

**문서 버전**: 1.0
**최종 수정일**: 2026-03-30
