# 📋 FreeLang v4 패턴 매칭 기능 구현 계획서

**작성일**: 2026-03-30 | **난이도**: 중상 (5/10) | **예상 시간**: 8-12시간

---

## 1. 현황 분석

### ✅ 현재 지원되는 패턴 (7종)
1. **ident** - 변수 바인딩: `x`, `value`
2. **literal** - 리터럴 매칭: `42`, `"hello"`, `true`, `-10`
3. **wildcard** - 와일드카드: `_`
4. **none** - Option::None: `None`
5. **some** - Option::Some: `Some(v)`
6. **ok** - Result::Ok: `Ok(result)`
7. **err** - Result::Err: `Err(error)`

### 📍 코드 위치

| 컴포넌트 | 파일 | 라인 | 내용 |
|---------|------|------|------|
| **AST** | `/src/ast.ts` | 24-39 | Pattern, MatchArm 정의 |
| **파서** | `/src/parser.ts` | 587-710 | parseMatchStmt, parsePattern |
| **타입 체커** | `/src/checker.ts` | 422-483 | checkPattern, checkMatchStmt |
| **컴파일러** | `/src/compiler.ts` | 770-1395 | compileMatchStmt, compilePatternTest |

---

## 2. 확장 계획 (PHASE 1)

### **구조 분해 패턴 (Struct Destructuring)**

문법:
```rust
match point {
  Point { x, y } => x + y
  Point { x } => x * 2
  Point { x as px, y as py } => px + py
  Point { name, .. } => name
  _ => 0
}
```

AST 노드 추가:
```typescript
export type Pattern =
  | // ... 기존 패턴 ...
  | { kind: "struct";
      name: string;
      fields: { name: string; pattern: Pattern; alias?: string }[];
      rest: boolean;  // .. 있는지
    }
  | { kind: "array";
      elements: Pattern[];
      rest: boolean;
      restIndex?: number;
    }
  | { kind: "tuple";
      elements: Pattern[];
      rest: boolean;
      restIndex?: number;
    };
```

### **Guard 절 (Guard Clause)**

문법:
```rust
match x {
  Some(y) if y > 0 => "positive"
  Some(y) if y < 0 => "negative"
  Some(0) => "zero"
  None => "none"
}
```

AST 수정:
```typescript
export type MatchArm = {
  pattern: Pattern;
  guard?: Expr;  // ★ 새로 추가
  body: Expr;
};
```

---

## 3. 구현 순서

1. **AST 확장** (1h) - Pattern, MatchArm 타입 수정
2. **파서 수정** (2h) - 구조/배열 분해 + guard 파싱
3. **타입 체커 수정** (2h) - 패턴 검증 + guard 검증
4. **컴파일러 수정** (2h) - OpCode 추가 + 패턴 컴파일
5. **테스트 작성 및 검증** (2h)

---

## 4. 새로운 OpCode

```
IS_STRUCT = 0x83      // 구조체 타입 검사
STRUCT_GET = 0x84     // 구조체 필드 추출
STRUCT_SET = 0x85     // 구조체 필드 설정
IS_ARRAY = 0x86       // 배열 타입 검사
ARRAY_LEN = 0x87      // 배열 길이
ARRAY_SLICE = 0x88    // 배열 슬라이싱
IS_TUPLE = 0x89       // 튜플 타입 검사
TUPLE_GET = 0x8A      // 튜플 요소 추출
```

---

## 5. 테스트 케이스

```rust
struct Point { x: i32, y: i32 }
fn test() -> i32 {
  var p = Point { x: 10, y: 20 }
  match p {
    Point { x, y } => x + y  // 30
    _ => 0
  }
}

fn categorize(x: i32) -> string {
  match x {
    y if y < 0 => "negative"
    0 => "zero"
    y if y > 0 => "positive"
    _ => "unknown"
  }
}
```

---

## ✅ 결론

현재 FreeLang v4의 패턴 매칭은 **기본 인프라가 잘 구축**되어 있습니다.
이 계획에 따라 PHASE 1을 완성하면 Rust/Scala 수준의 패턴 매칭을 지원할 수 있습니다.
