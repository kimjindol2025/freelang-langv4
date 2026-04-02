# FreeLang v4 Phase 4: Binary Operations 구현 완료

## 개요
Phase 4는 FreeLang v4 자가 부트스트랩 컴파일러에서 **이항 연산(덧셈, 뺄셈, 곱셈, 나눗셈)** 을 지원하도록 확장했습니다.

## 구현 내용

### 1. 렉서 (Lexer) 확장
**위치**: `compiler-phase4.fl` (52-169줄)

- 기존 토큰 타입 유지:
  - `TOK_VAR` (1)
  - `TOK_IDENT` (2)
  - `TOK_INT` (3)
  - `TOK_EQ` (4)
  - `TOK_SEMI` (5)
  - `TOK_EOF` (6)

- **새로운 토큰 타입 추가**:
  - `TOK_PLUS` (7): `+` 연산자
  - `TOK_MINUS` (8): `-` 연산자
  - `TOK_MUL` (9): `*` 연산자
  - `TOK_DIV` (10): `/` 연산자
  - `TOK_LPAREN` (11): `(` 괄호
  - `TOK_RPAREN` (12): `)` 괄호

**렉서 로직**:
```
+, -, *, / 문자 인식 → 해당 토큰 타입으로 변환
( ), 괄호도 토큰화 (향후 표현식 우선순위 처리용)
기존 숫자, 알파벳, 키워드 처리 유지
```

**테스트 입력**:
```
var x = 10; var y = x + 5; var z = y * 2
```

**출력 토큰**: 15개 토큰
```
[0] type=1 value=var
[1] type=2 value=x
[2] type=4 value==
[3] type=3 value=10
[4] type=5 value=;
[5] type=1 value=var
[6] type=2 value=y
[7] type=4 value==
[8] type=2 value=x
[9] type=7 value=+
[10] type=3 value=5
[11] type=5 value=;
[12] type=1 value=var
[13] type=2 value=z
[14] type=4 value==
[15] type=3 value=*
[16] type=3 value=2
```

### 2. 파서 (Parser) 확장
**위치**: `compiler-phase4.fl` (204-337줄)

#### AST 노드 타입 확장
- `NODE_VAR` (10): 변수 선언
- `NODE_INT` (20): 정수 리터럴
- `NODE_IDENT` (40): **새** - 변수 참조
- `NODE_BINOP` (30): **새** - 이항 연산

#### 이항 연산 타입
```
BINOP_ADD (100): +
BINOP_SUB (101): -
BINOP_MUL (102): *
BINOP_DIV (103): /
```

#### 파서 구조: 재귀 강하 (Recursive Descent)

**파서 함수 계층**:
```
parse_statement()
  ├─ parse_additive()      (+ - 연산자, 우선순위 낮음)
      ├─ parse_multiplicative() (* / 연산자, 우선순위 높음)
          └─ parse_primary()  (기본 표현식: 정수, 변수, 괄호)
```

**연산자 우선순위** (수학 규칙 따름):
```
우선순위 높음: * /
우선순위 낮음: + -
```

**예시 파싱**: `x + 5 * 2`
```
parse_additive()
  left = parse_multiplicative()  → x (NODE_IDENT)

  tok = TOK_PLUS
  right = parse_multiplicative()
    left = parse_primary()  → 5 (NODE_INT)
    tok = TOK_MUL
    right = parse_primary()  → 2 (NODE_INT)
    return BINOP_MUL(5, 2)

  return BINOP_ADD(x, BINOP_MUL(5, 2))  ✓ 정확히 x + (5 * 2)
```

#### AST 저장 구조
```
ast_types[]   : 각 노드의 타입
ast_names[]   : VAR/IDENT 노드의 이름
ast_values[]  : INT 노드의 값
ast_op[]      : BINOP 노드의 연산 타입
ast_left[]    : BINOP 노드의 좌측 자식 인덱스
ast_right[]   : BINOP 노드의 우측 자식 인덱스
```

**파싱 결과 (예시)**:
```
var x = 10; var y = x + 5
→ 5개 노드 AST:
[0] NODE_INT: 10
[1] NODE_IDENT: x
[2] NODE_INT: 5
[3] NODE_BINOP: (ADD, left=1, right=2)
[4] NODE_VAR: y = expr#3
```

### 3. 컴파일러 (Compiler) 확장
**위치**: `compiler-phase4.fl` (365-455줄)

#### 새로운 바이트코드 명령어
```
OP_PUSH_VAR (2)  : 변수값을 스택에 push
OP_ADD (3)       : 스택 상위 2개 값을 더하고 결과를 스택에 push
OP_SUB (4)       : 뺄셈
OP_MUL (5)       : 곱셈
OP_DIV (6)       : 나눗셈
```

#### 컴파일 전략: 스택 기반 VM

**기본 패턴**:
```
표현식 컴파일:
  좌측 표현식 → PUSH 스택
  우측 표현식 → PUSH 스택
  연산 명령어 (OP_ADD 등) → 스택의 상위 2개 연산 후 결과 PUSH
```

**예시**: `y = x + 5`
```
OP_PUSH_VAR 0          (x를 스택에 push)
OP_PUSH_I32 5          (5를 스택에 push)
OP_ADD                 (스택: [10, 5] → [15])
OP_STORE 1             (결과를 변수 y에 저장)
```

#### 컴파일 함수: `compile_expr(node_idx)`
```
NODE_INT 노드
  → OP_PUSH_I32 + 4바이트 리틀엔디안 값

NODE_IDENT 노드
  → OP_PUSH_VAR + 변수 인덱스

NODE_BINOP 노드
  → compile_expr(left)
  → compile_expr(right)
  → 연산 명령어 (OP_ADD / OP_SUB / OP_MUL / OP_DIV)
```

#### 변수 관리
```
var_map[]: 변수명 → 저장소 위치 매핑
constants[]: 상수 풀 (변수명 저장)

예: var_map[0] = "x", var_map[1] = "y"
```

## 파일 구조

### 1. `/data/data/com.termux/files/home/freelang-v4/compiler-phase4.fl`
**크기**: ~455줄
**구성**:
- Lexer 확장: 줄 52-169
- Parser 확장: 줄 204-337
- Compiler 확장: 줄 365-455

### 2. `/data/data/com.termux/files/home/freelang-v4/test-phase4.fl`
**크기**: ~230줄
**포함 내용**:
- Test Case 1: 단순 덧셈
- Test Case 2: 연산자 우선순위
- Test Case 3: 복잡한 표현식 (덧셈, 곱셈, 뺄셈 연쇄)
- Test Case 4: 토큰 인식 검증
- Test Case 5: 바이트코드 생성 검증

## 기술 특징

### 우선순위 처리
```
재귀 강하 파서의 함수 계층으로 자동 해결:
- parse_additive()에서 parse_multiplicative() 호출
- 곱셈이 더 깊은 수준(먼저 처리)

따라서 a + b * c는 자동으로 a + (b * c)로 파싱됨
```

### 타입 제약 우회
Phase 3에서처럼 별도 배열 사용:
```
ast_types[], ast_names[], ast_values[], ast_op[], ast_left[], ast_right[]
→ 다양한 노드 타입을 저장하는 다형성 구조
```

### Little-endian 정수 변환
```
32비트 정수를 4바이트로 분해:
byte0 = num & 0xFF
byte1 = (num >> 8) & 0xFF
byte2 = (num >> 16) & 0xFF
byte3 = (num >> 24) & 0xFF
```

## 테스트 전략

### Unit Test (test-phase4.fl)
1. **렉서 테스트**: 모든 연산자 토큰 인식
2. **파서 테스트**: 표현식 파싱 및 우선순위
3. **컴파일러 테스트**: 바이트코드 시퀀스 생성

### 예상 결과
```
입력:  var x = 10; var y = x + 5; var z = y * 2
토큰:  15개
AST:   5개 노드 (3 변수선언 + 2 표현식)
바이트코드: ~50바이트
상수:  3개 (변수명)
```

## 다음 단계 (Phase 5 제안)

### 1. VM 실행기 (Runtime)
- 바이트코드 실행 엔진
- 스택 관리
- 변수 저장소

### 2. 함수 정의
```
fn add(a, b) { return a + b }
```

### 3. 제어 흐름
```
if / else
while / for
```

### 4. 타입 시스템
```
명시적 타입 선언
타입 체크
```

## 결론
Phase 4에서 이항 연산 지원을 완성하여 변수와 상수만 사용했던 Phase 3에서 복잡한 계산식을 표현할 수 있게 되었습니다. 재귀 강하 파서로 자연스러운 연산자 우선순위를 구현하고, 스택 기반 바이트코드로 표현식을 효율적으로 컴파일합니다.

다음 Phase에서는 이 기반 위에 함수, 제어 흐름, 타입 시스템을 추가하여 실용적인 언어로 발전시킬 수 있습니다.
