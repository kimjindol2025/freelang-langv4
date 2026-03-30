# 미완성 기능 구현 로드맵

**작성일:** 2026-03-30
**버전:** v1.0-beta
**총 예상 시간:** 100-140시간

---

## 📋 목차

1. [즉시 구현 (Phase 1 - 1주)](#phase-1)
2. [단기 구현 (Phase 2 - 2주)](#phase-2)
3. [중기 구현 (Phase 3 - 1개월)](#phase-3)
4. [장기 구현 (Phase 4 - v2.0)](#phase-4)

---

## Phase 1: 즉시 구현 (1주 = 7-8시간)

### 1️⃣ 패턴 매칭 컴파일 완성

**상태:** Compiler 구현 50%
**테스트:** 0/8 → 8/8
**시간:** 2-3시간
**필요성:** ⭐⭐⭐⭐⭐

#### 문제점
```typescript
// src/pattern-matching-jest.test.ts T1
match x {
  y if y > 5 => 100,  // Guard 절 조건이 컴파일되지 않음
  _ => 0,
}
```

#### 구현 단계

**1단계: Guard 절 컴파일** (1시간)
```typescript
// src/compiler.ts: compileMatchStmt()

// 현재 (불완전):
for (const arm of stmt.arms) {
  this.compilePatternTest(arm.pattern, subject);
  // guard 절이 없음!
}

// 수정안:
for (const arm of stmt.arms) {
  this.compilePatternTest(arm.pattern, subject);

  // Guard 절 평가
  if (arm.guard) {
    this.compileExpr(arm.guard);  // 조건 평가
    const skipLabel = this.chunk.label();
    this.chunk.emit(Op.JMP_IF_FALSE, 0);  // 조건이 false면 다음 arm으로
    this.chunk.emitI32(skipLabel, 0);
  }

  // Body 실행
  this.compileExpr(arm.body);
}
```

**2단계: 구조 분해 실행** (1시간)
```typescript
// src/compiler.ts: compilePatternTest()

// 현재: 패턴 테스트만, 바인딩 없음
case "struct": {
  // 구조체 필드 매칭만
  break;
}

// 수정안: 바인딩도 처리
case "struct": {
  // 1. 구조체 타입 검사
  // 2. 필드 추출 및 로컬 변수 바인딩
  for (const field of pattern.fields) {
    this.declareLocal(field.pattern.name);
    // 필드값을 스택에 push
  }
  break;
}
```

**3단계: 테스트** (30분)
```bash
npm test -- pattern-matching-jest.test.ts
# T1-T8 모두 통과 확인
```

---

### 2️⃣ async/await Promise 완성

**상태:** Checker 구현 80%, Compiler 20%
**테스트:** 1/5 → 5/5
**시간:** 2-3시간
**필요성:** ⭐⭐⭐⭐

#### 문제점
```typescript
async fn getValue(): Promise<i32> {
  return 42  // Promise로 감싸지지 않음
}

async fn caller(): Promise<i32> {
  let result = await getValue()  // await이 동작하지 않음
  return result
}
```

#### 구현 단계

**1단계: Promise 런타임 래퍼** (1시간)
```typescript
// src/checker.ts: checkFnDecl()

// async fn은 반환값을 Promise<T>로 감싸기
if (stmt.isAsync) {
  returnType = { kind: "promise", element: returnType };
}

// 컴파일러에서:
// return 42; → return Promise.resolve(42);
```

**2단계: await 구현** (1시간)
```typescript
// src/compiler.ts: compileExpr()

case "await": {
  // Promise 값 평가
  this.pushIrValue(expr.expr);

  // Promise.value 추출
  this.chunk.emit(Op.FIELD_GET, 0);
  this.chunk.emitStr("_value", 0);

  break;
}
```

**3단계: async 함수 호출** (30분)
```typescript
// Promise 반환 함수 호출 처리
// 일단 동기로 처리 (나중에 이벤트 루프 추가 가능)
```

---

### 3️⃣ 채널/Actor 런타임 완성

**상태:** Parser/Checker 100%, VM 이슈
**테스트:** 2/7 → 7/7
**시간:** 2-3시간
**필요성:** ⭐⭐⭐⭐

#### 문제점
```typescript
var ch = channel<i32>();

spawn {
  ch <- 42;  // "panic: send on non-channel"
}

var x = <- ch;
```

#### 구현 단계

**1단계: 채널 변수 스코핑** (1시간)
```typescript
// src/checker.ts: checkSpawnStmt()

// 현재 (잘못됨):
const prevScope = this.scope;
this.scope = new Scope(null);  // 독립 스코프 → ch 접근 불가
for (const s of stmt.body) this.checkStmt(s);
this.scope = prevScope;

// 수정안 (이미 적용됨):
const prevScope = this.scope;
this.scope = new Scope(prevScope);  // 부모 스코프 유지
for (const s of stmt.body) this.checkStmt(s);
this.scope = prevScope;
```

**2단계: VM 채널 구현** (1시간)
```typescript
// src/vm.ts: 채널 데이터 구조

class Channel {
  elementType: Type;
  queue: Value[] = [];
  waitingReceivers: ((value: Value) => void)[] = [];
}

// Op.CHAN_SEND 구현
case Op.CHAN_SEND: {
  const chan = this.pop() as Channel;
  const value = this.pop();

  if (!chan || !Array.isArray(chan.queue)) {
    throw new Error("panic: send on non-channel");
  }

  chan.queue.push(value);
  break;
}
```

**3단계: 라운드로빈 스케줄링** (30분)
```typescript
// VM의 Actor 스케줄러 개선
// 모든 spawn된 actor를 공평하게 실행
```

---

## Phase 2: 단기 구현 (2주 = 16시간)

### 4️⃣ 고급 제네릭 (Trait Bounds)

**상태:** 기본 제네릭 100%, 고급 기능 0%
**예상 시간:** 8시간
**필요성:** ⭐⭐⭐⭐

#### 목표
```freelang
// Trait bound
fn print_all<T: Debug>(items: Array<T>) -> void {
  for item in items {
    println(debug(item))
  }
}

// 여러 bounds
fn find<T: Eq + Clone>(arr: Array<T>, target: T) -> Option<i32> {
  // T는 Eq와 Clone을 구현해야 함
}

// Associated types
trait Iterator {
  type Item;
  fn next(self) -> Option<Self::Item>;
}
```

#### 구현 단계

**1단계: Trait Bound 파싱** (2시간)
```typescript
// src/parser.ts: parseType()

// fn print_all<T: Debug>(...)
const typeParams: string[] = [];
if (this.match(TokenType.LT)) {
  do {
    const name = this.expectIdent("type param");
    const bounds: string[] = [];

    if (this.match(TokenType.COLON)) {
      do {
        bounds.push(this.expectIdent("trait name"));
      } while (this.match(TokenType.PLUS));
    }

    typeParams.push({ name, bounds });
  } while (this.match(TokenType.COMMA));
  this.expect(TokenType.GT);
}
```

**2단계: Trait Bound 검증** (3시간)
```typescript
// src/checker.ts: checkFnDecl()

// 제네릭 함수 호출 시 bounds 검사
for (const bound of typeParam.bounds) {
  if (!this.traits.has(bound)) {
    this.error(`trait '${bound}' not found`);
  }
  // 실제 타입이 bound를 구현하는지 확인
}
```

**3단계: Associated Types** (3시간)
```typescript
// src/ast.ts: trait_decl 확장

type TraitMethod = {
  name: string;
  params: Param[];
  returnType: TypeAnnotation;
  associatedTypes?: string[];  // 새로 추가
};

// 사용:
trait Iterator {
  type Item;  // 이 부분 파싱
}
```

---

### 5️⃣ 동적 디스패치 (Virtual Methods)

**상태:** 정적 디스패치 100%, 동적 0%
**예상 시간:** 5시간
**필요성:** ⭐⭐⭐

#### 목표
```freelang
trait Shape {
  fn area(self) -> f64;
}

var shapes: Array<dyn Shape> = [
  Circle { radius: 5.0 },
  Square { side: 4.0 },
];

for shape in shapes {
  println(shape.area())  // 런타임에 메서드 결정
}
```

#### 구현 단계

**1단계: dyn Trait 타입** (1시간)
```typescript
// src/ast.ts: TypeAnnotation 확장

export type TypeAnnotation =
  | ...
  | { kind: "dyn_trait"; name: string }  // new
```

**2단계: vtable 구현** (3시간)
```typescript
// src/compiler.ts: 새 섹션

class VirtualMethodTable {
  traitName: string;
  methods: Map<string, number> = new Map();  // 메서드명 → 오프셋
}

// dyn Shape 타입의 값:
// [type_id: i32, vtable: VirtualMethodTable, data: ...]
```

**3단계: 동적 호출** (1시간)
```typescript
// src/compiler.ts: compileFieldAccess()

case "dyn_trait": {
  // vtable에서 메서드 주소 조회
  // 동적으로 호출
  this.chunk.emit(Op.CALL_VIRTUAL, 0);
  this.chunk.emitI32(methodOffset, 0);
}
```

---

## Phase 3: 중기 구현 (1개월 = 40시간)

### 6️⃣ 표준 라이브러리

**예상 시간:** 20시간
**필요성:** ⭐⭐⭐⭐⭐

#### 핵심 모듈
```
std::iter       Iterator, Map, Filter, Collect
std::option     Option<T>, Some, None, unwrap, is_some
std::result     Result<T, E>, Ok, Err
std::vec        Vec<T>, push, pop, len
std::string     String, concat, split, contains
std::io         println, print, input
std::fs         read, write, open, close
std::math       abs, pow, sqrt, min, max
```

#### 구현 방식
```typescript
// src/stdlib.ts 생성

export const stdlib = {
  "std::io": {
    println: (value: any) => console.log(value),
    input: () => readline(),
  },
  "std::vec": {
    push: (vec: any[], item: any) => vec.push(item),
    pop: (vec: any[]) => vec.pop(),
  },
  // ...
};
```

---

### 7️⃣ 매크로 시스템

**예상 시간:** 12시간
**필요성:** ⭐⭐⭐

#### 간단한 매크로
```freelang
macro vec!($($elem:expr),*) {
  let mut v = [];
  $(v.push($elem);)*
  v
}

// 사용:
var v = vec![1, 2, 3];  // [1, 2, 3]
```

#### 구현 단계

**1단계: 매크로 문법 파싱** (4시간)
```typescript
// src/parser.ts: parseMacro()

// macro name($params) { body }
```

**2단계: 매크로 전개 (expansion)** (5시간)
```typescript
// src/compiler.ts: expandMacro()

// 호출 시점에 템플릿 인스턴싱
```

**3단계: 테스트** (3시간)

---

## Phase 4: 장기 구현 (v2.0 = 60시간+)

### 8️⃣ 메모리 관리 (Ownership System)

**예상 시간:** 30시간
**필요성:** ⭐⭐⭐⭐

#### 개요
```freelang
// Ownership
var s = "hello";
var s2 = move s;  // s의 소유권이 s2로 이동
// println(s);  // 컴파일 에러

// Borrowing
fn read(s: &string) { ... }  // 불변 참조
fn modify(s: &mut string) { ... }  // 가변 참조

var s = "hello";
read(&s);  // 참조로 차용
```

#### 구현 난점
- 수명(lifetime) 추적
- 차용 검사 알고리즘
- 무브 시맨틱스

---

### 9️⃣ FFI (C 상호운용성)

**예상 시간:** 30시간
**필요성:** ⭐⭐⭐

#### 개요
```freelang
extern fn strlen(s: *const u8) -> usize;
extern fn malloc(size: usize) -> *mut void;

var ptr = malloc(1024);
```

#### 구현 필요
- LLVM 또는 네이티브 코드 생성기
- 포인터 타입 시스템
- 타입 레이아웃 정확성

---

## 📊 구현 우선순위 표

| 우선순위 | 기능 | Phase | 시간 | 난이도 | 필요성 |
|---------|------|-------|------|--------|--------|
| 1 | 패턴 매칭 컴파일 | 1 | 2-3h | 🟡 중 | ⭐⭐⭐⭐⭐ |
| 2 | async/await Promise | 1 | 2-3h | 🟡 중 | ⭐⭐⭐⭐ |
| 3 | 채널 런타임 | 1 | 2-3h | 🟡 중 | ⭐⭐⭐⭐ |
| 4 | Trait bounds | 2 | 8h | 🔴 높 | ⭐⭐⭐⭐ |
| 5 | 동적 디스패치 | 2 | 5h | 🔴 높 | ⭐⭐⭐ |
| 6 | 표준 라이브러리 | 3 | 20h | 🟡 중 | ⭐⭐⭐⭐⭐ |
| 7 | 매크로 시스템 | 3 | 12h | 🔴 높 | ⭐⭐⭐ |
| 8 | 메모리 관리 | 4 | 30h | 🔴🔴 매우높 | ⭐⭐⭐⭐ |
| 9 | FFI | 4 | 30h | 🔴🔴 매우높 | ⭐⭐⭐ |

---

## 🎯 마일스톤

```
✅ v1.0-beta (현재 2026-03-30)
   - 233/252 테스트 통과
   - 기본 기능 완성

📍 v1.0-stable (목표: 2026-04-13, 2주)
   - Phase 1 완료 (7-8시간)
   - 252/252 테스트 통과
   - 완전한 패턴 매칭 & async/await

📍 v1.1-release (목표: 2026-05-11, 1개월)
   - Phase 2 완료 (16시간)
   - Trait bounds & 동적 디스패치
   - 프로덕션 준비 완료

📍 v1.5-enhanced (목표: 2026-06-08, 2개월)
   - Phase 3 완료 (40시간)
   - 표준 라이브러리 & 매크로
   - 대규모 프로젝트 가능

📍 v2.0-advanced (목표: 2026-09-08, 6개월)
   - Phase 4 완료 (60시간)
   - 메모리 관리 & FFI
   - 시스템 프로그래밍 가능
```

---

## 💡 실행 전략

### 병렬 구현 (Parallel Implementation)
```
Week 1 (Phase 1):
  Agent 1: 패턴 매칭 (2-3h)
  Agent 2: async/await (2-3h)
  Agent 3: 채널 런타임 (2-3h)
  → 합계: 7-8시간 (1주)
```

### 순차 구현 (Sequential)
```
Phase 1: 패턴 매칭 → async/await → 채널 (3주)
Phase 2: Trait bounds → 동적 디스패치 (2주)
Phase 3: 표준 라이브러리 & 매크로 (4주)
Phase 4: 메모리 관리 & FFI (8주+)
```

---

## ✅ 체크리스트

### Phase 1
- [ ] Guard 절 컴파일 구현
- [ ] Promise 런타임 래퍼 구현
- [ ] await 식 처리
- [ ] 채널 변수 스코핑 수정
- [ ] VM 채널 구현
- [ ] 모든 테스트 통과 (252/252)
- [ ] v1.0-stable 태그 생성

### Phase 2
- [ ] Trait bound 파싱
- [ ] Trait bound 검증
- [ ] Associated types 파싱
- [ ] dyn Trait 타입 추가
- [ ] vtable 구현
- [ ] 동적 메서드 호출

### Phase 3
- [ ] 표준 라이브러리 (io, vec, string, etc)
- [ ] 매크로 문법 파싱
- [ ] 매크로 전개 엔진
- [ ] 매크로 테스트

### Phase 4
- [ ] 소유권 시스템
- [ ] 차용 검사기
- [ ] 수명 추적
- [ ] LLVM 통합
- [ ] 포인터 타입
- [ ] C 함수 바인딩

---

**마지막 업데이트:** 2026-03-30
**다음 검토:** Phase 1 완료 후 (2026-04-13)
