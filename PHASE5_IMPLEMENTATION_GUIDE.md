# Phase 5 구현 가이드: 제어 흐름 (if/while/return)

**버전**: 1.0
**작성일**: 2026-04-02
**상태**: ✅ 구현 준비 완료

---

## 📑 목차

1. [Task 1: Lexer 토큰 추가](#task-1-lexer-토큰-추가)
2. [Task 2: Parser 표현식 지원](#task-2-parser-표현식-지원)
3. [Task 3: Parser 제어 흐름](#task-3-parser-제어-흐름)
4. [Task 4: Compiler 옵코드](#task-4-compiler-옵코드)
5. [Task 5: 테스트](#task-5-테스트)

---

## Task 1: Lexer 토큰 추가

**예상 시간**: 2일
**파일**: `compiler.fl` PHASE 1 섹션 확장

### 구현 단계

#### Step 1.1: 토큰 상수 정의

기존 코드:
```freelang
var TOK_VAR: i32 = 1
var TOK_IDENT: i32 = 2
var TOK_INT: i32 = 3
var TOK_EQ: i32 = 4
var TOK_SEMI: i32 = 5
var TOK_EOF: i32 = 6
var TOK_PLUS: i32 = 7
```

추가 할 상수:
```freelang
var TOK_IF: i32 = 10
var TOK_ELSE: i32 = 11
var TOK_WHILE: i32 = 12
var TOK_RETURN: i32 = 13
var TOK_LBRACE: i32 = 14
var TOK_RBRACE: i32 = 15
var TOK_LPAREN: i32 = 16
var TOK_RPAREN: i32 = 17
var TOK_LT: i32 = 18
var TOK_GT: i32 = 19
var TOK_LE: i32 = 20
var TOK_GE: i32 = 21
var TOK_EQ_EQ: i32 = 22
var TOK_NE: i32 = 23
var TOK_MINUS: i32 = 24
var TOK_STAR: i32 = 25
var TOK_SLASH: i32 = 26
```

#### Step 1.2: 키워드 인식 로직

기존 `word` 처리 부분 확장:

```freelang
var tok_type = TOK_IDENT
if word == "var" {
  tok_type = TOK_VAR
} else if word == "if" {
  tok_type = TOK_IF
} else if word == "else" {
  tok_type = TOK_ELSE
} else if word == "while" {
  tok_type = TOK_WHILE
} else if word == "return" {
  tok_type = TOK_RETURN
}
```

#### Step 1.3: 괄호 및 중괄호 처리

기존 연산자 처리 섹션에 추가:

```freelang
if c == "(" {
  li = li + 1
  push(lexeme_types, TOK_LPAREN)
  push(lexeme_values, "(")
  continue
}

if c == ")" {
  li = li + 1
  push(lexeme_types, TOK_RPAREN)
  push(lexeme_values, ")")
  continue
}

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
```

#### Step 1.4: 산술 연산자 처리

```freelang
if c == "-" {
  li = li + 1
  push(lexeme_types, TOK_MINUS)
  push(lexeme_values, "-")
  continue
}

if c == "*" {
  li = li + 1
  push(lexeme_types, TOK_STAR)
  push(lexeme_values, "*")
  continue
}

if c == "/" {
  li = li + 1
  push(lexeme_types, TOK_SLASH)
  push(lexeme_values, "/")
  continue
}
```

#### Step 1.5: 비교 연산자 처리 (2자 토큰)

```freelang
// = 또는 == 처리
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

// < 또는 <= 처리
if c == "<" {
  if li + 1 < length(source) && char_at(source, li + 1) == "=" {
    li = li + 2
    push(lexeme_types, TOK_LE)
    push(lexeme_values, "<=")
  } else {
    li = li + 1
    push(lexeme_types, TOK_LT)
    push(lexeme_values, "<")
  }
  continue
}

// > 또는 >= 처리
if c == ">" {
  if li + 1 < length(source) && char_at(source, li + 1) == "=" {
    li = li + 2
    push(lexeme_types, TOK_GE)
    push(lexeme_values, ">=")
  } else {
    li = li + 1
    push(lexeme_types, TOK_GT)
    push(lexeme_values, ">")
  }
  continue
}

// ! 또는 != 처리
if c == "!" {
  if li + 1 < length(source) && char_at(source, li + 1) == "=" {
    li = li + 2
    push(lexeme_types, TOK_NE)
    push(lexeme_values, "!=")
  } else {
    // ! 단독은 지원하지 않음
    li = li + 1
  }
  continue
}
```

### 테스트 1.1: Lexer 검증

```freelang
// 테스트 입력
var test_input = "if x < 10 { var y = 5 } else { var y = 10 }"

// 예상 토큰:
// TOK_IF, TOK_IDENT(x), TOK_LT, TOK_INT(10), TOK_LBRACE,
// TOK_VAR, TOK_IDENT(y), TOK_EQ, TOK_INT(5), TOK_RBRACE,
// TOK_ELSE, TOK_LBRACE, TOK_VAR, TOK_IDENT(y), TOK_EQ, TOK_INT(10), TOK_RBRACE
```

---

## Task 2: Parser 표현식 지원

**예상 시간**: 2일
**파일**: `compiler.fl` PHASE 2 섹션 확장

### 구현 단계

#### Step 2.1: AST 노드 타입 추가

```freelang
var NODE_VAR: i32 = 10
var NODE_INT: i32 = 20
var NODE_IDENT: i32 = 21          // 변수 참조
var NODE_BINOP: i32 = 30           // 이진 연산

var BINOP_LT: i32 = 40
var BINOP_GT: i32 = 41
var BINOP_LE: i32 = 42
var BINOP_GE: i32 = 43
var BINOP_EQ: i32 = 44
var BINOP_NE: i32 = 45
var BINOP_PLUS: i32 = 46
var BINOP_MINUS: i32 = 47
var BINOP_STAR: i32 = 48
var BINOP_SLASH: i32 = 49
```

#### Step 2.2: 기본 파서 헬퍼 함수

```freelang
// 현재 토큰 확인 및 이동
fn peek() -> i32 {
  if parser_pos < length(lexeme_types) {
    return lexeme_types[parser_pos]
  }
  return TOK_EOF
}

fn advance() -> void {
  parser_pos = parser_pos + 1
}

// 현재 토큰값 반환
fn current_value() -> str {
  if parser_pos < length(lexeme_values) {
    return lexeme_values[parser_pos]
  }
  return ""
}
```

#### Step 2.3: 단순 표현식 파싱 (Primary)

```freelang
// parse_primary: 정수 또는 식별자 파싱
// 반환값: {type: NODE_INT|NODE_IDENT, int_val: ..., name: ...}

fn parse_primary_expr() -> i32 {
  var tok = peek()

  if tok == TOK_INT {
    // 정수 리터럴
    var val = current_value()
    advance()
    // ast_types[new_node_idx] = NODE_INT
    // ast_values[new_node_idx] = val
    return new_node_idx
  }

  if tok == TOK_IDENT {
    // 변수 참조
    var name = current_value()
    advance()
    // ast_types[new_node_idx] = NODE_IDENT
    // ast_names[new_node_idx] = name
    return new_node_idx
  }

  // 오류: 예상치 못한 토큰
  return -1
}
```

#### Step 2.4: 비교 표현식 파싱

```freelang
// parse_comparison: 좌변 < 우변 형식의 표현식
fn parse_comparison_expr() -> i32 {
  // 좌항: 정수 또는 식별자
  var left_node = parse_primary_expr()

  var tok = peek()

  // 비교 연산자 확인
  if tok == TOK_LT || tok == TOK_GT || tok == TOK_LE ||
     tok == TOK_GE || tok == TOK_EQ_EQ || tok == TOK_NE {

    var op = tok
    advance()

    // 우항: 정수 또는 식별자
    var right_node = parse_primary_expr()

    // BINOP 노드 생성
    // ast_types[binop_idx] = NODE_BINOP
    // ast_children[binop_idx] = [left_node, right_node]
    // ast_binop_op[binop_idx] = op

    return binop_idx
  }

  // 단일 operand도 허용
  return left_node
}
```

#### Step 2.5: 산술 표현식 파싱

```freelang
// parse_additive: a + b 또는 a - b
fn parse_additive_expr() -> i32 {
  var left = parse_primary_expr()

  var tok = peek()
  if tok == TOK_PLUS || tok == TOK_MINUS {
    var op = tok
    advance()
    var right = parse_primary_expr()
    // BINOP 노드 생성
    return binop_idx
  }

  return left
}
```

### 테스트 2.1: 표현식 파싱 검증

```freelang
// 테스트 1: 비교식
// 입력: "x < 10"
// 예상 AST: NODE_BINOP{left: NODE_IDENT(x), op: TOK_LT, right: NODE_INT(10)}

// 테스트 2: 산술식
// 입력: "x + 5"
// 예상 AST: NODE_BINOP{left: NODE_IDENT(x), op: TOK_PLUS, right: NODE_INT(5)}
```

---

## Task 3: Parser 제어 흐름

**예상 시간**: 2일
**파일**: `compiler.fl` PHASE 2 섹션 확장

### 구현 단계

#### Step 3.1: if 문 파싱

```freelang
// 문법: if <expr> { <statements> } [else { <statements> }]

fn parse_if_statement() -> i32 {
  // if 키워드 건너뛰기
  advance()  // 현재 위치는 조건

  // 조건 파싱
  var cond_node = parse_comparison_expr()

  // ( 기대
  if peek() != TOK_LPAREN {
    println("ERROR: Expected ( after if condition")
    return -1
  }
  advance()

  // ) 기대
  if peek() != TOK_RPAREN {
    println("ERROR: Expected ) after if condition")
    return -1
  }
  advance()

  // { 기대
  if peek() != TOK_LBRACE {
    println("ERROR: Expected { after if condition")
    return -1
  }
  advance()

  // then 블록 파싱
  var then_stmts = []
  while peek() != TOK_RBRACE && peek() != TOK_EOF {
    var stmt = parse_statement()
    if stmt != -1 {
      push(then_stmts, stmt)
    }
  }

  // } 건너뛰기
  if peek() == TOK_RBRACE {
    advance()
  }

  // else 블록 확인
  var else_stmts = -1
  if peek() == TOK_ELSE {
    advance()

    // { 기대
    if peek() != TOK_LBRACE {
      println("ERROR: Expected { after else")
      return -1
    }
    advance()

    // else 블록 파싱
    else_stmts = []
    while peek() != TOK_RBRACE && peek() != TOK_EOF {
      var stmt = parse_statement()
      if stmt != -1 {
        push(else_stmts, stmt)
      }
    }

    // } 건너뛰기
    if peek() == TOK_RBRACE {
      advance()
    }
  }

  // NODE_IF 생성
  var if_node_idx = create_node(NODE_IF, cond_node, then_stmts, else_stmts)
  return if_node_idx
}
```

#### Step 3.2: while 문 파싱

```freelang
// 문법: while <expr> { <statements> }

fn parse_while_statement() -> i32 {
  // while 키워드 건너뛰기
  advance()

  // 조건 파싱
  var cond_node = parse_comparison_expr()

  // { 기대
  if peek() != TOK_LBRACE {
    println("ERROR: Expected { after while condition")
    return -1
  }
  advance()

  // 루프 본체 파싱
  var body_stmts = []
  while peek() != TOK_RBRACE && peek() != TOK_EOF {
    var stmt = parse_statement()
    if stmt != -1 {
      push(body_stmts, stmt)
    }
  }

  // } 건너뛰기
  if peek() == TOK_RBRACE {
    advance()
  }

  // NODE_WHILE 생성
  var while_node_idx = create_node(NODE_WHILE, cond_node, body_stmts, -1)
  return while_node_idx
}
```

#### Step 3.3: return 문 파싱

```freelang
// 문법: return <expr>

fn parse_return_statement() -> i32 {
  // return 키워드 건너뛰기
  advance()

  // 반환값 파싱
  var return_node = parse_comparison_expr()

  // ; 건너뛰기 (선택)
  if peek() == TOK_SEMI {
    advance()
  }

  // NODE_RETURN 생성
  var return_node_idx = create_node(NODE_RETURN, return_node, -1, -1)
  return return_node_idx
}
```

#### Step 3.4: 문장 디스패치

```freelang
fn parse_statement() -> i32 {
  var tok = peek()

  if tok == TOK_VAR {
    return parse_var_statement()
  }

  if tok == TOK_IF {
    return parse_if_statement()
  }

  if tok == TOK_WHILE {
    return parse_while_statement()
  }

  if tok == TOK_RETURN {
    return parse_return_statement()
  }

  // 알 수 없는 문장
  return -1
}
```

### 테스트 3.1: 제어 흐름 파싱 검증

```freelang
// 테스트 1: if 문
// 입력: "if (x < 10) { var y = 5 }"

// 테스트 2: if-else
// 입력: "if (x < 10) { var y = 5 } else { var y = 10 }"

// 테스트 3: while 루프
// 입력: "while (i < 5) { var i = i + 1 }"

// 테스트 4: 중첩 블록
// 입력: "if (x > 0) { if (y > 0) { var z = 1 } }"
```

---

## Task 4: Compiler 옵코드

**예상 시간**: 3일
**파일**: `compiler.fl` PHASE 3 섹션 확장

### 구현 단계

#### Step 4.1: 새 옵코드 추가

```freelang
var OP_PUSH_I32: i32 = 1
var OP_STORE: i32 = 49
var OP_LOAD: i32 = 50
var OP_CMP: i32 = 51
var OP_JMP: i32 = 52
var OP_JMP_IF_FALSE: i32 = 53
var OP_RETURN: i32 = 54
var OP_POP: i32 = 55
var OP_ADD: i32 = 56
var OP_SUB: i32 = 57
var OP_MUL: i32 = 58
var OP_DIV: i32 = 59
var OP_HALT: i32 = 67
```

#### Step 4.2: 비교 연산 컴파일

```freelang
fn compile_binop(ast_idx) -> void {
  var op = ast_binop_op[ast_idx]
  var left_idx = ast_children[ast_idx][0]
  var right_idx = ast_children[ast_idx][1]

  // 좌항 컴파일
  compile_expr(left_idx)  // 스택: [left_val]

  // 우항 컴파일
  compile_expr(right_idx) // 스택: [left_val, right_val]

  // 비교 연산
  if op == TOK_LT {
    push(bytecode, OP_CMP)
    push(bytecode, BINOP_LT)
  } else if op == TOK_GT {
    push(bytecode, OP_CMP)
    push(bytecode, BINOP_GT)
  } else if op == TOK_LE {
    push(bytecode, OP_CMP)
    push(bytecode, BINOP_LE)
  } else if op == TOK_GE {
    push(bytecode, OP_CMP)
    push(bytecode, BINOP_GE)
  } else if op == TOK_EQ_EQ {
    push(bytecode, OP_CMP)
    push(bytecode, BINOP_EQ)
  } else if op == TOK_NE {
    push(bytecode, OP_CMP)
    push(bytecode, BINOP_NE)
  } else if op == TOK_PLUS {
    push(bytecode, OP_ADD)
  } else if op == TOK_MINUS {
    push(bytecode, OP_SUB)
  } else if op == TOK_STAR {
    push(bytecode, OP_MUL)
  } else if op == TOK_SLASH {
    push(bytecode, OP_DIV)
  }
  // 스택: [result]
}
```

#### Step 4.3: if 문 컴파일

```freelang
fn compile_if(ast_idx) -> void {
  var cond_idx = ast_children[ast_idx][0]
  var then_stmts = ast_children[ast_idx][1]
  var else_stmts = ast_children[ast_idx][2]

  // 1. 조건 컴파일
  compile_expr(cond_idx)  // 스택: [cond_val]

  // 2. JMP_IF_FALSE 생성 (오프셋 백패치 필요)
  var false_jump_addr = length(bytecode)
  push(bytecode, OP_JMP_IF_FALSE)
  push(bytecode, 0)  // 백패치: 오프셋 (4바이트)
  push(bytecode, 0)
  push(bytecode, 0)
  push(bytecode, 0)

  // 3. then 블록 컴파일
  compile_statements(then_stmts)

  // 4. else 블록이 있으면 end_jump 삽입
  var end_jump_addr = -1
  if else_stmts != -1 {
    end_jump_addr = length(bytecode)
    push(bytecode, OP_JMP)
    push(bytecode, 0)  // 백패치: 오프셋
    push(bytecode, 0)
    push(bytecode, 0)
    push(bytecode, 0)
  }

  // 5. false_jump 오프셋 백패치
  var target = length(bytecode)
  set_offset_at(bytecode, false_jump_addr + 1, target)

  // 6. else 블록 컴파일
  if else_stmts != -1 {
    compile_statements(else_stmts)

    // 7. end_jump 오프셋 백패치
    var end_target = length(bytecode)
    set_offset_at(bytecode, end_jump_addr + 1, end_target)
  }
}

// 백패치 헬퍼: 오프셋을 little-endian 4바이트로 저장
fn set_offset_at(bytecode, addr, offset) -> void {
  bytecode[addr] = bitand(offset, 255)
  bytecode[addr + 1] = bitand(shr(offset, 8), 255)
  bytecode[addr + 2] = bitand(shr(offset, 16), 255)
  bytecode[addr + 3] = bitand(shr(offset, 24), 255)
}
```

#### Step 4.4: while 문 컴파일

```freelang
fn compile_while(ast_idx) -> void {
  var cond_idx = ast_children[ast_idx][0]
  var body_stmts = ast_children[ast_idx][1]

  // 1. 루프 시작 주소 기록
  var loop_start = length(bytecode)

  // 2. 조건 컴파일
  compile_expr(cond_idx)  // 스택: [cond_val]

  // 3. JMP_IF_FALSE 생성 (exit 점프)
  var exit_jump_addr = length(bytecode)
  push(bytecode, OP_JMP_IF_FALSE)
  push(bytecode, 0)  // 백패치: exit 오프셋
  push(bytecode, 0)
  push(bytecode, 0)
  push(bytecode, 0)

  // 4. 루프 본체 컴파일
  compile_statements(body_stmts)

  // 5. 루프 시작으로 다시 점프
  push(bytecode, OP_JMP)
  push(bytecode, bitand(loop_start, 255))  // little-endian
  push(bytecode, bitand(shr(loop_start, 8), 255))
  push(bytecode, bitand(shr(loop_start, 16), 255))
  push(bytecode, bitand(shr(loop_start, 24), 255))

  // 6. exit_jump 오프셋 백패치
  var exit_target = length(bytecode)
  set_offset_at(bytecode, exit_jump_addr + 1, exit_target)
}
```

#### Step 4.5: return 문 컴파일

```freelang
fn compile_return(ast_idx) -> void {
  var return_expr = ast_children[ast_idx][0]

  // 반환값 컴파일
  compile_expr(return_expr)  // 스택: [return_val]

  // RETURN 옵코드
  push(bytecode, OP_RETURN)
}
```

### 테스트 4.1: 컴파일 검증

```freelang
// 테스트 1: if 바이트코드
// 입력: "if (1) { var x = 10 }"
// 예상: PUSH_I32(1), CMP, JMP_IF_FALSE(skip), PUSH_I32(10), STORE(0), HALT

// 테스트 2: while 바이트코드
// 입력: "var i = 0; while (i < 3) { var i = i + 1 }"
// 예상: loop_start, PUSH(i), CMP, JMP_IF_FALSE(exit), ADD, STORE(i), JMP(loop_start), exit...
```

---

## Task 5: 테스트

**예상 시간**: 2일
**파일**: `test-phase5.fl` (신규 생성)

### 종합 테스트 스위트

```freelang
println("=== Phase 5 Control Flow Tests ===")
println("")

// 테스트 1: Lexer
println("--- Test 1: Lexer ---")
var test_count = 0
var pass_count = 0

// test_lex_if_keyword
// ...

println("Lexer: " + str(pass_count) + "/" + str(test_count) + " passed")
println("")

// 테스트 2: Parser
println("--- Test 2: Parser ---")
// ...

// 테스트 3: Compiler
println("--- Test 3: Compiler ---")
// ...

// 테스트 4: E2E
println("--- Test 4: E2E ---")
// ...

println("")
println("=== ALL TESTS COMPLETED ===")
```

---

## 스케줄

| Week | Task | 예상 시간 | 상태 |
|------|------|---------|------|
| 1 | Task 1: Lexer | 2일 | 📋 준비 중 |
| 1 | Task 2: Parser Expr | 2일 | 📋 준비 중 |
| 2 | Task 3: Parser Flow | 2일 | 📋 준비 중 |
| 2 | Task 4: Compiler | 3일 | 📋 준비 중 |
| 3 | Task 5: Tests | 2일 | 📋 준비 중 |
| 3 | 최적화 및 문서 | 1일 | 📋 준비 중 |

**예상 완료**: 2026-04-20

---

## 디버깅 팁

### 오프셋 검증

```freelang
// 바이트코드 오프셋이 올바른지 확인
var jmp_addr = 10
var expected_offset = 25

// bytecode[jmp_addr+1:5] 확인
var actual = bytecode[jmp_addr+1] +
             shl(bytecode[jmp_addr+2], 8) +
             shl(bytecode[jmp_addr+3], 16) +
             shl(bytecode[jmp_addr+4], 24)

if actual != expected_offset {
  println("ERROR: Offset mismatch at " + str(jmp_addr))
}
```

### AST 시각화

```freelang
fn print_ast(ast_idx, depth) -> void {
  var indent = ""
  var i = 0
  while i < depth {
    indent = indent + "  "
    i = i + 1
  }

  var node_type = ast_types[ast_idx]

  if node_type == NODE_IF {
    println(indent + "IF")
    println(indent + "  COND:")
    // ...
    println(indent + "  THEN:")
    // ...
  }
  // ...
}
```

---

**다음 단계**: Phase 5 구현 시작 (Task 1부터)
