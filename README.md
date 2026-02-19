# FreeLang v4

**"AI가 생성한 코드가 컴파일을 통과하면, 그 코드는 안전하다."**

## 개요

AI-First 프로그래밍 언어. null 없음, 묵시적 변환 없음, use-after-move 컴파일 에러.

```
source.fl → Lexer → Parser → TypeChecker → Compiler → VM
```

## 실행

```bash
npx ts-node src/main.ts examples/hello.fl
npx ts-node src/main.ts examples/factorial.fl
npx ts-node src/main.ts examples/fizzbuzz.fl --dump-bc
```

## 코드 예시

```freelang
fn factorial(n: i32): i32 {
  if n <= 1 { return 1 }
  return n * factorial(n + -1)
}

for i in range(1, 11) {
  println(str(i) + "! = " + str(factorial(i)))
}
```

```freelang
fn sum(arr: [i32]): i32 {
  var total: i32 = 0
  for x in arr {
    total = total + x
  }
  return total
}

var nums = [1, 2, 3, 4, 5]
println(str(sum(nums)))
```

## 핵심 기능

| 기능 | 내용 |
|------|------|
| 타입 | i32, i64, f64, bool, string, [T], {fields}, Option\<T\>, Result\<T,E\>, channel\<T\> |
| 메모리 | Scope Drop + Move semantics (GC 없음) |
| 동시성 | Actor + Channel (cooperative scheduling) |
| 에러 | Result\<T,E\> + ? 연산자, panic = Actor만 죽임 |
| 루프 | for...in only (무한 루프 방지) |
| 내장 함수 | ~30개 (println, str, range, length, push, pop, abs, min, max, pow, sqrt 등) |

## 구현 현황

### 1부: 설계 명세 (10 Steps 완료)

| Step | 문서 | 핵심 결정 |
|------|------|----------|
| 1 | SPEC_01 페르소나 | 타겟: AI 에이전트 |
| 2 | SPEC_02 Core Language | Stack VM, 45 opcodes |
| 3 | SPEC_03 ISA + Panic | 바이트코드 확정 |
| 4 | SPEC_04 Lexical | 50 토큰, 13 키워드 |
| 5 | SPEC_05 Syntax | RD + Pratt 하이브리드 |
| 6 | SPEC_06 Type System | 10종 타입 |
| 7 | SPEC_07 Memory | Move/Copy 분리 |
| 8 | SPEC_08 Scope | 블록 스코프, 전방참조 |
| 9 | SPEC_09 Control Flow | for...in, Result + ? |
| 10 | SPEC_10 Modularity | v4 = 핵, v5 = 살 |

### 2부: 구현 (6 Phases 완료)

| Phase | 파일 | LOC | Tests |
|-------|------|-----|-------|
| 1. Lexer | `lexer.ts` | 452 | 37 |
| 2. Parser/AST | `ast.ts` + `parser.ts` | 784 | 116 |
| 3. TypeChecker | `checker.ts` | 881 | 46 |
| 4. Compiler | `compiler.ts` | 780 | 54 |
| 5. VM | `vm.ts` | 743 | 62 |
| 6. CLI | `main.ts` | 92 | - |
| **합계** | | **5,764** | **315** |

## 프로젝트 구조

```
freelang-v4/
├── spec/                    # 설계 명세 (18개 문서, 9,136 LOC)
├── src/
│   ├── lexer.ts             # 토큰화 (50 토큰)
│   ├── ast.ts               # AST 노드 정의
│   ├── parser.ts            # RD + Pratt 파서
│   ├── checker.ts           # 타입 체커 (Move/Copy 추적)
│   ├── compiler.ts          # AST → 바이트코드 (45 opcodes)
│   ├── vm.ts                # Stack VM (Actor scheduling)
│   ├── main.ts              # CLI 진입점
│   ├── lexer.test.ts        # 37 tests
│   ├── parser.test.ts       # 116 tests
│   ├── checker.test.ts      # 46 tests
│   ├── compiler.test.ts     # 54 tests
│   └── vm.test.ts           # 62 tests
├── examples/
│   ├── hello.fl
│   ├── factorial.fl
│   └── fizzbuzz.fl
├── tsconfig.json
└── README.md
```

## 테스트

```bash
npx ts-node src/lexer.test.ts
npx ts-node src/parser.test.ts
npx ts-node src/checker.test.ts
npx ts-node src/compiler.test.ts
npx ts-node src/vm.test.ts
```

315 assertions, 0 failures.

## v4의 한계 (의도적)

모듈/import 없음, FFI 없음, 일급 함수 없음, struct 선언 없음, while/break 없음 → v5에서 추가. v4 코드는 v5에서 그대로 컴파일 보장.

## 총계

```
명세:  9,136 LOC (18개 문서)
코드:  5,764 LOC (11개 파일)
예제:     24 LOC (3개 .fl)
합계: 14,924 LOC
```
