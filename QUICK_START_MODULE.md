# FreeLang v4 모듈 시스템 - 빠른 시작

## 개요

FreeLang v4에 기본 모듈 시스템이 구현되었습니다. 이 문서는 import/export 문법을 사용하는 방법을 설명합니다.

---

## 1. 파싱 가능한 문법

### 1.1 Import 문법

```freeLang
// 형태 1: 선택적 import
import { add, subtract } from "./math"

// 형태 2: 별칭이 있는 import
import { add as sum } from "./math"

// 형태 3: 기본 import
import math from "./math"

// 형태 4: 여러 항목
import { add, subtract as sub, multiply as mul } from "./math"
```

### 1.2 Export 문법

```freeLang
// 형태 1: 함수 export
export fn add(a: i32, b: i32) -> i32 { a + b }

// 형태 2: 구조체 export
export struct Point { x: i32, y: i32 }

// 형태 3: 항목 목록 export
export { add, subtract, multiply }
```

---

## 2. 현재 구현 상태

### ✅ 완료된 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| Lexer | ✅ | import, export, from 키워드 인식 |
| Parser | ✅ | import/export 구문 파싱 |
| AST | ✅ | ImportDecl, ExportDecl 노드 |
| TypeChecker | ✅ | import 항목 스코프 등록 |
| Compiler | ✅ | import/export 무시 (단일 파일용) |

### ⏳ 향후 예정

- 실제 파일 로드 및 모듈 인스턴스
- 순환 참조 감지
- 표준 라이브러리 모듈
- 모듈 의존성 그래프

---

## 3. 테스트 실행

### 테스트 파일
```bash
src/module-jest.test.ts
```

### 테스트 케이스
1. 기본 import 파싱
2. 다중 항목 import
3. Import alias
4. Default import
5. Export function
6. Export struct
7. Export list
8. Type checking with imports
9. Multiple imports
10. Import and export together

### 실행 방법
```bash
npm test -- src/module-jest.test.ts
```

---

## 4. 사용 예제

### 예제 1: Math 모듈

**math.fl** (향후 구현)
```freeLang
export fn add(a: i32, b: i32) -> i32 { a + b }
export fn multiply(a: i32, b: i32) -> i32 { a * b }
```

**main.fl** (현재 파싱 가능)
```freeLang
import { add, multiply } from "./math"

fn main() -> void {
  var result = add(2, 3)
  println(str(result))
}
```

### 예제 2: 별칭 사용

```freeLang
import { add as sum, multiply as product } from "./math"

fn compute() -> void {
  var x = sum(10, 20)
  var y = product(x, 2)
  println(str(y))
}
```

### 예제 3: Export 구조체

```freeLang
export struct Person {
  name: string,
  age: i32
}

export fn create_person(name: string, age: i32) -> Person {
  Person { name: name, age: age }
}
```

---

## 5. 아키텍처

### 파이프라인

```
소스코드 (import/export 포함)
    ↓
Lexer (import, export, from 토큰 생성)
    ↓
Parser (ImportDecl, ExportDecl AST 노드 생성)
    ↓
TypeChecker (import 항목을 스코프에 등록)
    ↓
Compiler (import/export 무시, 단일 파일 통합)
    ↓
Bytecode (모듈 정보 제외)
```

### AST 노드 구조

```typescript
type ImportDecl = {
  kind: "import_decl"
  source: string              // "./math"
  items: {
    name: string             // "add"
    alias?: string           // "sum"
  }[]
  default?: boolean          // import M from "..."
}

type ExportDecl = {
  kind: "export_decl"
  target: Stmt | string[]    // 함수/구조체 또는 이름 목록
}
```

---

## 6. 구현 세부사항

### 6.1 Lexer 변경

- TokenType에 IMPORT, EXPORT, FROM 추가
- KEYWORDS 맵에 3개 키워드 등록

### 6.2 AST 변경

- ImportItem, ImportDecl, ExportDecl 타입 정의
- Stmt 타입에 두 선언 추가

### 6.3 Parser 변경

- parseImportStmt() - import 문 파싱
- parseExportStmt() - export 문 파싱
- parseStmt() - IMPORT/EXPORT 케이스 추가
- isStmtStart() - import/export 포함

### 6.4 TypeChecker 변경

- checkImportDecl() - import 항목 검증
- checkExportDecl() - export 항목 검증
- checkStmt() - import/export 케이스 추가

### 6.5 Compiler 변경

- compileStmt() - import/export 무시 처리

---

## 7. 제한사항

### 현재 버전의 한계

1. **파일 로드 없음**: import는 구문만 파싱, 실제 모듈 로드 안 함
2. **모듈 인스턴스 없음**: 각 모듈을 별도로 인스턴스화하지 않음
3. **타입 정보 없음**: import된 항목의 타입을 unknown으로 처리
4. **표준 라이브러리 없음**: stdlib 모듈 미제공
5. **단일 파일 가정**: 모든 코드가 한 파일인 것으로 가정

### 해결 방법

향후 구현될 Phase 2에서:

1. ModuleLoader - 실제 파일 로드
2. ModuleGraph - 의존성 그래프
3. ModuleChecker - 타입 정보 검증
4. ModuleCompiler - 모듈 간 링킹

---

## 8. 파일 변경 사항

### 수정된 파일

```
src/
├── lexer.ts       (키워드 추가)
├── ast.ts         (AST 노드 추가)
├── parser.ts      (파싱 메서드 추가)
├── checker.ts     (검증 메서드 추가)
└── compiler.ts    (컴파일 케이스 추가)
```

### 새로운 파일

```
src/
└── module-jest.test.ts (10개 테스트 케이스)
```

### 문서

```
MODULE_IMPLEMENTATION_STATUS.md  (구현 상태 보고)
QUICK_START_MODULE.md            (이 파일)
```

---

## 9. 자주 묻는 질문 (FAQ)

**Q: 현재 import 문을 실행할 수 있나요?**
A: 아니오. 현재는 구문 파싱만 가능합니다. 실제 모듈 로드는 Phase 2에서 구현됩니다.

**Q: import된 함수의 타입 정보가 있나요?**
A: 아니오. 타입은 unknown으로 처리됩니다. 향후 ModuleLoader가 타입 정보를 제공할 예정입니다.

**Q: 순환 참조는 감지하나요?**
A: 아니오. 순환 참조 감지는 Phase 2에서 구현됩니다.

**Q: @core 같은 표준 라이브러리를 import할 수 있나요?**
A: 아직 구현되지 않았습니다. Phase 2에서 추가될 예정입니다.

---

## 10. 다음 단계

### Phase 2 구현 계획

1. **ModuleLoader** (7KB)
   - 경로 정규화
   - 파일 후보 검색
   - 모듈 로드

2. **ModuleGraph** (5KB)
   - 의존성 그래프 구성
   - 순환 참조 감지 (DFS)
   - 위상 정렬

3. **ModuleChecker** (6KB)
   - import 항목 검증
   - export 존재 확인
   - 타입 정보 연결

4. **ModuleCompiler** (8KB)
   - 모듈 간 링킹
   - 심볼 바인딩
   - 최종 bytecode 생성

### 예상 타임라인

- Phase 1 (완료): 파싱 기본 구조
- Phase 2 (1주): 모듈 로더 및 그래프
- Phase 3 (1주): 타입 체커 및 컴파일러
- Phase 4 (1주): 표준 라이브러리 및 문서

---

## 참고 자료

- **MODULE_SYSTEM_PLAN.md**: 전체 모듈 시스템 설계
- **MODULE_IMPLEMENTATION_STATUS.md**: 구현 현황 보고
- **ARCHITECTURE.md**: 전체 아키텍처
- **src/module-jest.test.ts**: 테스트 코드

