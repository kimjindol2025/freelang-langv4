# 🔧 FreeLang v4 제네릭(Generic) 구현 계획서

**예상 시간**: 4주 | **난이도**: 중상 (7/10)

**전략**: Monomorphization (컴파일 시점 코드 특화)

---

## 1. 현재 상태 분석

### ✅ 이미 구현된 부분 (AST 기초)

**AST (ast.ts)**
```typescript
| { kind: "type_param"; name: string }
| { kind: "generic_ref"; name: string; typeArgs: TypeAnnotation[] }
```

**함수/구조체 정의**
```typescript
{ kind: "fn_decl"; ... typeParams: string[]; ... }
{ kind: "struct_decl"; ... typeParams: string[]; ... }
```

### ❌ 미완성 부분

- 파서: `<T>` 문법 파싱 미확인
- 타입 검증: 타입 치환 로직 미완성
- 인스턴스화: Monomorphization 미구현
- 컴파일: 제네릭 코드 생성 미구현

---

## 2. 제네릭 문법 설계

### 함수 제네릭
```freeLang
fn identity<T>(x: T) -> T { x }
fn swap<T, U>(a: T, b: U) -> [T, U] { [a, b] }

// 사용
let x: i32 = identity<i32>(42)
let result = swap<i32, f64>(10, 3.14)
```

### 구조체 제네릭
```freeLang
struct Box<T> { value: T }
struct Pair<T, U> { first: T; second: U }

// 사용
let box_int: Box<i32> = { value: 42 }
let pair: Pair<i32, string> = { first: 10; second: "hello" }
```

### 배열 제네릭
```freeLang
fn getFirst<T>(arr: [T]) -> T { arr[0] }
let nums = [1, 2, 3]
let first: i32 = getFirst<i32>(nums)
```

---

## 3. 구현 전략: Monomorphization

### 선택 이유
1. **성능 최적**: 각 타입마다 최적화된 코드 생성
2. **타입 안전**: 컴파일 타임에 모든 타입 검증
3. **호환성**: 기존 컴파일러 구조와 자연스러운 통합
4. **예측성**: 성능 최적화가 명확함

### 실행 흐름
```
제네릭 정의 등록
        ↓
사용 지점: 구체적 타입 검증
        ↓
타입 체커: 인스턴스화 (예: identity<i32>, identity<f64>)
        ↓
컴파일러: 각 인스턴스마다 바이트코드 생성
```

---

## 4. 상세 구현 계획

### Phase 1: 기초 구축 (1주)

#### TypeChecker에 제네릭 환경 추가

```typescript
// checker.ts에 추가

type GenericFnDef = {
  name: string;
  typeParams: string[];
  params: Param[];
  returnType: TypeAnnotation;
  body: Stmt[];
};

type GenericStructDef = {
  name: string;
  typeParams: string[];
  fields: StructField[];
};

class TypeChecker {
  private genericFunctions: Map<string, GenericFnDef> = new Map();
  private genericStructs: Map<string, GenericStructDef> = new Map();
  private instantiatedFunctions: Map<string, Type> = new Map();
  private instantiatedStructs: Map<string, Type> = new Map();
}
```

#### Type Substitution 함수

```typescript
function substituteType(t: Type, bindings: Map<string, Type>): Type {
  if (t.kind === "type_param") {
    return bindings.get(t.name) ?? t;
  }
  if (t.kind === "array") {
    return { kind: "array", element: substituteType(t.element, bindings) };
  }
  if (t.kind === "fn") {
    return {
      kind: "fn",
      params: t.params.map(p => substituteType(p, bindings)),
      returnType: substituteType(t.returnType, bindings),
    };
  }
  return t;
}
```

### Phase 2: 파서 수정 (1주)

#### 타입 파라미터 파싱

```typescript
// parser.ts에 추가

private parseTypeParams(): string[] {
  if (!this.match(TokenType.LT)) return [];

  const params: string[] = [];
  do {
    if (this.peek().type !== TokenType.IDENT) {
      throw this.error("expect type parameter name");
    }
    params.push(this.advance().value);
  } while (this.match(TokenType.COMMA));

  this.consume(TokenType.GT, "expect '>'");
  return params;
}
```

#### 함수/구조체 선언 수정

```typescript
private parseFnDecl(): Stmt {
  this.consume(TokenType.FN, "expect 'fn'");
  const name = this.consumeIdent();
  const typeParams = this.parseTypeParams();  // 새로 추가
  // ... 나머지 (기존과 동일)
}
```

#### 타입 표기 제네릭 처리

```typescript
private parseTypeAnnotation(): TypeAnnotation {
  let base = this.parsePrimaryType();

  // 제네릭 타입 인자 처리
  if (this.peek().type === TokenType.LT) {
    const name = (base as any).name;
    const typeArgs: TypeAnnotation[] = [];

    this.advance(); // '<' 소비
    do {
      typeArgs.push(this.parseTypeAnnotation());
    } while (this.match(TokenType.COMMA));
    this.consume(TokenType.GT, "expect '>'");

    return { kind: "generic_ref", name, typeArgs };
  }

  return base;
}
```

### Phase 3: 타입 체커 확장 (1.5주)

#### 함수 호출 시 제네릭 검증

```typescript
case "call": {
  const calleeType = this.checkExpr(expr.callee);

  if (calleeType.kind === "generic_fn") {
    // 타입 인자 추론
    const typeArgs = this.inferTypeArgs(
      calleeType,
      expr.args.map(a => this.checkExpr(a)),
    );

    // 인스턴스화
    const instantiated = this.instantiateFunction(calleeType, typeArgs);

    // 함수 호출 검증
    return this.checkFunctionCall(instantiated, expr.args);
  }

  return this.checkFunctionCall(calleeType, expr.args);
}
```

#### 함수 인스턴스화

```typescript
private instantiateFunction(
  fn: Type & { kind: "generic_fn" },
  typeArgs: Type[],
): Type {
  const bindings = new Map<string, Type>();
  for (let i = 0; i < fn.typeParams.length; i++) {
    bindings.set(fn.typeParams[i], typeArgs[i]);
  }

  return {
    kind: "fn",
    params: fn.params.map(p => substituteType(p, bindings)),
    returnType: substituteType(fn.returnType, bindings),
  };
}
```

#### 구조체 인스턴스화

```typescript
private instantiateStruct(name: string, typeArgs: Type[]): Type {
  const def = this.genericStructs.get(name);
  if (!def) return { kind: "unknown" };

  if (typeArgs.length !== def.typeParams.length) {
    this.error(
      `expected ${def.typeParams.length} type args, got ${typeArgs.length}`,
      0,
      0
    );
    return { kind: "unknown" };
  }

  const bindings = new Map<string, Type>();
  for (let i = 0; i < def.typeParams.length; i++) {
    bindings.set(def.typeParams[i], typeArgs[i]);
  }

  const fields = new Map<string, Type>();
  for (const field of def.fields) {
    const fieldType = annotationToType(field.type, this.structs);
    fields.set(field.name, substituteType(fieldType, bindings));
  }

  return { kind: "struct", fields };
}
```

### Phase 4: 컴파일러 수정 (1주)

#### Name Mangling

```typescript
// compiler.ts에 추가

private mangleFunctionName(baseName: string, fnType: Type): string {
  if (fnType.kind !== "fn") return baseName;

  const argNames = fnType.params
    .map(p => this.typeToMangledName(p))
    .join("_");
  const retName = this.typeToMangledName(fnType.returnType);
  return `${baseName}_${argNames}_${retName}`;
}

private typeToMangledName(t: Type): string {
  switch (t.kind) {
    case "i32": return "i32";
    case "i64": return "i64";
    case "f64": return "f64";
    case "bool": return "bool";
    case "string": return "str";
    case "array": return `arr_${this.typeToMangledName(t.element)}`;
    case "struct": return `struct_${[...t.fields.keys()].join("_")}`;
    default: return "unknown";
  }
}
```

#### 인스턴스화된 함수/구조체 컴파일

```typescript
compile(program: Program, typeChecker: TypeChecker): Bytecode {
  // 인스턴스화된 함수 수집
  const instantiatedFunctions = typeChecker.getInstantiatedFunctions();

  // 각 인스턴스 컴파일
  for (const [name, fnType] of instantiatedFunctions) {
    const mangledName = this.mangleFunctionName(
      name.split("_")[0],  // 원본 이름
      fnType,
    );
    this.compileFunctionInstance(mangledName, fnType);
  }

  // 나머지 컴파일 로직 진행
}
```

---

## 5. 테스트 케이스

### T1: 함수 제네릭 기본
```freeLang
fn identity<T>(x: T) -> T { x }
let a: i32 = identity<i32>(42)
```

### T2: 구조체 제네릭
```freeLang
struct Box<T> { value: T }
let b: Box<i32> = { value: 42 }
```

### T3: 다중 타입 파라미터
```freeLang
fn swap<T, U>(a: T, b: U) -> [T, U] { [a, b] }
let result = swap<i32, f64>(10, 3.14)
```

### T4: 중첩 제네릭
```freeLang
struct Container<T> { value: T }
struct Wrapper<U> { inner: Container<U> }
let w: Wrapper<i32> = { inner: { value: 42 } }
```

### T5: 배열 제네릭
```freeLang
fn getFirst<T>(arr: [T]) -> T { arr[0] }
let nums = [1, 2, 3]
let first: i32 = getFirst<i32>(nums)
```

### T6: 실행
```freeLang
fn identity<T>(x: T) -> T { x }
let a: i32 = identity<i32>(42)
println(str(a))  // 42
```

---

## 6. 파일 변경 요약

| 파일 | 변경 사항 | 라인 수 |
|------|---------|--------|
| src/ast.ts | ✅ 이미 충분 | - |
| src/parser.ts | 타입 파라미터 파싱 | +40 |
| src/checker.ts | 제네릭 검증/인스턴시화 | +120 |
| src/compiler.ts | Name mangling, 컴파일 | +80 |
| 테스트 | 6개 테스트 케이스 | +150 |
| **합계** | | **~390줄** |

---

## ✅ 체크리스트

- [ ] AST 확인 및 필요시 확장
- [ ] Parser 타입 파라미터 추가
- [ ] TypeChecker 제네릭 환경 추가
- [ ] substituteType 함수 구현
- [ ] 함수/구조체 인스턴시화 구현
- [ ] Compiler name mangling 추가
- [ ] 모든 테스트 (T1-T6) 통과
- [ ] 성능 검증 (컴파일 < 100ms)
- [ ] 문서화

---

## 성능 영향

### 컴파일 시간
| 단계 | 현재 | 추가 후 | 증가 |
|------|------|--------|------|
| 파싱 | ~2ms | ~2.5ms | +25% |
| 타입 검사 | ~5ms | ~8ms | +60% |
| 컴파일 | ~10ms | ~15ms | +50% |
| **합계** | ~17ms | ~25ms | +47% |

### 바이트코드 크기
- 제네릭 함수 1개, 인스턴스 1개: ~50B (+20%)
- 제네릭 함수 1개, 인스턴스 5개: ~200B (+100%)

**결론**: Monomorphization 코드 팽창은 예상되나 관리 가능

---

## 향후 확장 (Phase 2+)

### 제약 조건 (Bounds)
```freeLang
fn max<T: Comparable>(a: T, b: T) -> T { ... }
```

### 고차 제네릭 (HRK)
```freeLang
fn apply<T, U>(f: fn<X>(X) -> X, x: T) -> T { ... }
```

### 제네릭 트레이트
```freeLang
trait Container<T> { fn get() -> T }
```

---

**구현 일정**: 4주 (Phase 1-4 순차 진행)
