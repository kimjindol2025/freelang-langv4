# 📦 FreeLang v4 모듈 시스템 구현 계획서

**예상 시간**: 15일 | **난이도**: 상 (8/10)

---

## 1. 모듈 시스템 설계

### 파일 기반 vs 네임스페이스 기반

| 항목 | 파일 기반 | 네임스페이스 기반 |
|------|----------|------------------|
| **구조** | 각 `.fl` 파일 = 1 모듈 | 논리적 그룹화 |
| **경로 해석** | 파일시스템 기반 | 명시적 매핑 |
| **장점** | 직관적, 구현 간단 | 유연한 구조화 |
| **단점** | 깊은 계층 불편 | 추가 설정 필요 |
| **선택** | **파일 기반** (Phase 1) + 네임스페이스 (Phase 2) |

---

## 2. 문법 설계

### Import 형태

```freeLang
// Type 1: 전체 모듈 임포트
import math from "./math"
// → math 바인딩, math.add() 호출

// Type 2: 선택적 임포트
import { add, multiply } from "./math"
// → add, multiply 바인딩, 직접 호출

// Type 3: Alias
import { add as sum } from "./math"
// → sum 바인딩

// Type 4: 표준 라이브러리
import @async              // 전체
import { sleep } from @async  // 선택
```

### Export 형태

```freeLang
// Type 1: 선언과 함께
export fn add(a: i32, b: i32) -> i32 { a + b }
export struct Person { name: string }
export var MAX = 100

// Type 2: 목록으로
export { add, multiply, PI }

// Type 3: 비공개 (default)
fn private_helper() { }  // export 없음 = 비공개
```

---

## 3. 모듈 경로 해석

### 경로 형식

```
상대 경로:     ./module, ../module, ../../module
절대 경로:     /absolute/path/to/module
표준 라이브:   @modulename, @package.module
```

### 파일 위치 해석 알고리즘

```
Input: "./math"
Current: /project/src/main.fl

1. 정규화: /project/src/math
2. 후보 생성:
   - /project/src/math.fl
   - /project/src/math/index.fl
3. 파일 존재 확인
4. 먼저 존재하는 경로 반환
```

### 표준 라이브러리 경로

```
@core    → stdlib/@core.fl
@async   → stdlib/@async.fl
@http    → stdlib/@http.fl
@fs      → stdlib/@fs.fl
```

---

## 4. 순환 참조 처리

### 순환 참조 감지 알고리즘

```
Algorithm: Detect Circular Imports (DFS)

1. 모든 모듈의 의존성 그래프 구성
2. 각 모듈에서 DFS 실행
3. 현재 방문 중인 모듈이 다시 나타나면 → 순환 참조!
4. 순환 경로 추출 및 에러 출력
```

### 에러 메시지

```
CircularDependencyError: Circular import detected:
  module_a.fl → module_b.fl → module_a.fl

  at module_b.fl:1:8
    import { funcA } from "./module_a"
           ^
```

---

## 5. AST 확장

```typescript
// 신규 노드
type ImportDecl = {
  kind: "import"
  source: string              // "./math" or "@async"
  items: {
    name: string             // "add"
    alias?: string           // optional "sum"
  }[]
  default?: boolean          // import M from "..."
}

type ExportDecl = {
  kind: "export"
  target: Stmt | string[]    // function/struct 또는 이름 목록
}

// AST 수정
type Stmt = ... | ImportDecl | ExportDecl
type Program = {
  imports: ImportDecl[]      // 새로 추가
  exports: ExportDecl[]      // 새로 추가
  stmts: Stmt[]
}
```

---

## 6. 파서 수정 계획 (2시간)

### Lexer 수정 (30분)

```typescript
// src/lexer.ts에 추가

enum TokenType {
  IMPORT = 'import',
  EXPORT = 'export',
  FROM = 'from',
  AS = 'as',
}

keywords['import'] = TokenType.IMPORT
keywords['export'] = TokenType.EXPORT
keywords['from'] = TokenType.FROM
keywords['as'] = TokenType.AS
```

### Parser 수정 (1.5시간)

```typescript
parseImportStmt(): ImportDecl {
  // import { a, b } from "./path"
  // import M from "./path"
  // import { a as b } from "./path"

  this.expect(TokenType.IMPORT)

  if (this.check(TokenType.LBRACE)) {
    // import { ... } from "..."
  } else {
    // import M from "..."
  }
}

parseExportStmt(): ExportDecl {
  this.expect(TokenType.EXPORT)

  if (this.check(TokenType.FN)) {
    // export fn
  } else if (this.check(TokenType.STRUCT)) {
    // export struct
  } else {
    // export { ... }
  }
}
```

---

## 7. 타입 체커 수정 계획

### 새로운 스코프 계층

```typescript
type Scope = {
  local: Map<string, Type>         // 블록/함수 로컬
  imported: Map<string, Type>      // Import된 항목
  module: Map<string, Type>        // 모듈 export
  parent?: Scope                   // 부모 스코프
}
```

### Import 검증

```typescript
checkImportDecl(decl: ImportDecl): CheckError[] {
  const errors: CheckError[] = []

  // 1. 모듈 존재 확인
  const module = this.loader.load(decl.source)
  if (!module) {
    errors.push({ type: 'MODULE_NOT_FOUND', ... })
  }

  // 2. Export 존재 확인
  for (const item of decl.items) {
    if (!module.exports.has(item.name)) {
      errors.push({ type: 'EXPORT_NOT_FOUND', ... })
    }
  }

  // 3. 타입 가져오기
  for (const item of decl.items) {
    const type = module.exports.get(item.name)
    const alias = item.alias || item.name
    this.scope.imported.set(alias, type)
  }

  return errors
}
```

---

## 8. 컴파일러 링킹 계획

### 모듈 컴파일 과정

```
Module A.ast → Bytecode (Module A 전용)
Module B.ast → Bytecode (Module B 전용)
   ↓
모듈 링킹 (Import 바인딩)
   ↓
최종 Bytecode (모든 모듈)
```

### 구현 단계

```typescript
// Phase 1: 모듈 로드 및 정렬
const modules = loader.loadAll(entryPoint)
const sorted = graph.topologicalSort(modules)

// Phase 2: 각 모듈별 컴파일
const compiled = new Map<string, CompiledModule>()
for (const mod of sorted) {
  compiled.set(mod.path, compiler.compileModule(mod))
}

// Phase 3: 심볼 연결
const finalBytecode = linker.linkModules(compiled)
```

---

## 9. 파일 구조 변경

### 추가되는 파일

```
src/
├── module-checker.ts   (6.0 KB) - 모듈 타입 체크 ★신규
├── module-compiler.ts  (8.0 KB) - 모듈 링킹 ★신규
├── module-loader.ts    (7.0 KB) - 모듈 로드 ★신규
├── module-graph.ts     (5.0 KB) - 의존성 그래프 ★신규
└── module-jest.test.ts (10.0 KB) - 모듈 테스트 ★신규

stdlib/ ★신규
├── @core.fl
├── @types.fl
├── @array.fl
├── @string.fl
├── @math.fl
└── @util.fl
```

**추가 코드량**: ~50 KB

---

## 10. 테스트 케이스

### 기본 테스트 (10가지)

```typescript
describe("Module System", () => {
  // Test 1: 기본 import/export
  it("should import and export functions", () => {
    const math = `
      export fn add(a: i32, b: i32) -> i32 { a + b }
    `
    const main = `
      import { add } from "./math"
      println(str(add(2, 3)))
    `
    expect(compile({ "math.fl": math, "main.fl": main }))
      .toOutput("5")
  })

  // Test 2: Alias
  it("should handle import aliases", () => {
    const main = `
      import { add as sum } from "./math"
      println(str(sum(1, 2)))
    `
    expect(compile(main)).toOutput("3")
  })

  // Test 3: 순환 참조 감지
  it("should detect circular imports", () => {
    const a = `import { fb } from "./b"; export fn fa() {}`
    const b = `import { fa } from "./a"; export fn fb() {}`
    expect(compile({ "a.fl": a, "b.fl": b }))
      .toThrowError("CircularDependencyError")
  })

  // Test 4: Export 검증
  it("should validate exported names exist", () => {
    const main = `export { nonexistent }`
    expect(compile(main))
      .toThrowError("UNDEFINED_IDENTIFIER_IN_EXPORT")
  })

  // Test 5: Import 검증
  it("should validate imported names exist", () => {
    const math = `export fn add(a: i32, b: i32) -> i32 { a + b }`
    const main = `import { unknown } from "./math"`
    expect(compile({ "math.fl": math, "main.fl": main }))
      .toThrowError("EXPORT_NOT_FOUND")
  })

  // Test 6: 모듈 싱글톤
  it("should instantiate modules only once", () => {
    const counter = `
      var count = 0
      export fn inc() { count = count + 1 }
      export fn get() -> i32 { count }
    `
    const main = `
      import { inc, get } from "./counter"
      inc()
      inc()
      println(str(get()))  // 2, not 1
    `
    expect(compile({ "counter.fl": counter, "main.fl": main }))
      .toOutput("2")
  })

  // Test 7: 중첩 import
  it("should support nested module imports", () => {
    const utils = `export fn double(x: i32) -> i32 { x * 2 }`
    const math = `
      import { double } from "./utils"
      export fn quad(x: i32) -> i32 { double(double(x)) }
    `
    const main = `
      import { quad } from "./math"
      println(str(quad(5)))  // 20
    `
    expect(compile({
      "utils.fl": utils,
      "math.fl": math,
      "main.fl": main
    })).toOutput("20")
  })
})
```

---

## 11. 복잡도 평가

### 구현 난이도

| Phase | 작업 | 기간 | 난이도 |
|-------|------|------|--------|
| 1 | AST + Lexer + Parser | 2일 | 낮음 |
| 2 | ModuleLoader + Graph | 3일 | 중간 |
| 3 | Type Checker 수정 | 3일 | 높음 |
| 4 | Compiler 수정 | 3일 | 높음 |
| 5 | StdLib 모듈화 | 1일 | 낮음 |
| 6 | 테스트 작성 | 2일 | 중간 |
| 7 | 문서 & 에러 | 1일 | 낮음 |
| **합계** | | **15일** | - |

### 성능 영향

| 메트릭 | 현재 | 예상 | 영향 |
|--------|------|------|------|
| 파싱 시간 | ~1ms | ~2ms | +100% |
| 타입 체크 | ~5ms | ~10ms | +100% |
| 컴파일 | ~8ms | ~15ms | +87% |
| **전체** | ~14ms | ~27ms | +93% |

---

## ✅ 결론

FreeLang v4 모듈 시스템은 다음과 같이 설계되었습니다:

### 핵심 특징
- ✅ 파일 기반 모듈
- ✅ 명시적 import/export
- ✅ 순환 참조 방지
- ✅ 모듈 싱글톤
- ✅ 표준 라이브러리 지원

### 구현 일정
- Phase 1-2: 기본 인프라 (1주)
- Phase 3-4: 타입 체커 & 컴파일러 (2주)
- Phase 5-7: StdLib, 테스트, 문서 (2주)
- **합계**: **5주** (1개월)

이 계획을 바탕으로 FreeLang v4는 모듈 시스템을 통해 실무적 언어로 진화할 수 있습니다.
