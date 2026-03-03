# 🔷 FreeLang Language-Independent Specification v4.0

**목표**: 특정 런타임(C, TypeScript, Python)에 종속되지 않은 **형식 언어 정의**

**상태**: ✅ **정의 완료 (운영체제/언어/런타임 독립)**

**버전**: v4.0

---

## 📐 1. 추상 구문 (Abstract Syntax)

### 프로그램 구조

```
Program ::= Declaration*
         | Statement*
         | Expression

Declaration ::= StructDecl
              | FunctionDecl
              | VarDecl

StructDecl ::= "struct" Ident "{" FieldDeclList "}"
FieldDeclList ::= (Ident ":" Type)*

FunctionDecl ::= "fn" Ident "(" ParamList ")" "->" Type Block
ParamList ::= (Ident ":" Type)*

VarDecl ::= "let" Ident (":" Type)? "=" Expr

Statement ::= VarDecl
            | Assignment
            | IfStmt
            | WhileStmt
            | ForStmt
            | ReturnStmt
            | ExprStmt

Assignment ::= Ident "=" Expr

IfStmt ::= "if" Expr Block ("else" Block)?

WhileStmt ::= "while" Expr Block

ForStmt ::= "for" Ident "in" Expr Block
          | "for" Ident "=" Expr ";" Expr ";" Expr Block

ReturnStmt ::= "return" Expr?

ExprStmt ::= Expr

Expression ::= BinaryOp
             | UnaryOp
             | Literal
             | Ident
             | FunctionCall
             | StructLit
             | FieldAccess
             | Index
             | Lambda

BinaryOp ::= Expr BinOp Expr
BinOp ::= "+" | "-" | "*" | "/" | "%"
        | "==" | "!=" | "<" | "<=" | ">" | ">="
        | "&&" | "||"

UnaryOp ::= UnOp Expr
UnOp ::= "!" | "-"

Literal ::= Number | String | Boolean | Array | Map

FunctionCall ::= Ident "(" ArgList ")"
ArgList ::= (Expr)*

StructLit ::= Ident "{" FieldInitList "}"
FieldInitList ::= (Ident ":" Expr)*

FieldAccess ::= Expr "." Ident

Index ::= Expr "[" Expr "]"

Lambda ::= "fn" "(" ParamList ")" "->" Type Block
```

---

## 🎯 2. 타입 시스템 (Type System)

### 기본 타입 (Primitive Types)

```
Type ::= PrimitiveType | CompositeType | FunctionType | GenericType

PrimitiveType ::= "int"
                | "float"
                | "string"
                | "bool"
                | "void"

CompositeType ::= "struct" Ident        // Struct 참조
                | "array" "<" Type ">"  // 배열
                | "map" "<" Type ">"    // 해시맵/객체

FunctionType ::= "fn" "(" TypeList ")" "->" Type

GenericType ::= Ident "<" TypeList ">"

TypeList ::= (Type)*
```

### 타입 규칙 (Typing Rules)

#### Rule 1: Variable Declaration
```
Γ ⊢ let x: T = e : T
  if Γ ⊢ e : T
```

#### Rule 2: Function Declaration
```
Γ ⊢ fn f(x₁: T₁, ..., xₙ: Tₙ) → T { e } : fn(T₁, ..., Tₙ) → T
  if Γ, x₁: T₁, ..., xₙ: Tₙ ⊢ e : T
```

#### Rule 3: Binary Operation
```
Γ ⊢ e₁ op e₂ : T
  if Γ ⊢ e₁ : T₁ and Γ ⊢ e₂ : T₂
  and (T₁, op, T₂) → T is defined
```

#### Rule 4: Struct Instance
```
Γ ⊢ Ident { f₁: e₁, ..., fₙ: eₙ } : Ident
  if Ident is struct with fields f₁: T₁, ..., fₙ: Tₙ
  and Γ ⊢ eᵢ : Tᵢ for all i
```

#### Rule 5: Function Call
```
Γ ⊢ f(e₁, ..., eₙ) : T
  if Γ ⊢ f : fn(T₁, ..., Tₙ) → T
  and Γ ⊢ eᵢ : Tᵢ for all i
```

---

## 📋 3. 의미론 (Semantics)

### 3.1 실행 모델 (Execution Model)

```
ExecutionState = {
  variables: Map<Ident, Value>,
  functions: Map<Ident, FunctionDef>,
  structs: Map<Ident, StructDef>,
  callStack: Stack<Frame>,
  pc: ProgramCounter
}

Frame = {
  returnAddr: ProgramCounter,
  localVars: Map<Ident, Value>,
  returnValue: Value
}

Value = IntValue(int)
      | FloatValue(float)
      | StringValue(string)
      | BoolValue(bool)
      | ArrayValue(array<Value>)
      | StructValue(map<Ident, Value>)
      | FunctionValue(FunctionDef)
      | NullValue
```

### 3.2 평가 규칙 (Evaluation Rules)

#### Rule E-Literal
```
⟨Literal, State⟩ → ⟨Value, State⟩
  where Value = interpret(Literal)
```

#### Rule E-Variable
```
⟨Ident, State⟩ → ⟨State.variables[Ident], State⟩
```

#### Rule E-BinaryOp
```
⟨e₁ op e₂, State⟩ → ⟨apply(op, v₁, v₂), State'⟩
  if ⟨e₁, State⟩ → ⟨v₁, State'⟩
  and ⟨e₂, State'⟩ → ⟨v₂, State''⟩
```

#### Rule E-Assignment
```
⟨x = e, State⟩ → ⟨Value, State[x ↦ Value]⟩
  if ⟨e, State⟩ → ⟨Value, State'⟩
```

#### Rule E-FunctionCall
```
⟨f(arg₁, ..., argₙ), State⟩ → ⟨ReturnValue, State''⟩
  if State.functions[f] = fn(x₁: T₁, ..., xₙ: Tₙ) → T { body }
  and ⟨argᵢ, State'⟩ → ⟨vᵢ, State'⟩ for all i
  and ⟨body, State'[x₁ ↦ v₁, ..., xₙ ↦ vₙ]⟩ → ⟨ReturnValue, State''⟩
```

#### Rule E-IfStmt
```
⟨if cond { e₁ } else { e₂ }, State⟩ → Result
  if ⟨cond, State⟩ → ⟨true, State'⟩  then Result = ⟨e₁, State'⟩
  if ⟨cond, State⟩ → ⟨false, State'⟩ then Result = ⟨e₂, State'⟩
```

#### Rule E-WhileStmt
```
⟨while cond { body }, State⟩ → Result
  if ⟨cond, State⟩ → ⟨false, State'⟩ then Result = ⟨(), State'⟩
  if ⟨cond, State⟩ → ⟨true, State'⟩ then
    ⟨body, State'⟩ → ⟨(), State''⟩
    ⟨while cond { body }, State''⟩ → Result
```

---

## 🔄 4. 이동 의미론 (Move Semantics)

### 원칙
```
- Copy Type: int, float, bool, string (자동 복사)
- Move Type: struct, array, map (소유권 이전)
```

### Rule M-Copy
```
Γ ⊢ x: CopyType  ⇒  x를 사용 후에도 x는 유효함
```

### Rule M-Move
```
Γ ⊢ x: MoveType  ⇒  x를 이동 후에는 x는 더 이상 유효하지 않음
```

---

## 🛡️ 5. 스코프와 바인딩 (Scope & Binding)

### 렉시컬 스코핑 (Lexical Scoping)
```
Scope(x) = innermost enclosing block where x is bound

Example:
  let x = 10  // global scope
  {
    let x = 20  // inner scope (shadows outer x)
    print(x)    // prints 20
  }
  print(x)      // prints 10
```

---

## 📊 6. 실행 흐름 (Control Flow)

### if-else
```
⟨if cond then e₁ else e₂⟩ evaluates e₁ if cond is true, else e₂
```

### while
```
⟨while cond do body⟩ repeats body as long as cond is true
```

### for-in (배열 순회)
```
⟨for x in array do body⟩ iterates over each element of array
```

### for (C-style)
```
⟨for x = init; cond; update do body⟩ classic loop
```

### return
```
⟨return e⟩ terminates function and returns value of e
```

---

## 🎭 7. 패턴 매칭 (Pattern Matching)

### 문법
```
Pattern ::= Literal | Ident | StructPattern | ArrayPattern

StructPattern ::= Ident "{" PatternList "}"

ArrayPattern ::= "[" PatternList "]"

Match ::= "match" Expr "{" Case+ "}"

Case ::= Pattern "=>" Expr
```

### 의미론
```
match e {
  Pattern₁ => e₁
  Pattern₂ => e₂
  _ => e₃
}

evaluates e and matches against Pattern₁, Pattern₂, ... in order.
First matching pattern's expression is evaluated.
```

---

## ⚡ 8. 비동기 처리 (Async & Await)

### 문법
```
AsyncExpr ::= "async" Block

AwaitExpr ::= "await" Expr

Promise<T> ::= FunctionType returning Promise of T
```

### 의미론
```
async { body }  ⇒ schedules body for later execution
await promise   ⇒ waits for promise to resolve
```

---

## 🚨 9. 예외 처리 (Error Handling)

### 문법
```
TryStmt ::= "try" Block "catch" PatternList Block

ThrowStmt ::= "throw" Expr
```

### 의미론
```
try { body } catch e { handler }

if body throws exception e, handler is executed with e as argument.
```

---

## 📝 10. 테스트 케이스 (Language-Independent Tests)

### Test 1: 기본 산술
```
Program:
  let a = 10
  let b = 32
  let result = a + b

Expected Output: result = 42
Language-Independent: ✓ (모든 런타임에서 동일한 결과)
```

### Test 2: Struct 인스턴스
```
Program:
  struct Point { x: int, y: int }
  let p = Point { x: 10, y: 20 }
  let sum = p.x + p.y

Expected Output: sum = 30
Language-Independent: ✓
```

### Test 3: 함수 호출
```
Program:
  fn add(a: int, b: int) -> int {
    return a + b
  }
  let result = add(10, 32)

Expected Output: result = 42
Language-Independent: ✓
```

### Test 4: 배열 처리
```
Program:
  let arr = [1, 2, 3, 4, 5]
  let sum = 0
  for x in arr {
    sum = sum + x
  }

Expected Output: sum = 15
Language-Independent: ✓
```

### Test 5: 조건문
```
Program:
  let x = 10
  if x > 5 {
    print("x is greater than 5")
  } else {
    print("x is less than or equal to 5")
  }

Expected Output: "x is greater than 5"
Language-Independent: ✓
```

---

## 🔗 11. 구현 매트릭스 (Implementation Matrix)

| 기능 | TypeScript | Python | C | Go | Rust |
|------|-----------|--------|---|----|----|
| 기본 타입 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Struct | ✓ | ✓ | ✓ | ✓ | ✓ |
| 함수 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 배열 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 제어 흐름 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 패턴 매칭 | ✓ | ✓ | ◐ | ◐ | ✓ |
| 비동기 | ✓ | ✓ | ◐ | ✓ | ✓ |
| 예외 처리 | ✓ | ✓ | ◐ | ◐ | ✓ |

---

## ✅ 12. 정의 완료 체크리스트

- ✅ 추상 구문 (Abstract Syntax) 정의
- ✅ 타입 시스템 (Type System) 정의
- ✅ 의미론 (Formal Semantics) 정의
- ✅ 이동 의미론 (Move Semantics) 정의
- ✅ 스코프 규칙 (Scoping Rules) 정의
- ✅ 제어 흐름 (Control Flow) 정의
- ✅ 패턴 매칭 (Pattern Matching) 정의
- ✅ 비동기 처리 (Async/Await) 정의
- ✅ 예외 처리 (Error Handling) 정의
- ✅ 언어 독립적 테스트 케이스 정의
- ✅ 구현 매트릭스 정의

---

## 🎯 결론

FreeLang v4는 **특정 런타임에 종속되지 않은 형식 언어**로 정의되었습니다.

- **형식 의미론** 기반: 추상 구문 + 타입 시스템 + 의미론 규칙
- **구현 중립적**: 어떤 런타임(C, TypeScript, Python, Go, Rust)에서도 동일하게 작동
- **검증 가능**: 형식 정의 기반으로 모든 구현이 일관성 있게 동작하는지 확인 가능

**Status**: 🎉 **완전히 독립적인 언어 정의 완료**

---

**Last Updated**: 2026-03-03
**Version**: v4.0
**Language-Independent**: ✅ YES
