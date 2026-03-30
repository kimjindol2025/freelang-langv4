# 🦀 FreeLang v4 트레이트/인터페이스 구현 계획서

**목표**: 정적 타입, 제네릭 지원, Zero-cost abstraction을 갖춘 트레이트 시스템 구현

**예상 시간**: 7-8주 | **난이도**: 상 (8/10)

---

## 1. 현재 구조 분석

### AST (ast.ts)
- ✅ 제네릭 시스템 이미 구현 (`type_param`, `generic_ref`)
- ❌ 구조체만 지원, 트레이트/인터페이스 없음
- ❌ 타입 계층 없음

### 타입 체커 (checker.ts)
- ✅ 구조적 타입 동등 비교 (`typesEqual`)
- ✅ Move/Copy 추적 (`isCopyType`)
- ✅ 스코프 관리 (`Scope`)

### 컴파일러 (compiler.ts)
- ✅ `STRUCT_NEW`, `STRUCT_GET`, `STRUCT_SET` OpCode
- ✅ Type Erasure 전략 사용
- ✅ 함수 레지스트리 + 특화

---

## 2. 문법 설계

### Trait 선언
```rust
trait Drawable {
  fn draw(self) -> void;
  fn area(self) -> f64;
}
```

### Generic Trait
```rust
trait Container<T> {
  fn push(mut self, item: T) -> void;
  fn pop(mut self) -> Option<T>;
  fn len(self) -> i32;
}
```

### Default Methods
```rust
trait Printable {
  fn to_string(self) -> string;
  fn print(self) -> void {
    println(self.to_string());
  }
}
```

### Impl 블록
```rust
impl Drawable for Circle {
  fn draw(self) -> void { ... }
  fn area(self) -> f64 { ... }
}
```

### Generic impl
```rust
impl<T> Container<T> for Vec<T> {
  fn push(mut self, item: T) -> void { ... }
  fn pop(mut self) -> Option<T> { ... }
}
```

### Trait Bound
```rust
fn draw_all<T: Drawable>(items: [T]) -> void {
  for item in items { item.draw(); }
}
```

### Trait Object (Dynamic Dispatch)
```rust
let d: &dyn Drawable = &circle;
d.draw();  // vtable 통한 호출
```

---

## 3. AST 확장

```typescript
// 새로운 타입
TypeAnnotation:
  | { kind: "trait_ref"; name: string; typeArgs: TypeAnnotation[] }
  | { kind: "trait_object"; trait: string; typeArgs: TypeAnnotation[] }
  | { kind: "self_type" }

// 새로운 문
Stmt:
  | { kind: "trait_decl";
      name: string;
      typeParams: string[];
      methods: TraitMethod[];
      supertraits: string[];
    }
  | { kind: "impl_decl";
      trait?: string;
      forType: TypeAnnotation;
      typeParams: string[];
      methods: ImplMethod[];
    }
```

---

## 4. 타입 체커 확장

```typescript
// 새로운 내부 타입
Type:
  | { kind: "trait";
      name: string;
      methods: Map<string, TraitMethod>;
      typeParams: string[];
    }
  | { kind: "trait_object";
      trait: string;
      typeArgs: Type[];
    }

// Registry
traits: Map<string, Type>
impls: ImplInfo[]
traitImpls: Map<string, ImplInfo[]>
```

### Method Resolution (우선순위)
1. Inherent impl
2. Blanket impl
3. Trait impl
4. 모호: `<Type>::method()` 사용

---

## 5. OpCode 설계

```
CALL_METHOD = 0x52      // 정적 디스패치
CALL_VIRTUAL = 0x53     // 동적 디스패치 (vtable)
MAKE_TRAIT_OBJ = 0x54   // Trait object 생성
```

### 정적 메서드 호출
```
obj.draw()
→ LOAD_LOCAL 0
  CALL_METHOD <Circle::draw>
```

### 동적 메서드 호출
```
obj: &dyn Drawable
obj.draw()
→ LOAD_LOCAL 0
  CALL_VIRTUAL 0  // vtable slot 0
```

### VTable 구조
```
&dyn Drawable = [data_ptr: 8 bytes, vtable_ptr: 8 bytes] = 16 bytes

VTable:
  +0: draw() impl
  +8: area() impl
  +16: type_id
  +24: drop_fn
```

---

## 6. 구현 단계 (7-8주)

| Phase | 내용 | 기간 | 산출물 |
|-------|------|------|--------|
| 1 | AST + 파서 | 1주 | trait_decl, impl_decl 파싱 |
| 2 | 타입 검사 | 1.5주 | Trait registry, method resolution |
| 3 | 컴파일 | 1.5주 | CALL_METHOD, Monomorphization |
| 4 | 동적 디스패치 | 1주 | VTable, CALL_VIRTUAL |
| 5 | 고급 기능 | 1주 | Default methods, Associated types |
| 6 | 최적화 & 테스트 | 1주 | 20+ test cases, 성능 최적화 |

---

## 7. 성능 고려사항

### 정적 디스패치 (기본)
- Zero-cost abstraction
- 인라인 친화적
- Code bloat 위험 (monomorphization)

### 최적화 전략
1. **Shared generics**: 공통 로직 추출
2. **Lazy instantiation**: 실제 사용 시만 생성
3. **VTable 메서드 수 제한**
4. **Hot path 정적 디스패치**

### 메모리 레이아웃
- Trait object: 16 bytes (data_ptr + vtable_ptr)
- VTable: 메서드 수 × 8 bytes

---

## 8. 예제 코드

### 기본 구현
```rust
trait Drawable {
  fn draw(self) -> void;
  fn area(self) -> f64;
}

struct Circle { radius: f64 }
impl Drawable for Circle {
  fn draw(self) -> void { println("Circle"); }
  fn area(self) -> f64 { return 3.14159 * self.radius * self.radius; }
}

let c = Circle { radius: 5.0 };
c.draw();  // 정적 디스패치
```

### Trait Object
```rust
fn draw_all(shapes: [&dyn Drawable]) -> void {
  for shape in shapes { shape.draw(); }  // 동적 디스패치
}

let shapes: [&dyn Drawable] = [&circle, &square];
draw_all(shapes);
```

### Generic + Bound
```rust
trait Eq { fn eq(self, other: Self) -> bool; }

fn find<T: Eq>(items: [T], target: T) -> Option<i32> {
  for item in items {
    if item.eq(target) { return Some(i); }
  }
  return None;
}
```

---

## 9. 핵심 체크리스트

**AST**
- [ ] trait_decl, impl_decl 추가
- [ ] TraitMethod, ImplMethod 타입
- [ ] self_type, trait_ref, trait_object 타입

**파서**
- [ ] trait, impl 키워드
- [ ] trait/impl 선언 파싱
- [ ] `<T: Trait>` bound 파싱

**타입 체커**
- [ ] Trait registry
- [ ] checkTraitDecl(), checkImplDecl()
- [ ] resolveMethodCall()
- [ ] satisfiesBound()

**컴파일러**
- [ ] CALL_METHOD, CALL_VIRTUAL OpCode
- [ ] Monomorphization
- [ ] VTable 생성

**테스트**
- [ ] 20+ 단위 테스트
- [ ] 10+ 통합 테스트

---

## 10. 위험 요소 & 완화

| 위험 | 원인 | 완화 전략 |
|------|------|---------|
| Code Bloat | Monomorphization | Shared generics, lazy instantiation |
| Compile Time | 많은 특화 | Incremental compilation, cache |
| 복잡한 검사 | Trait + Generic 상호작용 | Clear errors, 제약 전파 |
| Performance | Vtable 오버헤드 | 정적 디스패치 기본, 인라이닝 |

---

## ✅ 결론

트레이트 시스템 구현으로 FreeLang v4는 **Rust 수준의 다형성과 추상화**를 갖추게 됩니다.

**핵심 특징:**
- ✅ Rust 스타일의 Trait
- ✅ Hybrid 디스패치 (정적 + 동적)
- ✅ Zero-cost abstraction
- ✅ 제네릭 통합
- ✅ 타입 안전성
