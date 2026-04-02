# FreeLang v4 Bootstrap Phase 5 설계: 제어 흐름 지원

**작성일**: 2026-04-02
**상태**: ✅ 설계 문서
**목표**: if/else, while, return 문 구현

---

## 📋 개요

Phase 3에서는 변수 선언(var)만 지원하고 있습니다. Phase 5에서는 **제어 흐름** (if/else, while, return)을 추가하여 튜링 완전한 언어를 구현합니다.

### 현재 상태 (Phase 3)
- ✅ Lexer: 기본 토큰화 (var, 식별자, 숫자, 연산자)
- ✅ Parser: VAR 문장만 지원
- ✅ Compiler: PUSH_I32, STORE_GLOBAL 만 구현

### 목표 상태 (Phase 5 완료)
- ✅ Lexer: if, else, while, return 키워드 추가
- ✅ Parser: if/else 블록, while 루프, return 문 파싱
- ✅ Compiler: 조건부 점프, 루프 백패칭, 함수 반환 구현

---

## 1. 렉서(Lexer) 확장

### 1.1 새 토큰 추가

```freelang
var TOK_IF: i32 = 10
var TOK_ELSE: i32 = 11
var TOK_WHILE: i32 = 12
var TOK_RETURN: i32 = 13
var TOK_LBRACE: i32 = 14   // {
var TOK_RBRACE: i32 = 15   // }
var TOK_LPAREN: i32 = 16   // (
var TOK_RPAREN: i32 = 17   // )
var TOK_LT: i32 = 18       // <
var TOK_GT: i32 = 19       // >
var TOK_LE: i32 = 20       // <=
var TOK_GE: i32 = 21       // >=
var TOK_EQ_EQ: i32 = 22    // ==
var TOK_NE: i32 = 23       // !=
```

### 1.2 키워드 인식

```freelang
// 구현: word 저장 후 키워드 확인
if word == "if" {
  tok_type = TOK_IF
} else if word == "else" {
  tok_type = TOK_ELSE
} else if word == "while" {
  tok_type = TOK_WHILE
} else if word == "return" {
  tok_type = TOK_RETURN
}
```

### 1.3 중괄호 및 괄호 처리

```freelang
// 문자별 처리 확장
if c == "{" {
  li = li + 1
  push(lexeme_types, TOK_LBRACE)
  push(lexeme_values, "{")
  continue
}

if c == "}" {
  li = li + 1
  push(lexeme_types, TOK_RBRACE)
  push(lexeme_values, "}")
  continue
}

// 유사하게 (), <, >, <= 등 처리
```

### 1.4 비교 연산자 처리

```freelang
// 2자 연산자: ==, !=, <=, >=
if c == "=" {
  if li + 1 < length(source) && char_at(source, li + 1) == "=" {
    li = li + 2
    push(lexeme_types, TOK_EQ_EQ)
    push(lexeme_values, "==")
  } else {
    li = li + 1
    push(lexeme_types, TOK_EQ)
    push(lexeme_values, "=")
  }
  continue
}
```

---

## 2. 파서(Parser) 확장

### 2.1 새 AST 노드 타입

```freelang
var NODE_IF: i32 = 30
var NODE_WHILE: i32 = 31
var NODE_RETURN: i32 = 32
var NODE_BLOCK: i32 = 33
var NODE_BINOP: i32 = 34    // 이진 연산 (a < b)

var BINOP_LT: i32 = 40
var BINOP_GT: i32 = 41
var BINOP_LE: i32 = 42
var BINOP_GE: i32 = 43
var BINOP_EQ: i32 = 44
var BINOP_NE: i32 = 45
```

### 2.2 AST 저장 구조

이전과는 다르게 더 복잡한 구조를 담기 위해:

```freelang
// 기존 방식 확장 (직렬화된 트리)
var ast_types = []      // NODE_* 상수
var ast_fields = []     // 각 노드의 메타데이터
var ast_children = []   // 자식 노드 인덱스들

// 예: NODE_IF
// ast_types[i] = NODE_IF
// ast_fields[i] = "cond_idx,then_idx,else_idx"  (문자열로 저장)
```

### 2.3 표현식 파싱

```freelang
// parse_expr(): 이진 연산 지원
// 입력: "x < 10"
// 출력: NODE_BINOP { left: IDENT(x), op: LT, right: INT(10) }

fn parse_expr(start_pos) -> expr_struct {
  // 1. 좌항 (정수 또는 식별자)
  var left = parse_primary(start_pos)

  // 2. 연산자 확인
  var next_tok = lexeme_types[parser_pos]

  if next_tok == TOK_LT || next_tok == TOK_GT {
    // 3. 우항 파싱
    var right = parse_primary(parser_pos + 1)

    // 4. BINOP 노드 생성
    return {type: NODE_BINOP, op: next_tok, left: left, right: right}
  }

  return left
}
```

### 2.4 if 문 파싱

```
if <expr> { <statements> } [else { <statements> }]
```

```freelang
if tok_type == TOK_IF {
  parser_pos = parser_pos + 1

  // 조건 파싱
  var cond_node = parse_expr(parser_pos)
  parser_pos = ... // 조건 파싱 후 위치

  // { 확인
  expect(TOK_LBRACE)

  // 참 블록 파싱
  var then_block = parse_block()

  // else 확인
  var else_block = -1
  if parser_pos < length(lexeme_types) && lexeme_types[parser_pos] == TOK_ELSE {
    parser_pos = parser_pos + 1
    expect(TOK_LBRACE)
    else_block = parse_block()
  }

  // NODE_IF 생성
  var node_idx = create_if_node(cond_node, then_block, else_block)
}
```

### 2.5 while 문 파싱

```
while <expr> { <statements> }
```

```freelang
if tok_type == TOK_WHILE {
  parser_pos = parser_pos + 1

  var cond_node = parse_expr(parser_pos)
  expect(TOK_LBRACE)
  var body_block = parse_block()

  var node_idx = create_while_node(cond_node, body_block)
}
```

### 2.6 return 문 파싱

```
return <expr>
```

```freelang
if tok_type == TOK_RETURN {
  parser_pos = parser_pos + 1

  // 값 파싱 (식별자, 숫자, 또는 표현식)
  var return_value = parse_expr(parser_pos)

  var node_idx = create_return_node(return_value)
}
```

---

## 3. 컴파일러(Compiler) 확장

### 3.1 새 옵코드

```freelang
var OP_PUSH_I32: i32 = 1
var OP_STORE: i32 = 49
var OP_HALT: i32 = 67

var OP_LOAD: i32 = 50           // 변수 로드
var OP_CMP: i32 = 51            // 비교 연산
var OP_JMP: i32 = 52            // 무조건 점프
var OP_JMP_IF_FALSE: i32 = 53   // 거짓이면 점프
var OP_RETURN: i32 = 54
var OP_POP: i32 = 55            // 스택 팝
```

### 3.2 스택 머신 모델

```
┌─────────────────┐
│   스택 톱       │  (임시 값)
├─────────────────┤
│   지역 변수     │  (함수 프레임)
├─────────────────┤
│   전역 변수     │  (STORE_GLOBAL)
└─────────────────┘

바이트코드: [OP_PUSH_I32, val, OP_STORE, idx, ...]
```

### 3.3 비교 연산 코드 생성

```freelang
// NODE_BINOP 컴파일
// 입력: x < 10
// 출력:
//   PUSH x_val      (또는 LOAD x_idx)
//   PUSH 10
//   CMP LT
//   (결과: 스택에 0 또는 1)

if ast_types[i] == NODE_BINOP {
  var left_val = compile_expr(left)   // 좌항 값 스택에 push
  var right_val = compile_expr(right) // 우항 값 스택에 push

  push(bytecode, OP_CMP)
  push(bytecode, binop_op)  // BINOP_LT, BINOP_GT 등
}
```

### 3.4 조건부 점프 (if 문)

```freelang
// if (x < 10) { ... } else { ... }
// 바이트코드:
//   [조건 계산]     (결과: 스택에 0 또는 1)
//   JMP_IF_FALSE else_label
//   [then 블록]
//   JMP end_label
// else_label:
//   [else 블록]
// end_label:

if ast_types[i] == NODE_IF {
  // 1. 조건 컴파일
  compile_expr(condition)

  // 2. JMP_IF_FALSE 생성 (아직 목표 주소 미정)
  var false_jump_idx = length(bytecode)
  push(bytecode, OP_JMP_IF_FALSE)
  push(bytecode, 0)  // 백패치 예정
  push(bytecode, 0)

  // 3. then 블록 컴파일
  compile_block(then_block)

  // 4. else 블록이 있으면
  if else_block != -1 {
    var end_jump_idx = length(bytecode)
    push(bytecode, OP_JMP)
    push(bytecode, 0)  // 백패치 예정

    // false_jump 목표를 현재 위치로 백패치
    bytecode[false_jump_idx + 1] = length(bytecode)

    compile_block(else_block)

    // end_jump 목표를 현재 위치로 백패치
    bytecode[end_jump_idx + 1] = length(bytecode)
  } else {
    // false_jump 목표를 현재 위치로 백패치
    bytecode[false_jump_idx + 1] = length(bytecode)
  }
}
```

### 3.5 루프 (while 문)

```freelang
// while (x < 10) { ... }
// 바이트코드:
// loop_start:
//   [조건 계산]
//   JMP_IF_FALSE loop_end
//   [body]
//   JMP loop_start
// loop_end:

if ast_types[i] == NODE_WHILE {
  // 1. 루프 시작 주소 저장
  var loop_start = length(bytecode)

  // 2. 조건 컴파일
  compile_expr(condition)

  // 3. JMP_IF_FALSE 생성
  var exit_jump_idx = length(bytecode)
  push(bytecode, OP_JMP_IF_FALSE)
  push(bytecode, 0)  // 백패치 예정

  // 4. 루프 본체 컴파일
  compile_block(body)

  // 5. 루프 시작으로 백점프
  push(bytecode, OP_JMP)
  push(bytecode, loop_start)

  // 6. exit_jump 목표를 현재 위치로 백패치
  bytecode[exit_jump_idx + 1] = length(bytecode)
}
```

### 3.6 반환 (return 문)

```freelang
if ast_types[i] == NODE_RETURN {
  // 1. 반환값 컴파일 (스택에 push)
  compile_expr(return_value)

  // 2. RETURN 옵코드
  push(bytecode, OP_RETURN)
}
```

---

## 4. 아키텍처 검토

### 4.1 현재 바이트코드 형식 분석

**장점**:
- ✅ 간단한 선형 배열 구조
- ✅ 이미 i32 값 인코딩 체계 있음 (little-endian)
- ✅ 점프 오프셋은 단순 배열 인덱스 (0-based)

**제약**:
- ❌ 점프 오프셋이 1 바이트로는 부족 (256 바이트 이상)
- ❌ 바이트코드가 256바이트를 초과하면 오프셋 오버플로우

**해결책**:
- 점프 오프셋을 4바이트 i32로 저장 (big program 지원)
```freelang
// JMP_IF_FALSE 형식
// [OP_JMP_IF_FALSE (1바이트), offset (4바이트)]
push(bytecode, OP_JMP_IF_FALSE)
push(bytecode, bitand(offset, 255))
push(bytecode, bitand(shr(offset, 8), 255))
push(bytecode, bitand(shr(offset, 16), 255))
push(bytecode, bitand(shr(offset, 24), 255))
```

### 4.2 스택/레지스터 모델

**선택: 스택 머신 (Stack Machine)**

```
장점:
- 간단한 구현
- PUSH/POP만으로 임시값 관리
- 변수 로드/저장은 index 기반

모델:
┌─────────────────────┐
│   평가 스택         │ (임시 값)
├─────────────────────┤
│   전역 변수 저장소  │ (index 0, 1, 2, ...)
└─────────────────────┘

예: var x = 5; var y = x + 10;
  PUSH_I32 5        # 스택: [5]
  STORE 0           # globals[0] = 5, 스택: []

  LOAD 0            # 스택: [5]
  PUSH_I32 10       # 스택: [5, 10]
  ADD               # 스택: [15]
  STORE 1           # globals[1] = 15, 스택: []
```

### 4.3 중첩 블록 처리

**현재 문제**: 평행 배열 구조로는 깊은 중첩 추적 어려움

**해결책 1**: 재귀 없이 반복문으로 파싱
```freelang
// parse_block()는 { 다음부터 } 전까지 모든 문장 반환
// 블록 깊이는 파서 상태에서만 관리
fn parse_block() {
  var statements = []
  while parser_pos < length(lexeme_types) && lexeme_types[parser_pos] != TOK_RBRACE {
    var stmt = parse_statement()
    push(statements, stmt)
  }
  return statements
}
```

**해결책 2**: 블록을 하나의 특별한 AST 노드로 표현
```freelang
// NODE_BLOCK: 여러 statement를 묶은 단위
// ast_types[i] = NODE_BLOCK
// ast_children[i] = [stmt1_idx, stmt2_idx, stmt3_idx]
```

---

## 5. 산출물

### 5.1 설계 문서 (본 문서)
- 렉서 확장 상세
- 파서 확장 상세
- 컴파일러 옵코드 및 코드 생성
- 아키텍처 검토

### 5.2 구현 로드맵

| Task | 시간 | 복잡도 | 의존성 |
|------|------|--------|--------|
| T1: Lexer 토큰 추가 | 2일 | 낮음 | - |
| T2: Parser 표현식 | 2일 | 중간 | T1 |
| T3: Parser if/while | 2일 | 중간 | T2 |
| T4: Compiler 옵코드 | 3일 | 높음 | T3 |
| T5: 테스트 케이스 | 2일 | 중간 | T4 |
| T6: 최적화 & 문서 | 2일 | 낮음 | T5 |
| **합계** | **13일** | - | - |

### 5.3 테스트 케이스 목록

#### Category 1: 렉서 테스트
```
✅ test_lex_if_keyword
✅ test_lex_else_keyword
✅ test_lex_while_keyword
✅ test_lex_return_keyword
✅ test_lex_braces
✅ test_lex_comparison_ops (< > <= >= == !=)
```

#### Category 2: 파서 테스트
```
✅ test_parse_simple_if
   input:  "if x < 10 { }"

✅ test_parse_if_else
   input:  "if x < 10 { var y = 5 } else { var y = 10 }"

✅ test_parse_while
   input:  "while x < 10 { var x = x + 1 }"

✅ test_parse_nested_blocks
   input:  "if a { if b { ... } }"

✅ test_parse_return
   input:  "return x"
```

#### Category 3: 컴파일 테스트
```
✅ test_compile_if_true_branch
   input:  "if 1 { var x = 10 }"
   expected: PUSH_I32(1), CMP, JMP_IF_FALSE(skip), ...

✅ test_compile_if_false_branch
   input:  "if 0 { var x = 10 } else { var x = 20 }"

✅ test_compile_while_loop
   input:  "var i = 0; while i < 3 { var i = i + 1 }"
   expected: JMP_IF_FALSE(exit), body, JMP(start), ...

✅ test_compile_nested_if
   input:  "if a { if b { var x = 1 } }"
```

#### Category 4: 통합 테스트
```
✅ test_e2e_countdown
   input:  """
           var n = 5
           while n > 0 {
             var n = n - 1
           }
           return n
           """
   expected: n = 0

✅ test_e2e_factorial
   input:  """
           var n = 5
           var result = 1
           while n > 1 {
             var result = result * n
             var n = n - 1
           }
           return result
           """
   expected: result = 120
```

### 5.4 타입 시스템 영향

**현재 제약**:
- FreeLang 타입 체커가 보수적 (동적 배열 내용 추론 안 함)

**Phase 5 대응**:
1. ✅ 평행 배열 패턴 유지 (타입 체커 호환)
2. ✅ 구조체 사용 최소화 (REPL 호환성)
3. ✅ 예외: 간단한 구조체는 수동 작성 가능
   ```freelang
   struct ExprResult {
     type: i32    // NODE_INT, NODE_IDENT, NODE_BINOP
     int_val: i32
     name: str
     op: i32
   }
   ```

---

## 6. 위험도 및 완화 전략

### 6.1 위험도 분석

| 항목 | 위험도 | 완화 전략 |
|------|--------|---------|
| 백패칭 오프셋 오류 | 🔴 높음 | 다단계 검증, 테스트 자동화 |
| 중첩 블록 파싱 | 🟡 중간 | 명시적 깊이 추적, 스택 사용 |
| 타입 체커 호환성 | 🟡 중간 | 기존 패턴(평행배열) 유지 |
| 성능 저하 | 🟢 낮음 | O(n) 선형 복잡도 유지 |

### 6.2 테스트 우선 전략

1. 각 Phase별로 먼저 테스트 작성
2. 컴파일러에서 단위 테스트 포함
3. e2e 통합 테스트로 전체 검증
4. 성능 벤치마크 (목표: <100ms 컴파일)

---

## 7. 다음 Phase 미리보기

### Phase 6: 함수 정의
```
fn add(a: i32, b: i32) -> i32 {
  return a + b
}
```
- 함수 선언 파싱
- 지역 변수 스코프
- 함수 호출 및 반환

### Phase 7: 고급 기능
```
- 배열 리터럴 [1, 2, 3]
- 구조체 정의 및 초기화
- 메서드 호출
- 패턴 매칭
```

### Phase 8: 완전한 자가호스팅
- FreeLang으로 전체 컴파일러 재구현
- TypeScript VM 의존성만 남음
- 프로덕션 레벨 성능

---

## 8. 참고 자료

### 파일
- `/freelang-v4/compiler.fl` - 현재 구현 (Phase 3)
- `/freelang-v4/compiler-advanced.fl` - 다중 VAR 지원
- `/freelang-v4/test-bootstrap.fl` - 테스트 틀

### 문서
- `BOOTSTRAP.md` - 부트스트랩 개요
- `PHASE3_COMPLETE.md` - Phase 3 완료 보고서
- `ARCHITECTURE.md` - FreeLang v4 아키텍처

### 외부 참고
- "Crafting Interpreters" (Lox 구현) - 조건문/루프 설계
- "Engineering a Compiler" - 백패칭 기법
- LLVM 바이트코드 형식 - 점프 오프셋 모델

---

## 9. 결론

### Phase 5 특징
- ✅ 제어 흐름으로 튜링 완전성 달성
- ✅ 비교 연산자 추가로 조건 검사 가능
- ✅ 백패칭으로 올바른 점프 오프셋 구현
- ✅ 중첩 블록으로 복잡한 로직 표현 가능

### 예상 성과
- 기본 알고리즘 구현 가능 (피보나치, 팩토리얼, 소트)
- Loop 최적화 기초 마련
- 다음 Phase 함수 정의를 위한 기반

### 일정
- **설계**: 2026-04-02 ✅
- **구현**: 2026-04-02 ~ 2026-04-15 (예정)
- **테스트**: 2026-04-15 ~ 2026-04-20 (예정)
- **완료**: 2026-04-20 (예정)

---

**문서 작성**: Claude Haiku 4.5 Agent
**버전**: 1.0
**상태**: ✅ 설계 완료, 구현 대기 중
