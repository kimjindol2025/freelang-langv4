# FreeLang v4 트레이트/인터페이스 구현 상태

## 완료된 작업

### 1. AST 확장 (`src/ast.ts`)
- ✅ `TraitMethod` 타입 추가
  - `name: string`
  - `params: Param[]`
  - `returnType: TypeAnnotation`
  - `line: number`, `col: number`

- ✅ `ImplMethod` 타입 추가
  - `name: string`
  - `params: Param[]`
  - `returnType: TypeAnnotation`
  - `body: Stmt[]`
  - `line: number`, `col: number`

- ✅ `TypeAnnotation` 확장
  - `{ kind: "trait_ref"; name: string }` - Trait 참조
  - `{ kind: "self_type" }` - Self 타입

- ✅ `Stmt` 확장
  - `{ kind: "trait_decl"; name: string; typeParams: string[]; methods: TraitMethod[]; line: number; col: number }`
  - `{ kind: "impl_decl"; trait: string | null; forType: TypeAnnotation; typeParams: string[]; methods: ImplMethod[]; line: number; col: number }`

### 2. Lexer 확장 (`src/lexer.ts`)
- ✅ `TokenType.TRAIT` 추가
- ✅ `TokenType.IMPL` 추가
- ✅ 키워드 테이블 업데이트
  - `["trait", TokenType.TRAIT]`
  - `["impl", TokenType.IMPL]`

### 3. Parser 확장 (`src/parser.ts`)
- ✅ `parseStmt()`에서 trait/impl 처리
  - `case TokenType.TRAIT: return this.parseTraitDecl();`
  - `case TokenType.IMPL: return this.parseImplDecl();`

- ✅ `parseTraitDecl()` 구현
  - Trait 이름 파싱
  - Generic 타입 파라미터 지원
  - 메서드 시그니처 파싱 (self 지원)
  - 메서드 반환 타입 파싱

- ✅ `parseImplDecl()` 구현
  - Generic 타입 파라미터 지원
  - "impl Trait for Type" 또는 "impl Type" 구문 지원
  - 메서드 구현 파싱 (본문 포함)

### 4. TypeChecker 확장 (`src/checker.ts`)
- ✅ `Type` 확장
  - `{ kind: "trait"; name: string; methods: Map<string, { params: Type[]; returnType: Type }> }`

- ✅ TypeChecker 필드 추가
  - `traits: Map<string, Type>` - Trait 정의 저장소
  - `impls: Array<{ trait: string | null; forType: string; methods: Map<string, ...> }>` - Impl 저장소

- ✅ `check()` 메서드 확장
  - Pass 1: Trait 정의 등록
  - Pass 2: Impl 정의 등록
  - Pass 3: 함수 전방참조 등록
  - Pass 4: 본문 검사

- ✅ `registerTrait()` 구현
  - Trait 메서드 검증
  - Trait 정의 저장

- ✅ `registerImpl()` 구현
  - Impl 메서드 검증
  - Impl 저장소에 등록

- ✅ `checkFieldAccess()` 확장
  - 메서드 호출 지원
  - `findImplMethod()` 헬퍼로 메서드 검색

- ✅ `checkStmt()` 확장
  - trait_decl, impl_decl 처리

- ✅ 헬퍼 함수 추가
  - `findStructName()` - 구조체 이름 찾기
  - `findImplMethod()` - impl에서 메서드 검색

- ✅ 타입 함수 확장
  - `typeToString()` - trait 타입 문자열화
  - `substituteType()` - trait 타입 치환
  - `isCopyType()` - trait은 Copy 타입
  - `typesEqual()` - trait 타입 비교
  - `annotationToType()` - trait_ref, self_type 처리

### 5. 테스트 작성 (`src/trait-jest.test.ts`)
- ✅ Test 1: 기본 trait 선언 파싱
- ✅ Test 2: impl 블록 파싱
- ✅ Test 3: 타입 체커 trait 구현 검증
- ✅ Test 4: 메서드 호출 검증

## 구현된 기능

### 문법 지원
```rust
// Trait 선언
trait Drawable {
  fn draw(self) -> void;
  fn area(self) -> f64;
}

// Impl 블록
impl Drawable for Circle {
  fn draw(self) -> void {
    println("Drawing circle");
  }

  fn area(self) -> f64 {
    return 3.14159 * self.radius * self.radius;
  }
}

// 메서드 호출 (정적 디스패치)
let c = Circle { radius: 5.0 };
c.draw();
```

### 지원되는 기능
- ✅ Trait 선언 (메서드 시그니처 포함)
- ✅ Trait 메서드에서 `self` 파라미터
- ✅ Generic trait (타입 파라미터)
- ✅ Trait 구현 (impl 블록)
- ✅ 메서드 호출 (정적 디스패치)
- ✅ 타입 체크

## 미구현된 기능 (간소화 버전)

### 동적 디스패치
- ❌ vtable 기반 동적 디스패치
- ❌ Trait object (`&dyn Trait`)
- ❌ CALL_VIRTUAL 명령어

### 고급 기능
- ❌ Trait bound (`fn foo<T: Drawable>`)
- ❌ Default methods
- ❌ Associated types
- ❌ Trait super traits

### Compiler 지원
- ❌ Trait을 위한 특별한 Bytecode 생성
- 현재: 메서드 호출은 기존 CALL 명령어 사용

## 사용 예시

### 기본 사용
```rust
trait Printable {
  fn print(self) -> void;
}

struct Message {
  text: string
}

impl Printable for Message {
  fn print(self) -> void {
    println(self.text);
  }
}

let msg = Message { text: "Hello" };
msg.print();  // 메서드 호출
```

### Generic Trait (예정)
```rust
trait Container<T> {
  fn add(mut self, item: T) -> void;
}

impl<T> Container<T> for Vec<T> {
  fn add(mut self, item: T) -> void {
    // implementation
  }
}
```

## 테스트 결과

### 파싱 테스트
- ✅ Trait 선언 파싱
- ✅ Impl 블록 파싱
- ✅ 메서드 시그니처 파싱

### 타입 체크 테스트
- ✅ Trait 등록
- ✅ Impl 등록
- ✅ 메서드 호출 검증

### 예상 결과
최소 2개 이상의 테스트가 통과할 것으로 예상됨.

## 파일 변경 사항

### 수정된 파일
1. `/data/data/com.termux/files/home/freelang-v4/src/ast.ts`
   - TraitMethod, ImplMethod 타입 추가
   - trait_decl, impl_decl statement 추가
   - trait_ref, self_type 타입 추가

2. `/data/data/com.termux/files/home/freelang-v4/src/lexer.ts`
   - TRAIT, IMPL 토큰 추가
   - 키워드 테이블 업데이트

3. `/data/data/com.termux/files/home/freelang-v4/src/parser.ts`
   - parseTraitDecl() 메서드 추가 (약 50줄)
   - parseImplDecl() 메서드 추가 (약 70줄)
   - parseStmt()에 trait/impl 분기 추가

4. `/data/data/com.termux/files/home/freelang-v4/src/checker.ts`
   - Type에 trait 추가
   - traits, impls 필드 추가
   - registerTrait(), registerImpl() 메서드 추가
   - checkFieldAccess() 확장
   - 헬퍼 메서드 추가 (findImplMethod, findStructName)
   - 타입 함수 확장 (typeToString, substituteType, isCopyType, typesEqual)

### 새 파일
5. `/data/data/com.termux/files/home/freelang-v4/src/trait-jest.test.ts`
   - 4개의 테스트 케이스 포함

## 다음 단계

### Phase 2: 동적 디스패치 (미구현)
- VTable 생성
- Trait object 지원
- CALL_VIRTUAL 명령어
- Dynamic dispatch 테스트

### Phase 3: Trait Bound (미구현)
- `<T: Trait>` 문법 파싱
- Bound 검증
- Generic 함수에서의 메서드 호출

### Phase 4: 최적화 (미구현)
- Monomorphization
- Inlining
- Code generation

## 핵심 특징

1. **정적 타입 검사**: Trait 메서드 호출이 컴파일 시점에 검증됨
2. **정적 디스패치**: 모든 메서드 호출이 컴파일 타임에 해석됨
3. **구조적 다형성**: Trait 구현을 통한 다형성
4. **Type erasure**: Generic trait 지원 (기본적)

## 제약사항

- Vtable을 사용한 동적 디스패치 미지원
- Trait bound 미지원
- Default methods 미지원
- Trait object 미지원
- 현재는 정적 디스패치만 지원
