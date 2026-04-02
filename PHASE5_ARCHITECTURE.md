# Phase 5 아키텍처 및 상세 설계

**작성일**: 2026-04-02
**상태**: ✅ 아키텍처 설계 완료
**목표**: if/while/return 제어 흐름 구현 설계

---

## 1. 전체 아키텍처

### 1.1 컴파일러 파이프라인

```
┌─────────────────────────────────────────────────────────┐
│ FreeLang v4 Bootstrap Compiler Architecture             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  입력: FreeLang 소스코드 (.fl)                          │
│    │                                                     │
│    ├─→ [PHASE 1: LEXER]                                 │
│    │   ├─ 문자 단위 순회                                │
│    │   ├─ 토큰 분류 (키워드, 식별자, 연산자)          │
│    │   └─ 토큰 배열 생성                                │
│    │                                                     │
│    ├─→ [PHASE 2: PARSER]                                │
│    │   ├─ 토큰 시퀀스 파싱                              │
│    │   ├─ AST 노드 생성                                 │
│    │   └─ 구문 검증                                      │
│    │                                                     │
│    ├─→ [PHASE 3: COMPILER]                              │
│    │   ├─ AST 트래버스                                  │
│    │   ├─ 바이트코드 생성                                │
│    │   ├─ 상수 풀 관리                                   │
│    │   └─ 백패칭 (점프 오프셋)                         │
│    │                                                     │
│    └─→ 출력: 바이트코드 배열 + 상수 풀                 │
│         (VM에서 실행)                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 런타임 스택 머신

```
┌─────────────────────┐
│  평가 스택 (임시)   │  ← PUSH, POP, 연산 결과
├─────────────────────┤
│  PC (프로그램카운터) │  ← 바이트코드 실행 위치
├─────────────────────┤
│  전역 변수 저장소   │  ← STORE 0, STORE 1, ...
│  [0] x             │
│  [1] y             │
│  [2] z             │
└─────────────────────┘
```

---

## 2. Phase 5 상세 설계

### 2.1 토큰 정의

```
기존 (Phase 3)
────────────────────────────────
TOK_VAR    = 1      // var 키워드
TOK_IDENT  = 2      // 식별자
TOK_INT    = 3      // 정수
TOK_EQ     = 4      // = (대입)
TOK_SEMI   = 5      // ;
TOK_EOF    = 6      // 파일 끝
TOK_PLUS   = 7      // +

추가 (Phase 5)
────────────────────────────────
TOK_IF     = 10     // if 키워드
TOK_ELSE   = 11     // else 키워드
TOK_WHILE  = 12     // while 키워드
TOK_RETURN = 13     // return 키워드
TOK_LBRACE = 14     // {
TOK_RBRACE = 15     // }
TOK_LPAREN = 16     // (
TOK_RPAREN = 17     // )
TOK_LT     = 18     // <
TOK_GT     = 19     // >
TOK_LE     = 20     // <=
TOK_GE     = 21     // >=
TOK_EQ_EQ  = 22     // ==
TOK_NE     = 23     // !=
TOK_MINUS  = 24     // -
TOK_STAR   = 25     // *
TOK_SLASH  = 26     // /
```

### 2.2 AST 노드 타입

```
기존 (Phase 3)
────────────────────────────────
NODE_VAR   = 10     // var x = 값
NODE_INT   = 20     // 정수 리터럴

추가 (Phase 5)
────────────────────────────────
NODE_IDENT   = 21   // 변수 참조
NODE_BINOP   = 30   // 이진 연산: a op b
NODE_IF      = 31   // if 문
NODE_WHILE   = 32   // while 문
NODE_RETURN  = 33   // return 문
NODE_BLOCK   = 34   // { ... } 블록

이진 연산자
────────────────────────────────
BINOP_LT    = 40
BINOP_GT    = 41
BINOP_LE    = 42
BINOP_GE    = 43
BINOP_EQ    = 44
BINOP_NE    = 45
BINOP_PLUS  = 46
BINOP_MINUS = 47
BINOP_STAR  = 48
BINOP_SLASH = 49
```

### 2.3 옵코드 (Opcodes)

```
기존 (Phase 3)
────────────────────────────────
OP_PUSH_I32    = 1   // 스택에 i32 상수 push
OP_STORE       = 49  // 변수에 스택 최상단 값 저장
OP_HALT        = 67  // 프로그램 종료

추가 (Phase 5)
────────────────────────────────
OP_LOAD         = 50  // 변수값을 스택에 push
OP_CMP          = 51  // 비교 연산 (스택 상단 2개 값)
OP_JMP          = 52  // 무조건 점프
OP_JMP_IF_FALSE = 53  // 거짓이면 점프
OP_RETURN       = 54  // 함수 반환
OP_POP          = 55  // 스택 최상단 값 제거
OP_ADD          = 56  // 더하기 (스택 상단 2개)
OP_SUB          = 57  // 빼기
OP_MUL          = 58  // 곱하기
OP_DIV          = 59  // 나누기

형식:
────────────────────────────────
OP_PUSH_I32
  [0]   OP_PUSH_I32 (1)
  [1:4] i32 값 (little-endian)

OP_STORE / OP_LOAD
  [0]   OP_STORE/OP_LOAD
  [1:4] 변수 인덱스 (little-endian)

OP_JMP / OP_JMP_IF_FALSE
  [0]   OP_JMP/OP_JMP_IF_FALSE
  [1:4] 점프 목표 오프셋 (little-endian)

OP_CMP
  [0]   OP_CMP
  [1:4] 비교 연산자 코드 (BINOP_LT, BINOP_GT, ...)

산술 연산 (OP_ADD, OP_SUB, OP_MUL, OP_DIV)
  [0]   OP_*
  (추가 정보 없음, 스택의 상단 2개 값 사용)
```

---

## 3. Lexer 상세 설계

### 3.1 Lexer 상태 머신

```
초기 상태
  │
  ├─→ 공백 → 건너뛰기 → 초기 상태
  │
  ├─→ 알파벳 [a-zA-Z]
  │     │
  │     └─→ 단어 수집 [a-zA-Z0-9]*
  │           │
  │           ├─→ "var" → TOK_VAR
  │           ├─→ "if" → TOK_IF
  │           ├─→ "else" → TOK_ELSE
  │           ├─→ "while" → TOK_WHILE
  │           ├─→ "return" → TOK_RETURN
  │           └─→ 기타 → TOK_IDENT
  │
  ├─→ 숫자 [0-9]
  │     │
  │     └─→ 숫자 수집 [0-9]*
  │           │
  │           └─→ TOK_INT
  │
  ├─→ 연산자
  │     ├─→ "=" → 다음 문자 확인
  │     │      ├─→ "=" → TOK_EQ_EQ
  │     │      └─→ 기타 → TOK_EQ
  │     ├─→ "<" → TOK_LT 또는 "<=" → TOK_LE
  │     ├─→ ">" → TOK_GT 또는 ">=" → TOK_GE
  │     ├─→ "!" → "=" → TOK_NE
  │     ├─→ "+" → TOK_PLUS
  │     ├─→ "-" → TOK_MINUS
  │     ├─→ "*" → TOK_STAR
  │     ├─→ "/" → TOK_SLASH
  │     ├─→ "(" → TOK_LPAREN
  │     ├─→ ")" → TOK_RPAREN
  │     ├─→ "{" → TOK_LBRACE
  │     ├─→ "}" → TOK_RBRACE
  │     └─→ ";" → TOK_SEMI
  │
  └─→ EOF → TOK_EOF

구현 방식: 선형 루프 (상태 머신 없이)
  i = 0
  while i < length(source) {
    c = char_at(source, i)

    if is_whitespace(c):
      i++
    else if is_letter(c):
      word = read_word()
      classify_as_keyword_or_ident()
    else if is_digit(c):
      num = read_digits()
      push(TOK_INT)
    else if is_operator(c):
      classify_operator()
  }
```

### 3.2 Lexer 구현 함수

```freelang
// 문자가 알파벳인지 확인
fn is_letter(c: str) -> bool {
  var code = char_code(c)
  return (code >= 65 && code <= 90) ||  // A-Z
         (code >= 97 && code <= 122)    // a-z
}

// 문자가 숫자인지 확인
fn is_digit(c: str) -> bool {
  var code = char_code(c)
  return code >= 48 && code <= 57  // 0-9
}

// 문자가 공백인지 확인
fn is_whitespace(c: str) -> bool {
  var code = char_code(c)
  return code == 32 ||  // space
         code == 9 ||   // tab
         code == 10 ||  // newline
         code == 13     // carriage return
}

// 단어 읽기 (알파벳 + 숫자)
fn read_word() -> str {
  var word = ""
  while li < length(source) {
    var ch = char_at(source, li)
    if !is_letter(ch) && !is_digit(ch) {
      break
    }
    word = word + ch
    li = li + 1
  }
  return word
}

// 숫자 읽기
fn read_number() -> str {
  var num = ""
  while li < length(source) {
    var ch = char_at(source, li)
    if !is_digit(ch) {
      break
    }
    num = num + ch
    li = li + 1
  }
  return num
}

// 키워드 분류
fn classify_keyword(word: str) -> i32 {
  if word == "var" { return TOK_VAR }
  if word == "if" { return TOK_IF }
  if word == "else" { return TOK_ELSE }
  if word == "while" { return TOK_WHILE }
  if word == "return" { return TOK_RETURN }
  return TOK_IDENT
}
```

---

## 4. Parser 상세 설계

### 4.1 Parser 재귀 강하 파싱 (Recursive Descent Parsing)

```
parse_program()
  ├─ while token != EOF
  │   ├─ parse_statement()
  │   │   ├─ if token == VAR:
  │   │   │    └─ parse_var_statement()
  │   │   ├─ if token == IF:
  │   │   │    └─ parse_if_statement()
  │   │   ├─ if token == WHILE:
  │   │   │    └─ parse_while_statement()
  │   │   ├─ if token == RETURN:
  │   │   │    └─ parse_return_statement()
  │   │   └─ else: error()
  │   │
  │   └─ push(statements, parsed_stmt)
  │
  └─ return statements

parse_expr() 우선순위
─────────────────────────────
  parse_or_expr()
    ├─ parse_and_expr()
    │   ├─ parse_comparison_expr()
    │   │   ├─ parse_additive_expr()
    │   │   │   ├─ parse_mult_expr()
    │   │   │   │   ├─ parse_primary_expr()
    │   │   │   │   │   ├─ INT
    │   │   │   │   │   ├─ IDENT
    │   │   │   │   │   └─ (expr)
    │   │   │   │   │
    │   │   │   │   ├─ * op
    │   │   │   │   └─ parse_mult_expr()
    │   │   │   │
    │   │   │   ├─ + or - op
    │   │   │   └─ parse_additive_expr()
    │   │   │
    │   │   ├─ <, >, <=, >=, ==, != op
    │   │   └─ parse_comparison_expr()
```

### 4.2 Parser 함수들

```freelang
fn peek() -> i32 {
  if parser_pos < length(lexeme_types) {
    return lexeme_types[parser_pos]
  }
  return TOK_EOF
}

fn advance() -> void {
  parser_pos = parser_pos + 1
}

fn current_lexeme() -> str {
  if parser_pos < length(lexeme_values) {
    return lexeme_values[parser_pos]
  }
  return ""
}

fn expect(tok: i32) -> bool {
  if peek() == tok {
    advance()
    return true
  }
  return false
}

fn parse_var_statement() -> AST_Node {
  // var name = expr ;
  advance()  // var 키워드 건너뛰기

  var name = current_lexeme()
  advance()  // 변수명 건너뛰기

  expect(TOK_EQ)  // = 기대

  var expr = parse_expr()

  if peek() == TOK_SEMI {
    advance()
  }

  return AST_Node {
    type: NODE_VAR,
    name: name,
    expr: expr
  }
}

fn parse_if_statement() -> AST_Node {
  advance()  // if 키워드 건너뛰기

  expect(TOK_LPAREN)

  var cond = parse_expr()

  expect(TOK_RPAREN)

  expect(TOK_LBRACE)

  var then_block = parse_block()

  expect(TOK_RBRACE)

  var else_block = -1

  if peek() == TOK_ELSE {
    advance()
    expect(TOK_LBRACE)
    else_block = parse_block()
    expect(TOK_RBRACE)
  }

  return AST_Node {
    type: NODE_IF,
    cond: cond,
    then_block: then_block,
    else_block: else_block
  }
}

fn parse_block() -> [AST_Node] {
  var statements = []

  while peek() != TOK_RBRACE && peek() != TOK_EOF {
    var stmt = parse_statement()
    if stmt != -1 {
      push(statements, stmt)
    }
  }

  return statements
}

fn parse_expr() -> AST_Node {
  return parse_comparison_expr()
}

fn parse_comparison_expr() -> AST_Node {
  var left = parse_additive_expr()

  var op = peek()
  if op == TOK_LT || op == TOK_GT || op == TOK_LE ||
     op == TOK_GE || op == TOK_EQ_EQ || op == TOK_NE {
    advance()
    var right = parse_additive_expr()

    return AST_Node {
      type: NODE_BINOP,
      op: op,
      left: left,
      right: right
    }
  }

  return left
}

fn parse_additive_expr() -> AST_Node {
  var left = parse_mult_expr()

  while peek() == TOK_PLUS || peek() == TOK_MINUS {
    var op = peek()
    advance()
    var right = parse_mult_expr()

    left = AST_Node {
      type: NODE_BINOP,
      op: op,
      left: left,
      right: right
    }
  }

  return left
}

fn parse_mult_expr() -> AST_Node {
  var left = parse_primary_expr()

  while peek() == TOK_STAR || peek() == TOK_SLASH {
    var op = peek()
    advance()
    var right = parse_primary_expr()

    left = AST_Node {
      type: NODE_BINOP,
      op: op,
      left: left,
      right: right
    }
  }

  return left
}

fn parse_primary_expr() -> AST_Node {
  var tok = peek()

  if tok == TOK_INT {
    var val = current_lexeme()
    advance()
    return AST_Node { type: NODE_INT, val: val }
  }

  if tok == TOK_IDENT {
    var name = current_lexeme()
    advance()
    return AST_Node { type: NODE_IDENT, name: name }
  }

  if tok == TOK_LPAREN {
    advance()
    var expr = parse_expr()
    expect(TOK_RPAREN)
    return expr
  }

  return -1  // error
}
```

---

## 5. Compiler 상세 설계

### 5.1 컴파일 알고리즘

```
compile_program(ast_statements)
  for each stmt in ast_statements {
    compile_statement(stmt)
  }
  push(bytecode, OP_HALT)

compile_statement(stmt)
  switch stmt.type {
    NODE_VAR:
      compile_expr(stmt.expr)
      push(bytecode, OP_STORE)
      push(bytecode, var_index_in_global_table)

    NODE_IF:
      compile_expr(stmt.cond)
      false_jump_addr = length(bytecode)
      push(bytecode, OP_JMP_IF_FALSE)
      push(bytecode, 0)  // 백패치 예정

      compile_block(stmt.then_block)

      if stmt.else_block != -1 {
        end_jump_addr = length(bytecode)
        push(bytecode, OP_JMP)
        push(bytecode, 0)  // 백패치 예정

        bytecode[false_jump_addr + 1] = length(bytecode)

        compile_block(stmt.else_block)

        bytecode[end_jump_addr + 1] = length(bytecode)
      } else {
        bytecode[false_jump_addr + 1] = length(bytecode)
      }

    NODE_WHILE:
      loop_start = length(bytecode)

      compile_expr(stmt.cond)
      exit_addr = length(bytecode)
      push(bytecode, OP_JMP_IF_FALSE)
      push(bytecode, 0)  // 백패치 예정

      compile_block(stmt.body)

      push(bytecode, OP_JMP)
      push(bytecode, loop_start)

      bytecode[exit_addr + 1] = length(bytecode)

    NODE_RETURN:
      compile_expr(stmt.expr)
      push(bytecode, OP_RETURN)
  }

compile_expr(expr)
  switch expr.type {
    NODE_INT:
      push(bytecode, OP_PUSH_I32)
      push_i32_little_endian(bytecode, expr.val)

    NODE_IDENT:
      push(bytecode, OP_LOAD)
      push_i32_little_endian(bytecode, get_var_index(expr.name))

    NODE_BINOP:
      compile_expr(expr.left)
      compile_expr(expr.right)

      switch expr.op {
        TOK_LT, TOK_GT, TOK_LE, TOK_GE, TOK_EQ_EQ, TOK_NE:
          push(bytecode, OP_CMP)
          push(bytecode, get_binop_code(expr.op))

        TOK_PLUS:
          push(bytecode, OP_ADD)

        TOK_MINUS:
          push(bytecode, OP_SUB)

        TOK_STAR:
          push(bytecode, OP_MUL)

        TOK_SLASH:
          push(bytecode, OP_DIV)
      }
  }
```

### 5.2 백패칭 (Backpatching) 기법

```
문제: 점프 명령어를 생성할 때 목표 주소를 아직 모름

해결:
  1. 점프 명령어 생성
     addr = length(bytecode)
     push(bytecode, OP_JMP_IF_FALSE)
     push(bytecode, 0)  // 임시값

  2. 중간 코드 생성 (then 블록)
     ...

  3. 점프 목표 주소 결정
     target = length(bytecode)

  4. 백패칭 (목표 주소를 해당 위치에 덮어쓰기)
     bytecode[addr+1] = bitand(target, 255)
     bytecode[addr+2] = bitand(shr(target, 8), 255)
     bytecode[addr+3] = bitand(shr(target, 16), 255)
     bytecode[addr+4] = bitand(shr(target, 24), 255)
```

### 5.3 예제: if 문 컴파일

```
입력 AST:
if (x < 5) {
  var y = 10
} else {
  var y = 20
}

컴파일 단계:

[1] 조건 컴파일 (x < 5)
  PUSH_I32 x_val
  LOAD 0           (변수 x 로드)
  PUSH_I32 5
  CMP LT           (스택: [0 또는 1])

  바이트코드:
  [0]   OP_LOAD
  [1:4] 0 (x의 인덱스)
  [5]   OP_PUSH_I32
  [6:9] 5
  [10]  OP_CMP
  [11:14] BINOP_LT

[2] JMP_IF_FALSE 생성 (오프셋 백패치 예정)
  바이트코드:
  [15]  OP_JMP_IF_FALSE
  [16:19] 0 (백패치 예정)

[3] then 블록 컴파일 (var y = 10)
  바이트코드:
  [20]  OP_PUSH_I32
  [21:24] 10
  [25]  OP_STORE
  [26:29] 1 (y의 인덱스)

[4] JMP end 생성
  바이트코드:
  [30]  OP_JMP
  [31:34] 0 (백패치 예정)

[5] JMP_IF_FALSE 백패치
  현재 위치 = 35
  bytecode[16:19] = 35 (현재 위치)

[6] else 블록 컴파일 (var y = 20)
  바이트코드:
  [35]  OP_PUSH_I32
  [36:39] 20
  [40]  OP_STORE
  [41:44] 1 (y의 인덱스)

[7] JMP end 백패치
  현재 위치 = 45
  bytecode[31:34] = 45 (현재 위치)

[8] 프로그램 끝
  바이트코드:
  [45]  OP_HALT
```

---

## 6. 테스트 전략

### 6.1 단위 테스트 (Unit Test)

```
Lexer 테스트
  └─ test_lex_keywords()       // if, while, return 등
  └─ test_lex_operators()      // <, >, ==, != 등
  └─ test_lex_complex()        // 복합 입력

Parser 테스트
  └─ test_parse_expr()         // 표현식 파싱
  └─ test_parse_if()           // if 문 파싱
  └─ test_parse_while()        // while 루프 파싱
  └─ test_parse_nested()       // 중첩 구조

Compiler 테스트
  └─ test_compile_if_bytecode()     // if 바이트코드 검증
  └─ test_compile_while_bytecode()  // while 바이트코드 검증
  └─ test_backpatch_offsets()       // 백패치 정확성
```

### 6.2 통합 테스트 (Integration Test)

```
E2E 테스트
  └─ test_e2e_simple_if()      // if만 포함
  └─ test_e2e_if_else()        // if-else
  └─ test_e2e_while_loop()     // while 루프
  └─ test_e2e_factorial()      // 복합 (while + if + 변수)
  └─ test_e2e_fibonacci()      // 피보나치
```

---

## 7. 에러 처리

### 7.1 컴파일 에러

```
Lexer 에러
  ├─ Unexpected character: 인식할 수 없는 문자
  └─ Invalid number format: 잘못된 숫자 형식

Parser 에러
  ├─ Expected '(' after if: 문법 오류
  ├─ Unexpected token: 예상하지 못한 토큰
  ├─ Mismatched braces: 괄호 불일치
  └─ Undefined variable: 정의되지 않은 변수

Compiler 에러
  ├─ Variable not found in symbol table
  ├─ Offset overflow: 점프 오프셋이 너무 큼
  └─ Invalid opcode
```

### 7.2 에러 복구

```freelang
// 파서 에러 복구: 다음 문장으로 건너뛰기
fn parse_statement() {
  try {
    return parse_single_statement()
  } catch {
    // 오류 보고
    println("ERROR at line " + str(parser_pos))

    // 복구: 다음 ; 또는 }까지 건너뛰기
    while peek() != TOK_SEMI && peek() != TOK_RBRACE && peek() != TOK_EOF {
      advance()
    }

    return -1  // error node
  }
}
```

---

## 8. 최적화 전략

### 8.1 상수 폴딩 (Constant Folding)

```freelang
// 컴파일 타임 최적화
if (5 + 3) { ... }

컴파일 전: 5 + 3 = 8 계산하여 PUSH_I32 8로 최적화
컴파일 후:
  PUSH_I32 8
  CMP ...
```

### 8.2 데드 코드 제거 (Dead Code Elimination)

```freelang
if (1) {      // 항상 참
  var x = 10
} else {
  var y = 20  // 데드 코드 (실행 불가)
}

최적화: else 블록 제거
```

### 8.3 점프 체인 제거 (Jump Chain Elimination)

```freelang
JMP label1
...
label1: JMP label2
...
label2: ...

최적화: 직접 label2로 점프
```

---

## 9. 성능 예상

| 메트릭 | 값 |
|--------|-----|
| 최대 프로그램 크기 | 10KB 바이트코드 |
| 최대 변수 수 | 256개 (인덱스 1 바이트) |
| 최대 루프 깊이 | 미제한 |
| 실행 속도 | <100ms (작은 프로그램) |
| 메모리 사용 | ~1MB (전체 파이프라인) |

---

## 10. 다음 Phase 준비

### Phase 6: 함수 정의 (Functions)
```
fn add(a: i32, b: i32) -> i32 {
  return a + b
}
```

### Phase 7: 배열 (Arrays)
```
var arr = [1, 2, 3, 4, 5]
var sum = arr[0] + arr[1]
```

### Phase 8: 구조체 (Structs)
```
struct Point {
  x: i32
  y: i32
}
```

---

**문서 작성**: Claude Haiku 4.5 Agent
**버전**: 1.0
**상태**: ✅ 완료
