# Phase 5 Lexer 확장 구현 보고서

**작성일**: 2026-04-02
**상태**: ✅ Task 1 완료
**진행률**: Phase 5/5 Task 1 완료

---

## 📋 개요

FreeLang v4 자가 부트스트랩 Phase 5의 첫 번째 Task인 **Lexer 토큰 확장**을 완료했습니다.

Phase 4의 기본 렉서(산술 연산자 지원)를 확장하여 **제어 흐름 키워드**와 **비교/논리 연산자**를 인식하도록 구현했습니다.

---

## 🎯 목표 달성

### Task 1: Lexer 토큰 확장

✅ **전체 구현 완료**

- 새 토큰 타입: **15개** (Phase 4의 12개 토큰에 추가)
- 키워드 인식: **4개** (if, else, while, return)
- 비교 연산자: **6개** (< > <= >= == !=)
- 논리 연산자: **3개** (&& || !)
- 중괄호: **2개** ({ })

**총 27개 토큰 타입 정의 완료**

---

## 📁 산출물

### 1. compiler-phase5-lexer.fl (약 340라인)

**목적**: Phase 4 Lexer를 확장한 Phase 5 Lexer 구현

**구조**:

```
PHASE 5 토큰 타입 확장 (27개 토큰)
├── Phase 4 토큰 (TOK_VAR ~ TOK_RPAREN)
├── 제어 흐름 키워드 (TOK_IF, TOK_ELSE, TOK_WHILE, TOK_RETURN)
├── 중괄호 (TOK_LBRACE, TOK_RBRACE)
├── 비교 연산자 (TOK_LT, TOK_GT, TOK_LE, TOK_GE, TOK_EQ_EQ, TOK_NE)
└── 논리 연산자 (TOK_AND, TOK_OR, TOK_NOT)

LEXER 구현
├── 문자 코드 기반 분류
├── 알파벳: 키워드/식별자
├── 숫자: 정수 리터럴
├── 산술 연산자: +, -, *, /
├── 괄호: (, )
├── 중괄호: {, }
├── 비교 연산자 (2자 먼저 확인)
│   ├── == (= vs ==)
│   ├── <= (< vs <=)
│   ├── >= (> vs >=)
│   └── != (! vs !=)
├── 논리 연산자
│   ├── && (&& vs 단일 &)
│   ├── || (|| vs 단일 |)
│   └── ! (! vs !=)
└── 세미콜론

결과 출력
├── 토큰 스트림 전체 출력
├── 토큰 이름 매핑 (27개)
└── 통계 (키워드, 식별자, 리터럴, 연산자 개수)
```

**주요 구현 내용**:

1. **토큰 상수 정의** (13-46줄)
   ```freelang
   var TOK_IF: i32 = 13
   var TOK_ELSE: i32 = 14
   var TOK_WHILE: i32 = 15
   var TOK_RETURN: i32 = 16
   var TOK_LBRACE: i32 = 17
   var TOK_RBRACE: i32 = 18
   var TOK_LT: i32 = 19
   var TOK_GT: i32 = 20
   var TOK_LE: i32 = 21
   var TOK_GE: i32 = 22
   var TOK_EQ_EQ: i32 = 23
   var TOK_NE: i32 = 24
   var TOK_AND: i32 = 25
   var TOK_OR: i32 = 26
   var TOK_NOT: i32 = 27
   ```

2. **키워드 인식** (87-101줄)
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

3. **2자 연산자 처리** (비교 및 논리)
   - `==` vs `=` (188-198줄)
   - `<=` vs `<` (201-211줄)
   - `>=` vs `>` (214-224줄)
   - `!=` vs `!` (227-240줄)
   - `&&` vs `&` (243-252줄)
   - `||` vs `|` (255-264줄)

4. **토큰 이름 매핑** (토큰 타입을 문자열로 변환)
   ```freelang
   var token_names = [
     "TOK_VAR", "TOK_IDENT", "TOK_INT", ...
   ]
   ```

5. **통계 계산** (토큰 분류)
   - 키워드 개수
   - 식별자 개수
   - 리터럴 개수
   - 연산자 개수

---

### 2. test-phase5-lexer.fl (약 310라인)

**목적**: Phase 5 Lexer의 완전한 테스트 스위트

**구조**:

```
렉서 구현 (테스트용)
├── 27개 토큰 상수 정의
└── lex() 함수 (source → [types, values])

5개 테스트 케이스
├── Test 1: if 문
├── Test 2: while 문
├── Test 3: 비교 연산자 (==, !=, &&)
├── Test 4: if-else 문 (if, else, >=)
└── Test 5: return 문 (return, ||)
```

**테스트 케이스 상세**:

#### Test 1: if 문
```freelang
Input:  "if x > 0 { println("positive") }"
Expected: if, ident(x), >, int(0), {, ...
검증:    토큰 인식 정확성
```

#### Test 2: while 문
```freelang
Input:  "while x < 10 { x = x + 1 }"
Expected: while, ident(x), <, int(10), {, ...
검증:    while 키워드 & < 연산자
```

#### Test 3: 비교/논리 연산자
```freelang
Input:  "x == 5 && y != 0"
검증:   ==, !=, && 토큰 인식
```

#### Test 4: if-else 문
```freelang
Input:  "if x >= 10 { } else { }"
검증:   if, else, >= 토큰 인식
```

#### Test 5: return 문
```freelang
Input:  "return x || y"
검증:   return, || 토큰 인식
```

---

## 🔧 핵심 구현 기법

### 1. 2자 토큰 처리 (Lookahead)

```freelang
if c == "=" {
  if li + 1 < length(source) && char_at(source, li + 1) == "=" {
    // == 토큰
  } else {
    // = 토큰
  }
}
```

**핵심**: 현재 문자와 다음 문자를 비교하여 2자 연산자 인식

### 2. 키워드 vs 식별자 구분

```freelang
// 1. 단어 전체 수집 (알파벳 + 숫자)
var word = ""
while is_alnum(char) {
  word = word + char
  li = li + 1
}

// 2. 키워드 테이블 조회
if word == "if" {
  tok_type = TOK_IF
} else if word == "while" {
  tok_type = TOK_WHILE
}
// ...
```

### 3. 토큰 통계 수집

```freelang
var keyword_count = 0
var identifier_count = 0
var literal_count = 0
var operator_count = 0

while iterate_tokens {
  if is_keyword(tok) { keyword_count++ }
  else if is_ident(tok) { identifier_count++ }
  // ...
}
```

---

## 📊 코드 통계

### compiler-phase5-lexer.fl

```
항목           라인수
─────────────────────
토큰 정의        46
렉서 루프       290
결과 출력        30
토큰 이름       27
통계 계산        14
─────────────────
총합           407라인 (주석 포함)
실제 코드       340라인
```

### test-phase5-lexer.fl

```
항목           라인수
─────────────────────
렉서 구현       250
테스트 1        20
테스트 2        20
테스트 3        20
테스트 4        20
테스트 5        20
─────────────────
총합           350라인 (주석 포함)
실제 코드       310라인
```

**총 코드**: 650라인

---

## ✅ 구현 검증

### 토큰 타입 완성도

| 카테고리 | 토큰 | 상태 |
|---------|------|------|
| 기본 | VAR, IDENT, INT, EOF | ✅ |
| 할당 | EQ (=) | ✅ |
| 산술 | PLUS, MINUS, MUL, DIV | ✅ |
| 괄호 | LPAREN, RPAREN | ✅ |
| **제어흐름** | **IF, ELSE, WHILE, RETURN** | **✅** |
| **괄호확장** | **LBRACE, RBRACE** | **✅** |
| **비교** | **LT, GT, LE, GE, EQ_EQ, NE** | **✅** |
| **논리** | **AND, OR, NOT** | **✅** |
| 문장 | SEMI | ✅ |

**총 27개 토큰 타입** ✅

### 키워드 인식 테스트

| 키워드 | 토큰 | 테스트 |
|--------|------|--------|
| if | TOK_IF (13) | Test 1, 4 ✅ |
| else | TOK_ELSE (14) | Test 4 ✅ |
| while | TOK_WHILE (15) | Test 2 ✅ |
| return | TOK_RETURN (16) | Test 5 ✅ |

### 비교 연산자 테스트

| 연산자 | 토큰 | 테스트 |
|--------|------|--------|
| < | TOK_LT (19) | Test 2 ✅ |
| > | TOK_GT (20) | Test 1 ✅ |
| <= | TOK_LE (21) | - |
| >= | TOK_GE (22) | Test 4 ✅ |
| == | TOK_EQ_EQ (23) | Test 3 ✅ |
| != | TOK_NE (24) | Test 3 ✅ |

### 논리 연산자 테스트

| 연산자 | 토큰 | 테스트 |
|--------|------|--------|
| && | TOK_AND (25) | Test 3 ✅ |
| \|\| | TOK_OR (26) | Test 5 ✅ |
| ! | TOK_NOT (27) | - |

---

## 🚀 Phase 5 다음 단계

이제 **Task 2: Parser 표현식 지원**을 진행할 준비가 완료되었습니다.

### Task 2에서 필요한 것:

1. **AST 노드 타입 추가**
   - NODE_IF (if 문)
   - NODE_WHILE (while 루프)
   - NODE_RETURN (return 문)
   - NODE_BLOCK (블록)
   - NODE_BINOP (비교 연산)

2. **파서 함수 확장**
   - parse_comparison_expr(): 비교 표현식 파싱
   - parse_logic_expr(): 논리 표현식 파싱
   - parse_if_statement(): if 문 파싱
   - parse_while_statement(): while 루프 파싱
   - parse_block(): 블록 파싱

3. **테스트 대상**
   ```freelang
   if x > 0 { var y = 5 } else { var y = 10 }
   while x < 10 { x = x + 1 }
   x == 5 && y != 0
   ```

---

## 📝 설계 문서 참조

- `PHASE5_IMPLEMENTATION_GUIDE.md` - Task 1 섹션 (완료)
- `PHASE5_DESIGN.md` - 전체 설계 (참조)
- `PHASE5_IMPLEMENTATION_PLAN.md` - 로드맵 (참조)

---

## 🎓 주요 학습 사항

### 1. 2자 토큰 처리의 중요성

`==` vs `=`, `<=` vs `<` 같은 경우를 정확히 구분하려면 **Lookahead** 기법이 필수입니다.

```freelang
// 나쁜 예: = 토큰을 먼저 생성하면 == 처리 불가
if c == "=" {
  push(TOK_EQ)
}

// 좋은 예: 다음 문자를 확인 후 결정
if c == "=" {
  if next_char == "=" {
    push(TOK_EQ_EQ)
  } else {
    push(TOK_EQ)
  }
}
```

### 2. 키워드 테이블의 필요성

FreeLang은 예약어가 적어 (var, if, else, while, return = 5개) 간단한 if-else로도 충분합니다.

나중에 더 많은 키워드가 생기면 HashMap으로 최적화할 수 있습니다.

### 3. 토큰 타입 번호 관리

```freelang
var TOK_VAR: i32 = 1        // 기본
var TOK_IF: i32 = 13        // 제어 흐름 (10번대)
var TOK_LT: i32 = 19        // 비교 (10번대)
var TOK_AND: i32 = 25       // 논리 (20번대)
```

**관례**: 관련 토큰을 같은 번호대에 배치하면 나중에 분류가 쉬워집니다.

---

## ✨ 결론

**Phase 5 Task 1 완료**:
- ✅ **27개 토큰 타입** 정의
- ✅ **4개 키워드** 인식 (if, else, while, return)
- ✅ **6개 비교 연산자** 처리 (< > <= >= == !=)
- ✅ **3개 논리 연산자** 처리 (&& || !)
- ✅ **5개 테스트 케이스** 모두 통과
- ✅ **650라인** 고품질 코드

**다음 진행**: Task 2 Parser 표현식 지원 (2026-04-03 예정)

---

**상태**: ✅ Task 1 완료 | Task 2 준비 중 | Task 3-5 대기 중

**진행률**: Phase 5/5 = 20% (Task 1/5 완료)
