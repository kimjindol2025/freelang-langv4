# SPEC_12: Pattern Matching (패턴 매칭)

**Version**: 1.0
**Status**: Stable
**Phase**: 8.5
**Date**: 2026-03-03

---

## 목차
1. [개념](#개념)
2. [문법](#문법)
3. [의미론](#의미론)
4. [패턴 종류](#패턴-종류)
5. [타입 규칙](#타입-규칙)
6. [제약](#제약)
7. [예제](#예제)

---

## 개념

**패턴 매칭(Pattern Matching)**은 값이나 구조를 패턴과 비교하여:
- **조건 분기** (여러 조건 중 선택)
- **구조 추출** (데이터 구조에서 필드/요소 추출)
- **구조적 바인딩** (값을 변수로 바인딩)

을 수행하는 메커니즘입니다.

### 핵심 특징
- **선언적**: 매칭할 패턴을 명시적으로 선언
- **안전성**: 모든 경우를 처리하지 않으면 컴파일 오류
- **구조 분해**: 복잡한 구조를 한 번에 분해
- **가독성**: 복잡한 if-else 체인 대체

---

## 문법

### 1. Match 표현식

```
MatchExpr = "match" Expr "with" "{" MatchArm* "}"

MatchArm = Pattern ("if" Guard)? "=>" Expr
```

### 2. 패턴 문법

```
Pattern = Literal
        | Variable
        | Wildcard
        | StructPattern
        | ArrayPattern
        | OptionPattern
        | ResultPattern

Literal = IntLit | FloatLit | StringLit | BoolLit

Variable = IDENT

Wildcard = "_"

StructPattern = IDENT "{" FieldPattern* "}"
FieldPattern = IDENT ":" Pattern

ArrayPattern = "[" Pattern ("," Pattern)* "]"

OptionPattern = "Some" "(" Pattern ")" | "None"

ResultPattern = "Ok" "(" Pattern ")" | "Err" "(" Pattern ")"
```

### 3. Guard (조건 패턴)

```
Guard = Expr  # boolean 반환 표현식
```

---

## 의미론

### 규칙 1: 패턴 매칭 실행 (Pattern Matching)

**입력**: 값 `value`와 패턴 시퀀스 `patterns`
**처리**:
1. 첫 번째 패턴부터 순서대로 `value`와 비교
2. 패턴 매칭 성공:
   - 바인딩된 변수들을 새 스코프에 등록
   - Guard가 있으면 평가 (true → 계속, false → 다음 패턴)
   - 표현식 실행
3. 패턴 매칭 실패:
   - 다음 패턴으로 진행
4. 모든 패턴 실패:
   - **오류**: Inexhaustive pattern match

**출력**: 매칭된 표현식의 값

---

### 규칙 2: 리터럴 패턴 매칭

**입력**: 값 `v`, 리터럴 패턴 `lit`
**처리**:
1. `v == lit` 검사
2. True → 매칭 성공 (바인딩 없음)
3. False → 매칭 실패

**형식**:
```
Match(v, lit) → (success: v == lit)
```

---

### 규칙 3: 변수 패턴 매칭 (구조적 바인딩)

**입력**: 값 `v`, 변수 패턴 `x`
**처리**:
1. 항상 매칭 성공
2. 새 스코프에서 `x ← v` 바인딩
3. `x`의 타입은 `v`의 타입

**형식**:
```
Match(v, x) → (success: true, binding: {x: v})
```

---

### 규칙 4: 와일드카드 패턴 매칭

**입력**: 값 `v`, 와일드카드 `_`
**처리**:
1. 항상 매칭 성공
2. 값 `v`는 무시됨
3. 바인딩 없음

---

### 규칙 5: 구조체 패턴 매칭

**입력**: 구조체 값 `s`, 구조체 패턴 `{f1: p1, f2: p2, ...}`
**처리**:
1. `s`의 타입이 해당 구조체 정의와 일치하는지 확인
2. 각 필드 `fi`에 대해 재귀적으로 `Match(s.fi, pi)` 실행
3. 모든 필드 패턴이 성공 → 전체 매칭 성공
4. 하나라도 실패 → 전체 매칭 실패
5. 모든 바인딩을 수집

**형식**:
```
Match(s: Struct, {f1: p1, f2: p2, ...})
  → success: ∧(Match(s.fi, pi) for all i)
  → bindings: ∪(bindings from Match(s.fi, pi))
```

---

### 규칙 6: 배열 패턴 매칭

**입력**: 배열 `arr`, 배열 패턴 `[p1, p2, ..., pn]`
**처리**:
1. `arr` 길이 == 패턴 길이 확인
2. 각 요소 `arr[i]`에 대해 재귀적으로 `Match(arr[i], pi)` 실행
3. 모든 요소 패턴이 성공 → 전체 매칭 성공

**형식**:
```
Match(arr: [T], [p1, p2, ..., pn])
  → success: len(arr) == n ∧ ∧(Match(arr[i], pi) for i = 0..n-1)
```

---

### 규칙 7: Option 패턴 매칭

**입력**: Option 값 `opt`, Option 패턴 `Some(p)` 또는 `None`
**처리**:

#### Case 1: `Some(p)`
```
if opt == Some(v):
  Match(v, p) → 재귀적 매칭
else:
  매칭 실패
```

#### Case 2: `None`
```
if opt == None:
  매칭 성공 (바인딩 없음)
else:
  매칭 실패
```

---

### 규칙 8: Result 패턴 매칭

**입력**: Result 값 `res`, Result 패턴 `Ok(p)` 또는 `Err(p)`
**처리**: Option과 동일하게 Ok/Err 분기

---

### 규칙 9: Guard 평가

**입력**: 바인딩 환경 `env`, Guard 표현식 `guard`
**처리**:
1. `env` 하에서 `guard` 평가
2. `guard` 타입이 `bool`인지 확인
3. True → 패턴 매칭 성공
4. False → 다음 패턴으로 진행

---

## 패턴 종류

### 1. 리터럴 패턴 (Literal Pattern)

```freelang
match x with
  0 => "zero"
  1 => "one"
  42 => "answer"
```

**동작**: 값이 정확히 리터럴과 같을 때만 매칭

---

### 2. 변수 패턴 (Variable Pattern)

```freelang
match value with
  x => x + 10  # value를 x로 바인딩
```

**동작**: 항상 성공, 값을 변수로 바인딩

---

### 3. 와일드카드 패턴 (Wildcard Pattern)

```freelang
match value with
  0 => "zero"
  _ => "non-zero"  # 모든 다른 값
```

**동작**: 항상 성공, 값은 무시

---

### 4. 구조체 패턴 (Struct Pattern)

```freelang
struct Point { x: f64, y: f64 }

match point with
  {x: 0, y: 0} => "origin"
  {x: 0, y: y} => "y-axis at " + str(y)
  {x: x, y: y} => "point at (" + str(x) + ", " + str(y) + ")"
```

**동작**: 구조체의 필드를 패턴으로 매칭, 중첩 가능

---

### 5. 배열 패턴 (Array Pattern)

```freelang
match arr with
  [1, 2, 3] => "exact match"
  [a, b] => "two elements: " + str(a) + ", " + str(b)
  [head, ...rest] => "head-tail (나중에 지원)"
```

**동작**: 배열 길이와 요소를 패턴으로 매칭

---

### 6. Option 패턴 (Option Pattern)

```freelang
match opt_val with
  Some(x) => "value: " + str(x)
  None => "no value"
```

**동작**: Option 값의 Some/None 분기

---

### 7. Result 패턴 (Result Pattern)

```freelang
match result with
  Ok(v) => "success: " + str(v)
  Err(e) => "error: " + e.message
```

**동작**: Result 값의 Ok/Err 분기

---

### 8. Guard 패턴 (Guard Pattern)

```freelang
match n with
  x if x > 0 => "positive"
  x if x < 0 => "negative"
  x if x == 0 => "zero"
```

**동작**: 패턴 매칭 후 추가 조건 평가

---

## 타입 규칙

### T-MatchExpr (Match 표현식)

```
⊢ value: Type_V
Pattern_i ⊢ Type_V: Type_P (all patterns match Type_V)
⊢ expr_i: Type_R (all expressions return same type)

⊢ match value with { pattern_1 => expr_1, ..., pattern_n => expr_n }: Type_R
```

**제약**:
1. 모든 패턴이 `Type_V`와 호환
2. 모든 표현식이 동일한 반환 타입
3. 패턴이 exhaustive (모든 경우 포함)

### T-StructPattern (구조체 패턴)

```
s: Struct S { f1: T1, f2: T2, ... }
⊢ pattern_i: T_i (for each field)

⊢ {f1: pattern_1, f2: pattern_2, ...}: S
```

### T-ArrayPattern (배열 패턴)

```
arr: [T]
⊢ pattern_i: T (for each position)

⊢ [pattern_1, pattern_2, ..., pattern_n]: [T]
```

---

## 제약

### C1. Exhaustive Pattern Matching

```freelang
match n with
  0 => "zero"
  1 => "one"
  // ❌ 오류: 2 이상의 값이 처리되지 않음
```

**규칙**: 모든 가능한 값이 처리되어야 함

---

### C2. 패턴 순서

```freelang
match x with
  5 => "five"
  x => "other"  // x는 5도 매칭 (첫 번째가 우선)
  5 => "never"  // ❌ 도달 불가능 (unreachable)
```

**규칙**: 먼저 나온 패턴이 우선

---

### C3. 필드 이름 일치

```freelang
struct Point { x: f64, y: f64 }
match point with
  {x: a, z: b} => ...  // ❌ 오류: z 필드 없음
```

**규칙**: 구조체 패턴의 필드명이 정의와 일치해야 함

---

### C4. 배열 길이 일치

```freelang
match arr with
  [a, b, c] => ...  // arr 길이 != 3이면 매칭 불가
```

**규칙**: 배열 패턴 길이가 값 배열 길이와 정확히 일치

---

### C5. Guard 타입은 bool

```freelang
match x with
  y if y > 0 => ...    // ✓ OK: bool
  z if z + 1 => ...    // ❌ 오류: i32는 bool 아님
```

**규칙**: Guard 표현식은 반드시 `bool` 타입

---

## 예제

### 예제 1: 포인트 분류

**의도**: 2D 포인트를 위치에 따라 분류

```freelang
struct Point { x: f64, y: f64 }

var classify = fn(p: Point) -> string {
  match p with
    {x: 0, y: 0} => "origin"
    {x: 0, y: _} => "y-axis"
    {x: _, y: 0} => "x-axis"
    {x: x, y: y} if x > 0 && y > 0 => "quadrant I"
    {x: x, y: y} if x < 0 && y > 0 => "quadrant II"
    {x: x, y: y} if x < 0 && y < 0 => "quadrant III"
    {x: x, y: y} if x > 0 && y < 0 => "quadrant IV"
}
```

**의미론**:
- 정확한 원점 확인 → "origin"
- 한 축이 0 → "축 위"
- Guard로 사분면 판정

**타입**:
- 입력: `Point`
- 출력: `string`
- 모든 경우 처리됨 ✓

---

### 예제 2: 배열 패턴

```freelang
var analyze = fn(arr: [i32]) -> string {
  match arr with
    [] => "empty"
    [x] => "single: " + str(x)
    [x, y] => "pair: " + str(x) + ", " + str(y)
    [x, y, z] => "triple: " + str(x) + ", " + str(y) + ", " + str(z)
    _ => "many elements"
}
```

**동작**:
- `[]` → "empty"
- `[5]` → "single: 5"
- `[1, 2]` → "pair: 1, 2"
- 4개 이상 → "many elements"

---

### 예제 3: Option + Result + Struct

```freelang
struct User { id: i32, name: string }

var process = fn(res: Result<Option<User>, string>) -> string {
  match res with
    Ok(Some({id: id, name: name})) => "user: " + name
    Ok(None) => "no user"
    Err(msg) => "error: " + msg
}
```

**의미론**: 중첩된 구조를 한 번에 분해

---

## 상호 참조

- **SPEC_08**: 스코프 관리 (패턴 바인딩의 스코프)
- **SPEC_09**: Struct (구조체 패턴)
- **SPEC_11**: for...of (배열 순회와의 관계)

---

## 변경 이력

| 버전 | 날짜        | 변경사항        |
|------|-----------|-------------|
| 1.0  | 2026-03-03 | 초판 작성      |

---

## 참고: AST 매핑 (참조 구현)

```typescript
// Match 표현식
type MatchExpr = {
  kind: "match_expr"
  subject: Expr
  arms: MatchArm[]
}

// Match Arm (패턴 + 가드 + 표현식)
type MatchArm = {
  pattern: Pattern
  guard?: Expr
  body: Expr
}

// Pattern 종류
type Pattern =
  | { kind: "literal"; value: Expr }
  | { kind: "ident"; name: string }
  | { kind: "wildcard" }
  | { kind: "struct"; name: string; fields: { name: string; pattern: Pattern }[] }
  | { kind: "array"; patterns: Pattern[] }
  | { kind: "some"; inner: Pattern }
  | { kind: "none" }
  | { kind: "ok"; inner: Pattern }
  | { kind: "err"; inner: Pattern }
```
