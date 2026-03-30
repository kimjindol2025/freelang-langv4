# Phase 1 구현 준비 가이드

**날짜:** 2026-03-30
**목표:** v1.0-stable (252/252 테스트)
**예상 시간:** 7-8시간 (병렬 구현)

---

## 🔍 Task 분석 & 현황

### Task 1: 패턴 매칭 컴파일 (0/8 → 8/8)

#### 현재 오류 분석
```
T1, T2, T5, T6: expect(output).toEqual(["100"])
  받은 값: ["void"]
  원인: match_expr이 값을 반환하지 않음

T3, T4, T8: Parse: expected field name (got RBRACE)
  원인: 빈 struct 패턴 파싱 실패 → Point { }
```

#### 문제 위치

**파일 1: src/compiler.ts**
```typescript
// 라인 ~500-650: compileMatchExpr()
// 현재 상태: match_expr이 마지막 arm의 값을 반환하지 않음

// 예상 구조:
case "match_expr": {
  const subject = this.compileExpr(stmt.subject);

  for (const arm of stmt.arms) {
    // 1. Guard 절 평가
    if (arm.guard) {
      this.compileExpr(arm.guard);
      // false면 다음 arm으로
    }

    // 2. Body 실행
    this.compileExpr(arm.body);
    // 값이 스택에 남아야 함
  }

  // 3. 최종 값을 반환
  return;
}
```

**파일 2: src/parser.ts**
```typescript
// 라인 ~990-1015: parsePattern() - struct 케이스
// 현재: if (!this.check(TokenType.RBRACE)) { ... }
// 문제: RBRACE를 먼저 확인하지만, 이후 처리가 있음

// 수정 필요:
case struct: {
  fields: [];  // 빈 배열 허용
  rest: false;
}
```

#### 구현 체크리스트

- [ ] **파일: src/compiler.ts**
  - [ ] 라인 500-650 검토
  - [ ] compileMatchExpr() 수정
  - [ ] Guard 절 JMP 로직 추가
  - [ ] 최종 값 스택 유지

- [ ] **파일: src/parser.ts**
  - [ ] 라인 990-1015 검토
  - [ ] 빈 struct 패턴 처리
  - [ ] DOTDOT 처리 검증

- [ ] **테스트**
  ```bash
  npm test -- pattern-matching-jest.test.ts
  # 목표: 8/8 통과
  ```

---

### Task 2: async/await Promise 완성 (1/5 → 5/5)

#### 현재 오류 분석
```
T1: Parse error: expected '->' for return type (got COLON)
  원인: async fn의 반환 타입 파싱 실패

T2, T4, T5: Parse/Type errors
  원인: Promise 타입 미처리, await 처리 미완성
```

#### 문제 위치

**파일 1: src/checker.ts**
```typescript
// 라인 ~1550-1600: checkFnDecl() - async 처리
// 현재 상태: async fn → Promise<T> 변환이 완료되지 않음

// 필요한 변경:
if (stmt.isAsync) {
  returnType = { kind: "promise", element: returnType };
}

// impl: Promise 래퍼 클래스
class Promise {
  _value: T;
  static resolve(val: T) { return new Promise(val); }
}
```

**파일 2: src/compiler.ts**
```typescript
// 라인 ~1200-1300: compileExpr() - await 케이스
// 현재: await 컴파일 미구현 (stub만 있음)

case "await": {
  this.pushIrValue(expr.expr);

  // Promise._value 필드 접근
  this.chunk.emit(Op.FIELD_GET, 0);
  this.chunk.emitStr("_value", 0);

  // 스택에 값 남김
}
```

#### 구현 체크리스트

- [ ] **파일: src/checker.ts**
  - [ ] 라인 1550-1600 검토
  - [ ] async fn 반환타입 Promise 변환
  - [ ] Promise 클래스 정의 확인
  - [ ] checkAwaitExpr() 검증

- [ ] **파일: src/compiler.ts**
  - [ ] 라인 1200-1300 검토
  - [ ] await 식 컴파일 (FIELD_GET)
  - [ ] Promise 런타임 지원 확인

- [ ] **파일: src/vm.ts**
  - [ ] Promise 객체 구현 확인
  - [ ] _value 필드 지원

- [ ] **테스트**
  ```bash
  npm test -- async-jest.test.ts
  # 목표: 5/5 통과
  ```

---

### Task 3: 채널 런타임 완성 (2/7 → 7/7)

#### 현재 오류 분석
```
T2: Runtime error: panic: send on non-channel
  원인: Op.CHAN_SEND에서 채널 타입 검사 실패

T3-T7: Type errors: undefined variable
  원인: spawn 블록에서 채널 변수 접근 불가 (이미 수정)
```

#### 문제 위치

**파일: src/vm.ts**
```typescript
// 라인 ~1800-2000: executeOp() - 채널 관련 opcodes
// 현재 상태: Op.CHAN_SEND/RECV 미구현

// 필요한 구조:
class Channel {
  elementType: Type;
  queue: Value[] = [];
}

case Op.CHAN_NEW: {
  const elementType = /* pop type info */;
  const chan = new Channel(elementType);
  this.push(chan);
  break;
}

case Op.CHAN_SEND: {
  const value = this.pop();
  const chan = this.pop();

  if (!chan || !(chan instanceof Channel)) {
    throw new Error("panic: send on non-channel");
  }

  chan.queue.push(value);
  break;
}

case Op.CHAN_RECV: {
  const chan = this.pop();

  if (!chan || !(chan instanceof Channel)) {
    throw new Error("panic: receive from non-channel");
  }

  const value = chan.queue.shift() || null;
  this.push(value);
  break;
}
```

**파일: src/checker.ts**
```typescript
// 라인 ~500: checkSpawnStmt() - 이미 수정됨
// 현재: Scope(prevScope)로 부모 스코프 유지 ✅
// 상태: OK (spawn에서 채널 접근 가능)
```

#### 구현 체크리스트

- [ ] **파일: src/vm.ts**
  - [ ] 라인 1800-2000 검토
  - [ ] Channel 클래스 구현
  - [ ] Op.CHAN_NEW 구현
  - [ ] Op.CHAN_SEND 구현
  - [ ] Op.CHAN_RECV 구현
  - [ ] "panic" 에러 메시지 추가

- [ ] **파일: src/compiler.ts**
  - [ ] compileExpr() - channel 케이스 검증
  - [ ] chan_new, chan_send, chan_recv 컴파일 확인

- [ ] **테스트**
  ```bash
  npm test -- channel-jest.test.ts
  # 목표: 7/7 통과
  ```

---

## 📐 구현 우선순위

```
❶ Task 3 (채널)     - 가장 간단 (VM만 구현)
  └─ src/vm.ts만 수정, 1-2시간

❷ Task 2 (async)    - 중간 (Checker + Compiler)
  └─ src/checker.ts, src/compiler.ts 수정, 2시간

❸ Task 1 (패턴)     - 가장 복잡 (Parser + Compiler)
  └─ 여러 파일 수정, 2-3시간
```

## 🎯 병렬 구현 전략

```
시간대    Agent 1               Agent 2               Agent 3
─────────────────────────────────────────────────────────────
1시간    패턴 분석           async 분석            채널 분석
         (src 읽기)          (src 읽기)            (src 읽기)

2-3시간  패턴 구현           async 구현            채널 구현
         (Parser/Compiler)   (Checker/Compiler)    (VM)

4시간    테스트 & 수정       테스트 & 수정         테스트 & 수정
         (pattern-matching)  (async-jest)          (channel-jest)

5시간    통합 테스트 (npm test → 252/252)
         버그 수정
         최종 커밋
```

---

## 📋 구현 전 체크리스트

### 환경 확인
- [ ] `npm run build` 성공 확인
- [ ] `npm test` 현재 상태 확인 (233/252)
- [ ] git status 깨끗한 상태 확인

### 파일 백업 (선택사항)
```bash
git branch phase1-implementation
# 구현 중 문제 발생 시 되돌릴 수 있음
```

### 구현 시작
```bash
# 현재 상태 저장
git add .
git commit -m "chore: Checkpoint before Phase 1 implementation"

# 각 task별 에이전트 시작
npm test -- pattern-matching-jest.test.ts  # 현재 상태 확인 (0/8)
npm test -- async-jest.test.ts             # 현재 상태 확인 (1/5)
npm test -- channel-jest.test.ts           # 현재 상태 확인 (2/7)
```

---

## 🔧 구현 팁

### 1. 패턴 매칭
```typescript
// Guard 절 컴파일 예시
for (const arm of stmt.arms) {
  // 패턴 테스트
  const matchLabel = this.chunk.label();
  this.compilePatternTest(arm.pattern, subject);
  const skipLabel = this.chunk.label();
  this.chunk.emit(Op.JMP_IF_FALSE, 0);
  this.chunk.emitI32(skipLabel, 0);

  // Guard 절이 있으면 추가 조건 평가
  if (arm.guard) {
    this.compileExpr(arm.guard);
    const nextLabel = this.chunk.label();
    this.chunk.emit(Op.JMP_IF_FALSE, 0);
    this.chunk.emitI32(nextLabel, 0);
  }

  // Body 실행
  this.compileExpr(arm.body);
}
```

### 2. async/await
```typescript
// Promise 래퍼 간단 예
const promiseValue = {
  _value: actualValue,
  __isPromise: true
};

// await 구현
const promise = stack.pop();
const value = promise._value;
stack.push(value);
```

### 3. 채널
```typescript
// Channel 구현 최소
class Channel {
  queue = [];
  push(value) { this.queue.push(value); }
  pop() { return this.queue.shift(); }
}
```

---

## ✅ 성공 기준

### 각 Task별
```
Task 1: 8/8 테스트 통과
Task 2: 5/5 테스트 통과
Task 3: 7/7 테스트 통과
```

### 최종
```
npm test
→ Tests: 252 passed, 252 total
→ 모든 파일 PASS

git commit -m "feat: Complete Phase 1 (252/252 tests)"
git tag -a v1.0-stable -m "Version 1.0 Stable"
git push --tags
```

---

## 📅 일정

```
Day 1 (지금):
  - 이 문서 작성 ✓
  - 코드 분석 완료
  - 각 Agent에 작업 할당

Day 2-3:
  - 병렬 구현 (7-8시간)
  - 테스트 & 디버깅

Day 4:
  - 통합 테스트
  - 최종 커밋 & 태그
  - v1.0-stable 배포
```

---

## 🆘 트러블슈팅

### 만약 테스트가 실패하면?
```bash
# 1. 최근 변경 확인
git diff

# 2. 빌드 에러 확인
npm run build

# 3. 특정 테스트 실행
npm test -- pattern-matching-jest.test.ts -t "T1"

# 4. 디버그 출력 추가
console.log("Debug:", value);

# 5. 되돌리기
git checkout -- src/compiler.ts
```

### 병렬 구현 충돌 방지
```
각 Agent가 다른 파일 수정:
- Agent 1: src/compiler.ts (패턴 매칭)
- Agent 2: src/checker.ts + src/compiler.ts (async)
- Agent 3: src/vm.ts (채널)

⚠️ Agent 2는 src/compiler.ts에서 async 섹션만 수정
   Agent 1의 패턴 매칭 섹션과 겹치지 않도록 주의
```

---

**다음 단계:** 각 Agent 시작
**예상 완료:** 2026-04-13 (v1.0-stable)
