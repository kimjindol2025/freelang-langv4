# 🏗️ FreeLang v4 - 아키텍처

**완전한 언어 구현: Lexer → Parser → Compiler → VM**

---

## 🎯 시스템 개요

```
┌────────────────────────────────────────────────────┐
│           FreeLang v4 아키텍처                      │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐     ┌────────┐     ┌──────────┐    │
│  │  Lexer   │────→│ Parser │────→│ Compiler │    │
│  │(Tokenize)│     │(Parse) │     │(Codegen) │    │
│  └──────────┘     └────────┘     └──────────┘    │
│        ↑                               ↓           │
│   Source Code                   Bytecode          │
│        ↑                               ↓           │
│  ┌──────────────────────────────────────────┐    │
│  │              Virtual Machine (VM)        │    │
│  │  ├─ Instruction Handler                │    │
│  │  ├─ Stack Management                   │    │
│  │  ├─ Memory Manager (GC)                │    │
│  │  └─ Runtime Library                   │    │
│  └──────────────────────────────────────────┘    │
│        ↓                                           │
│    Program Output                                 │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 1️⃣ Lexer (어휘 분석)

### 역할
소스 코드를 토큰으로 분해

### 구현 파일
📄 `src/lexer.ts`

### 주요 클래스

```typescript
class Lexer {
  constructor(source: string)
  tokenize(): { tokens: Token[], errors: Error[] }
}

class Token {
  type: TokenType
  value: string
  line: number
  column: number
}
```

### 토큰 타입 (30+)

| 카테고리 | 예시 |
|---------|------|
| **키워드** | let, fn, if, while, match, struct |
| **식별자** | name, age, calculateSum |
| **리터럴** | 42, "hello", 3.14, true |
| **연산자** | +, -, *, /, ==, != |
| **구분자** | {, }, [, ], (, ), : |

### 예시

```freelang
let x = 42
```

토큰화:
```
[KEYWORD: let] [IDENTIFIER: x] [OPERATOR: =] [NUMBER: 42]
```

---

## 2️⃣ Parser (문법 분석)

### 역할
토큰으로부터 추상 구문 트리(AST) 생성

### 구현 파일
📄 `src/parser.ts`

### 주요 클래스

```typescript
class Parser {
  constructor(tokens: Token[])
  parse(): { program: Program, errors: Error[] }
}

interface ASTNode {
  type: string
  line: number
  column: number
}

interface Program {
  statements: Statement[]
}
```

### AST 노드 계층

```
ASTNode
├─ Statement
│  ├─ VariableDeclaration
│  ├─ FunctionDeclaration
│  ├─ StructDeclaration
│  ├─ IfStatement
│  ├─ WhileLoop
│  ├─ ForLoop
│  ├─ MatchExpression
│  └─ ReturnStatement
│
├─ Expression
│  ├─ BinaryOp
│  ├─ UnaryOp
│  ├─ FunctionCall
│  ├─ ArrayLiteral
│  ├─ StructLiteral
│  └─ Identifier
│
└─ Type
   ├─ PrimitiveType (i32, str, bool, f64)
   ├─ ArrayType [T]
   ├─ FunctionType (T) -> U
   └─ StructType
```

### 파싱 전략

- **Recursive Descent**: 상향식 재귀 파싱
- **Operator Precedence**: 연산자 우선순위 관리
- **Error Recovery**: 에러 복구 메커니즘

---

## 3️⃣ Compiler (컴파일)

### 역할
AST를 바이트코드로 변환

### 구현 파일
📄 `src/compiler.ts`

### 주요 클래스

```typescript
class Compiler {
  compile(program: Program): Chunk
}

interface Chunk {
  code: Instruction[]
  constants: any[]
  debug: DebugInfo
}

interface Instruction {
  op: OpCode
  operands: number[]
}
```

### OpCode (연산 코드)

```typescript
enum OpCode {
  // 상수
  CONSTANT,
  LOAD_CONST,

  // 변수
  DEFINE_LOCAL,
  GET_LOCAL,
  SET_LOCAL,

  // 산술 연산
  ADD, SUB, MUL, DIV, MOD,
  NEG, // 음수

  // 비교
  EQ, NE, LT, LE, GT, GE,

  // 논리
  AND, OR, NOT,

  // 제어 흐름
  JUMP,
  JUMP_IF_FALSE,
  JUMP_IF_TRUE,
  LOOP,

  // 함수
  CALL,
  RETURN,

  // 배열
  ARRAY,
  INDEX,
  INDEX_SET,

  // 구조체
  STRUCT,
  PROPERTY,
  PROPERTY_SET,

  // 기타
  POP,
  PRINT,
  MATCH
}
```

### 컴파일 과정

```
AST
  ↓ [Type Checking] → 타입 검증
  ↓ [Symbol Resolution] → 심볼 해석
  ↓ [Code Generation] → 바이트코드 생성
  ↓ [Optimization] → 최적화
Bytecode
```

### 최적화 기법

1. **상수 폴딩**: 컴파일 타임에 상수 계산
2. **불필요 코드 제거**: 도달 불가능 코드 삭제
3. **명령어 선택**: 효율적인 OpCode 선택

---

## 4️⃣ Virtual Machine (VM)

### 역할
바이트코드 실행

### 구현 파일
📄 `src/vm.ts`

### 주요 클래스

```typescript
class VM {
  run(chunk: Chunk): Promise<ExecutionResult>
}

interface ExecutionResult {
  output: string[]
  stack: any[]
  memory: Memory
}

interface Memory {
  heap: Map<number, any>
  stack: Stack
  gc: GarbageCollector
}
```

### 실행 모델

```
┌─────────────────────────────┐
│   Instruction Pointer (IP)  │
│   ↓                         │
│ ┌──────────────────────────┐│
│ │  Bytecode Array          ││
│ │  [INSTRUCTION 0]         ││
│ │  [INSTRUCTION 1]  ← IP   ││
│ │  [INSTRUCTION 2]         ││
│ └──────────────────────────┘│
│                             │
│ ┌──────────────────────────┐│
│ │  Stack (LIFO)            ││
│ │  ┌─────────────────────┐││
│ │  │ value3              ││ │
│ │  │ value2              ││ │ ← Top
│ │  │ value1              │││
│ │  └─────────────────────┘││
│ └──────────────────────────┘│
│                             │
│ ┌──────────────────────────┐│
│ │  Heap (메모리)            ││
│ │  object1: {...}         ││
│ │  array1: [1,2,3]        ││
│ │  ...                    ││
│ └──────────────────────────┘│
└─────────────────────────────┘
```

### 메모리 관리

```typescript
class GarbageCollector {
  collect(): void
  // Mark-and-sweep GC 구현
  // - Mark: 도달 가능한 객체 표시
  // - Sweep: 표시 안 된 객체 해제
}
```

### 표준 라이브러리

```typescript
stdlib: {
  // 문자열
  length, to_upper, to_lower, slice, ...

  // 배열
  push, pop, first, last, reverse, ...

  // 수학
  floor, ceil, round, sqrt, pow, ...

  // I/O
  println, read_file, write_file, ...
}
```

---

## 📁 디렉토리 구조

```
freelang-v4/
├── src/
│   ├── lexer.ts              # 어휘 분석
│   ├── parser.ts             # 문법 분석
│   ├── compiler.ts           # 컴파일러
│   ├── vm.ts                 # 가상 머신
│   ├── stdlib.ts             # 표준 라이브러리
│   └── types.ts              # 타입 정의
│
├── v9/                       # Phase 1-6 구현
│   ├── v9-memory.fl          # 메모리 스토리지
│   ├── v9-parallel.fl        # 병렬 처리
│   ├── v9-agent-engine.fl    # ReAct 에이전트
│   ├── v9-memory-management.fl
│   ├── v9-optimized.fl       # 최적화
│   ├── v9-benchmark.fl       # 성능 벤치마크
│   └── v9-distributed.fl     # 분산 처리
│
├── dist/                     # 컴파일된 JavaScript
│   ├── lexer.js
│   ├── parser.js
│   ├── compiler.js
│   └── vm.js
│
├── tests/
│   ├── jest/                 # Jest 테스트
│   │   ├── lexer.test.ts
│   │   ├── parser.test.ts
│   │   ├── compiler.test.ts
│   │   └── vm.test.ts
│   └── v9/
│       └── v9-*.test.ts
│
├── docs/                     # 문서
│   ├── index.md              # 홈페이지
│   ├── api-reference.md      # API
│   ├── learning-guide.md     # 학습
│   ├── language-completeness.md
│   ├── benchmarks.md         # 성능
│   └── architecture.md       # 아키텍처 (이 파일)
│
└── package.json
```

---

## 🔄 실행 흐름

### 1. 프로그램 실행

```bash
node dist/vm.js program.fl
```

### 2. 소스 코드 읽기

```
program.fl → source code (string)
```

### 3. Lexer 단계

```typescript
const lexer = new Lexer(source)
const { tokens, errors } = lexer.tokenize()
// error check...
```

### 4. Parser 단계

```typescript
const parser = new Parser(tokens)
const { program, errors } = parser.parse()
// error check...
```

### 5. Compiler 단계

```typescript
const compiler = new Compiler()
const chunk = compiler.compile(program)
// chunk: { code, constants, debug }
```

### 6. VM 실행

```typescript
const vm = new VM()
const { output, stack, memory } = await vm.run(chunk)
console.log(output.join('\n'))
```

---

## 🎯 설계 원칙

### 1. **정확성**
- 모든 타입 검증
- 에러 처리 완벽
- 예외 상황 대비

### 2. **성능**
- 효율적인 알고리즘
- 메모리 최적화
- 불필요한 연산 제거

### 3. **확장성**
- 모듈화된 설계
- 표준 라이브러리 확장 용이
- 새로운 OpCode 추가 가능

### 4. **유지보수성**
- 명확한 코드 구조
- 충분한 문서
- 테스트 커버리지

---

## 🚀 향후 개선

### Phase 7: 웹 REPL
- 브라우저에서 코드 실행
- xterm.js 기반 대화형 환경

### Phase 8: JIT 컴파일
- 자주 사용되는 코드 최적화
- 성능 50% 향상

### Phase 9: 분산 실행
- 다중 VM 조율
- 네트워크 기반 실행

---

**Last Updated: 2026-04-05**
