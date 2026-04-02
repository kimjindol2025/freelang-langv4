# Phase 5 구현 체크리스트

**작성일**: 2026-04-02
**상태**: ✅ 설계 완료, 구현 준비 완료
**목표**: if/while/return 제어 흐름 구현

---

## 📋 설계 문서 확인

- ✅ PHASE5_DESIGN.md (메인 설계 문서)
- ✅ PHASE5_IMPLEMENTATION_GUIDE.md (구현 가이드)
- ✅ PHASE5_EXAMPLES.md (12개 예제)
- ✅ PHASE5_ARCHITECTURE.md (상세 아키텍처)
- ✅ PHASE5_CHECKLIST.md (본 문서)

---

## 🔧 Task 1: Lexer 토큰 추가

### 단계별 체크리스트

#### 1.1 상수 정의
- [ ] TOK_IF = 10 추가
- [ ] TOK_ELSE = 11 추가
- [ ] TOK_WHILE = 12 추가
- [ ] TOK_RETURN = 13 추가
- [ ] TOK_LBRACE = 14 추가
- [ ] TOK_RBRACE = 15 추가
- [ ] TOK_LPAREN = 16 추가
- [ ] TOK_RPAREN = 17 추가
- [ ] TOK_LT = 18 추가
- [ ] TOK_GT = 19 추가
- [ ] TOK_LE = 20 추가
- [ ] TOK_GE = 21 추가
- [ ] TOK_EQ_EQ = 22 추가
- [ ] TOK_NE = 23 추가
- [ ] TOK_MINUS = 24 추가
- [ ] TOK_STAR = 25 추가
- [ ] TOK_SLASH = 26 추가

#### 1.2 키워드 인식
- [ ] "var" → TOK_VAR 확인
- [ ] "if" → TOK_IF 분류
- [ ] "else" → TOK_ELSE 분류
- [ ] "while" → TOK_WHILE 분류
- [ ] "return" → TOK_RETURN 분류

#### 1.3 괄호/중괄호 처리
- [ ] "(" → TOK_LPAREN 처리
- [ ] ")" → TOK_RPAREN 처리
- [ ] "{" → TOK_LBRACE 처리
- [ ] "}" → TOK_RBRACE 처리

#### 1.4 산술 연산자 처리
- [ ] "-" → TOK_MINUS 처리
- [ ] "*" → TOK_STAR 처리
- [ ] "/" → TOK_SLASH 처리

#### 1.5 비교 연산자 처리
- [ ] "=" vs "==" 구분
- [ ] "<" vs "<=" 구분
- [ ] ">" vs ">=" 구분
- [ ] "!" vs "!=" 구분

#### 테스트 1.1: Lexer 검증
```
테스트 입력: "if x < 10 { var y = 5 } else { var y = 10 }"
예상 출력: 17개 토큰
[ ] 토큰 개수 확인
[ ] 각 토큰 타입 확인
[ ] 토큰값 확인
```

**완료 기준**: 모든 토큰이 올바르게 분류됨
**예상 시간**: 2일

---

## 🔧 Task 2: Parser 표현식 지원

### 단계별 체크리스트

#### 2.1 AST 노드 타입 추가
- [ ] NODE_IDENT = 21 추가
- [ ] NODE_BINOP = 30 추가
- [ ] BINOP_LT = 40 추가
- [ ] BINOP_GT = 41 추가
- [ ] BINOP_LE = 42 추가
- [ ] BINOP_GE = 43 추가
- [ ] BINOP_EQ = 44 추가
- [ ] BINOP_NE = 45 추가
- [ ] BINOP_PLUS = 46 추가
- [ ] BINOP_MINUS = 47 추가
- [ ] BINOP_STAR = 48 추가
- [ ] BINOP_SLASH = 49 추가

#### 2.2 파서 헬퍼 함수
- [ ] peek() 함수 구현
- [ ] advance() 함수 구현
- [ ] current_value() 함수 구현

#### 2.3 단순 표현식 파싱
- [ ] parse_primary_expr() 구현 (INT, IDENT)
- [ ] 테스트: "42" 파싱
- [ ] 테스트: "x" 파싱

#### 2.4 비교 표현식 파싱
- [ ] parse_comparison_expr() 구현
- [ ] 테스트: "x < 10" 파싱
- [ ] 테스트: "x >= 5" 파싱
- [ ] 테스트: "x == y" 파싱

#### 2.5 산술 표현식 파싱
- [ ] parse_additive_expr() 구현
- [ ] parse_mult_expr() 구현
- [ ] 테스트: "a + b" 파싱
- [ ] 테스트: "x * y" 파싱
- [ ] 테스트: "a + b * c" 파싱 (우선순위)

#### 테스트 2.1: 표현식 파싱 검증
```
[ ] "x < 10" → NODE_BINOP{op: TOK_LT, ...}
[ ] "a + 5" → NODE_BINOP{op: TOK_PLUS, ...}
[ ] "x * y" → NODE_BINOP{op: TOK_STAR, ...}
[ ] 다중 연산자: "a + b * c"
[ ] 괄호 우선순위: "(a + b) * c"
```

**완료 기준**: 모든 표현식이 올바른 AST로 파싱됨
**예상 시간**: 2일

---

## 🔧 Task 3: Parser 제어 흐름

### 단계별 체크리스트

#### 3.1 if 문 파싱
- [ ] parse_if_statement() 구현
- [ ] 조건 파싱 (괄호 포함)
- [ ] then 블록 파싱
- [ ] else 블록 파싱
- [ ] 테스트: "if (x < 10) { }"
- [ ] 테스트: "if (...) { } else { }"

#### 3.2 while 문 파싱
- [ ] parse_while_statement() 구현
- [ ] 조건 파싱
- [ ] 루프 본체 파싱
- [ ] 테스트: "while (i < 5) { }"

#### 3.3 return 문 파싱
- [ ] parse_return_statement() 구현
- [ ] 반환값 파싱
- [ ] 테스트: "return x"

#### 3.4 문장 디스패치
- [ ] parse_statement() 구현
- [ ] VAR 문장 라우팅
- [ ] IF 문장 라우팅
- [ ] WHILE 문장 라우팅
- [ ] RETURN 문장 라우팅

#### 3.5 블록 파싱
- [ ] parse_block() 구현 (여러 문장)
- [ ] 중괄호 처리
- [ ] 테스트: 3개 문장 포함 블록

#### 테스트 3.1: 제어 흐름 파싱 검증
```
[ ] "if (1) { var x = 5 }" → NODE_IF
[ ] "if (...) { } else { }" → NODE_IF with else_block
[ ] "while (x < 5) { var x = x + 1 }" → NODE_WHILE
[ ] "return x" → NODE_RETURN
[ ] 중첩: "if (...) { if (...) { } }" → 올바른 트리
```

**완료 기준**: 모든 제어 흐름 구조가 올바른 AST로 파싱됨
**예상 시간**: 2일

---

## 🔧 Task 4: Compiler 옵코드

### 단계별 체크리스트

#### 4.1 옵코드 상수 정의
- [ ] OP_LOAD = 50 추가
- [ ] OP_CMP = 51 추가
- [ ] OP_JMP = 52 추가
- [ ] OP_JMP_IF_FALSE = 53 추가
- [ ] OP_RETURN = 54 추가
- [ ] OP_POP = 55 추가
- [ ] OP_ADD = 56 추가
- [ ] OP_SUB = 57 추가
- [ ] OP_MUL = 58 추가
- [ ] OP_DIV = 59 추가

#### 4.2 비교 연산 컴파일
- [ ] compile_binop() 구현
- [ ] BINOP_LT → OP_CMP 생성
- [ ] BINOP_GT → OP_CMP 생성
- [ ] BINOP_LE → OP_CMP 생성
- [ ] BINOP_GE → OP_CMP 생성
- [ ] BINOP_EQ → OP_CMP 생성
- [ ] BINOP_NE → OP_CMP 생성
- [ ] 산술 연산: PLUS, MINUS, STAR, SLASH
- [ ] 테스트: "x < 10" → [LOAD, PUSH, CMP, ...]

#### 4.3 if 문 컴파일
- [ ] compile_if() 구현
- [ ] 조건 컴파일
- [ ] JMP_IF_FALSE 생성
- [ ] then 블록 컴파일
- [ ] else 블록 처리
- [ ] 백패칭: false_jump_addr
- [ ] 백패칭: end_jump_addr (else 있을 때)
- [ ] 테스트: if 바이트코드 생성

#### 4.4 while 문 컴파일
- [ ] compile_while() 구현
- [ ] 루프 시작 주소 기록
- [ ] 조건 컴파일
- [ ] JMP_IF_FALSE (exit) 생성
- [ ] 루프 본체 컴파일
- [ ] 루프 시작으로 JMP
- [ ] 백패칭: exit_jump_addr
- [ ] 테스트: while 바이트코드 생성

#### 4.5 return 문 컴파일
- [ ] compile_return() 구현
- [ ] 반환값 컴파일
- [ ] OP_RETURN 생성
- [ ] 테스트: return 바이트코드 생성

#### 4.6 백패칭 헬퍼
- [ ] set_offset_at() 함수 구현
- [ ] little-endian 인코딩 확인
- [ ] 테스트: 오프셋이 올바르게 인코딩됨

#### 테스트 4.1: 컴파일 검증
```
[ ] if (1) { var x = 10 } 바이트코드 검증
[ ] if (...) { } else { } 바이트코드 검증
[ ] while (x < 3) { var x = x + 1 } 바이트코드 검증
[ ] 백패칭 오프셋 정확성 확인
[ ] 각 바이트 값이 예상과 일치
```

**완료 기준**: 모든 제어 흐름이 올바른 바이트코드로 컴파일됨
**예상 시간**: 3일

---

## 🧪 Task 5: 테스트

### 단계별 체크리스트

#### 5.1 유닛 테스트 작성
- [ ] test_lex_keywords() 작성
- [ ] test_lex_operators() 작성
- [ ] test_parse_if() 작성
- [ ] test_parse_while() 작성
- [ ] test_compile_if() 작성
- [ ] test_compile_while() 작성

#### 5.2 통합 테스트 작성
- [ ] test_e2e_abs_value() (절댓값)
- [ ] test_e2e_max() (최대값)
- [ ] test_e2e_factorial() (팩토리얼)
- [ ] test_e2e_fibonacci() (피보나치)
- [ ] test_e2e_gcd() (최대공약수)

#### 5.3 엣지 케이스 테스트
- [ ] 중첩 if 테스트
- [ ] 중첩 while 루프 테스트
- [ ] 비어있는 블록 테스트
- [ ] 단일 문장 블록 테스트
- [ ] 복잡한 표현식 테스트

#### 5.4 에러 케이스 테스트
- [ ] 괄호 불일치 에러
- [ ] 정의되지 않은 변수 에러
- [ ] 문법 오류 (예: "if" 없이 "{")
- [ ] 토큰 누락 (예: if 조건 없음)

#### 테스트 5.1: 모든 테스트 실행
```
[ ] 유닛 테스트 모두 통과
[ ] 통합 테스트 모두 통과
[ ] 엣지 케이스 처리 확인
[ ] 에러 메시지 명확성 확인
```

**완료 기준**: 모든 테스트 통과, 에러 처리 완벽
**예상 시간**: 2일

---

## 📊 구현 통계

### 코드량 예상

| 구성요소 | 기존 | 추가 | 합계 | 상태 |
|---------|------|------|------|------|
| Lexer | 70줄 | 50줄 | 120줄 | 📋 준비 중 |
| Parser | 50줄 | 100줄 | 150줄 | 📋 준비 중 |
| Compiler | 60줄 | 150줄 | 210줄 | 📋 준비 중 |
| Tests | 0줄 | 150줄 | 150줄 | 📋 준비 중 |
| **합계** | **180줄** | **450줄** | **630줄** | - |

### 기간 추정

| Task | 예상 | 진행율 |
|------|------|--------|
| 1. Lexer | 2일 | 0% ░░░░░░░░░░░░░░░░░░░░ |
| 2. Parser Expr | 2일 | 0% ░░░░░░░░░░░░░░░░░░░░ |
| 3. Parser Flow | 2일 | 0% ░░░░░░░░░░░░░░░░░░░░ |
| 4. Compiler | 3일 | 0% ░░░░░░░░░░░░░░░░░░░░ |
| 5. Tests | 2일 | 0% ░░░░░░░░░░░░░░░░░░░░ |
| 최적화 & 문서 | 1일 | 0% ░░░░░░░░░░░░░░░░░░░░ |
| **합계** | **12일** | 0% |

---

## 📋 일일 진행 로그

### Week 1

#### Day 1 (2026-04-02)
- [ ] Task 1 Step 1.1: 토큰 상수 정의
- [ ] Task 1 Step 1.2: 키워드 인식 추가
- [ ] Task 1 Step 1.3: 괄호/중괄호 처리

#### Day 2 (2026-04-03)
- [ ] Task 1 Step 1.4: 산술 연산자 처리
- [ ] Task 1 Step 1.5: 비교 연산자 처리
- [ ] Task 1 테스트 1.1: Lexer 검증

#### Day 3 (2026-04-04)
- [ ] Task 2 Step 2.1: AST 노드 타입 추가
- [ ] Task 2 Step 2.2: 파서 헬퍼 함수
- [ ] Task 2 Step 2.3: 단순 표현식 파싱

#### Day 4 (2026-04-05)
- [ ] Task 2 Step 2.4: 비교 표현식 파싱
- [ ] Task 2 Step 2.5: 산술 표현식 파싱
- [ ] Task 2 테스트 2.1: 표현식 파싱 검증

### Week 2

#### Day 5 (2026-04-08)
- [ ] Task 3 Step 3.1: if 문 파싱
- [ ] Task 3 Step 3.2: while 문 파싱
- [ ] Task 3 Step 3.3: return 문 파싱

#### Day 6 (2026-04-09)
- [ ] Task 3 Step 3.4: 문장 디스패치
- [ ] Task 3 Step 3.5: 블록 파싱
- [ ] Task 3 테스트 3.1: 제어 흐름 파싱 검증

#### Day 7 (2026-04-10)
- [ ] Task 4 Step 4.1: 옵코드 상수 정의
- [ ] Task 4 Step 4.2: 비교 연산 컴파일
- [ ] Task 4 Step 4.3: if 문 컴파일

#### Day 8 (2026-04-11)
- [ ] Task 4 Step 4.4: while 문 컴파일
- [ ] Task 4 Step 4.5: return 문 컴파일
- [ ] Task 4 Step 4.6: 백패칭 헬퍼

### Week 3

#### Day 9 (2026-04-14)
- [ ] Task 4 테스트 4.1: 컴파일 검증
- [ ] Task 5 Step 5.1: 유닛 테스트 작성
- [ ] Task 5 Step 5.2: 통합 테스트 작성

#### Day 10 (2026-04-15)
- [ ] Task 5 Step 5.3: 엣지 케이스 테스트
- [ ] Task 5 Step 5.4: 에러 케이스 테스트
- [ ] Task 5 테스트 5.1: 모든 테스트 실행

#### Day 11 (2026-04-16)
- [ ] 버그 수정 및 최적화
- [ ] 성능 벤치마크
- [ ] 코드 리뷰

#### Day 12 (2026-04-17)
- [ ] 최종 문서화
- [ ] PHASE5_COMPLETION.md 작성
- [ ] Phase 6 준비

---

## ✅ 완료 확인

### 설계 문서 ✅
- [x] PHASE5_DESIGN.md (2026-04-02 완료)
- [x] PHASE5_IMPLEMENTATION_GUIDE.md (2026-04-02 완료)
- [x] PHASE5_EXAMPLES.md (2026-04-02 완료)
- [x] PHASE5_ARCHITECTURE.md (2026-04-02 완료)
- [x] PHASE5_CHECKLIST.md (본 문서, 2026-04-02 완료)

### 구현 진행상황
- [ ] 모든 Task 완료
- [ ] 모든 테스트 통과
- [ ] 모든 문서 작성 완료
- [ ] Phase 6 준비 완료

### 최종 검수
- [ ] 전체 바이트코드 형식 검증
- [ ] 성능 벤치마크 (목표: <100ms)
- [ ] 메모리 프로파일링
- [ ] 크로스 플랫폼 호환성 확인

---

## 🎯 성공 기준

### 기능 완성도
- [ ] 모든 제어 흐름 토큰 지원
- [ ] 모든 표현식 파싱 가능
- [ ] if/else/while/return 모두 작동
- [ ] 중첩 구조 지원
- [ ] 올바른 바이트코드 생성

### 코드 품질
- [ ] 타입 체커 호환성 (FreeLang 타입 시스템)
- [ ] 에러 메시지 명확성
- [ ] 코드 가독성 (주석 포함)
- [ ] 성능 (컴파일 <100ms)

### 테스트 커버리지
- [ ] 100% 기본 경로 커버리지
- [ ] 80% 엣지 케이스 커버리지
- [ ] 에러 케이스 모두 처리

### 문서화
- [ ] 구현 가이드 완료
- [ ] 예제 12개 작성 완료
- [ ] 아키텍처 다이어그램 완료
- [ ] 최종 보고서 작성 완료

---

## 📌 주의사항

### 타입 시스템 호환성
```freelang
// ❌ 문제: 동적 배열 타입 추론 실패
var ast_data = [NODE_VAR, "x", 42]  // 혼합 타입

// ✅ 해결: 평행 배열
var ast_types = []   // i32
var ast_names = []   // str
var ast_values = []  // str
```

### 백패칭 안전성
```freelang
// ❌ 위험: 오프셋 오버플로우
if offset > 255 {  // 255 이상이면 1바이트로 부족
  error()
}

// ✅ 해결: 4바이트 little-endian 오프셋
push(bytecode, bitand(offset, 255))
push(bytecode, bitand(shr(offset, 8), 255))
push(bytecode, bitand(shr(offset, 16), 255))
push(bytecode, bitand(shr(offset, 24), 255))
```

### 변수 스코핑
```freelang
// ❌ 문제: Phase 5는 전역 변수만 지원
if (x > 0) {
  var temp = x + 1  // 이건 전역 변수로 처리됨
}

// ✅ 해결: 모든 var는 전역 범위
// Phase 6에서 함수 정의 추가 시 지역 변수 지원
```

---

## 🚀 다음 단계

### Phase 5 완료 후
1. Phase 5 완료 보고서 작성
2. 종합 성능 벤치마크 실행
3. 코드 리뷰 및 최적화
4. Phase 6 준비 (함수 정의)

### Phase 6 계획
- 함수 정의 (fn keyword)
- 함수 호출
- 지역 변수 스코프
- 반환값 처리

---

## 📞 문제 해결

### Lexer 문제
| 문제 | 해결책 |
|------|--------|
| 2자 연산자 인식 실패 | 다음 문자 미리 확인 (lookahead) |
| 키워드 미분류 | word와 키워드 정확히 비교 |
| 공백 처리 | ASCII 32, 9, 10, 13 모두 확인 |

### Parser 문제
| 문제 | 해결책 |
|------|--------|
| 점프할 때 위치 혼동 | parser_pos 매번 갱신 확인 |
| 블록 깊이 오류 | 괄호 카운팅 구현 |
| 중괄호 불일치 | 스택으로 깊이 추적 |

### Compiler 문제
| 문제 | 해결책 |
|------|--------|
| 백패칭 오프셋 오류 | 바이트코드 위치 정확히 기록 |
| little-endian 인코딩 | shift 연산 검증 |
| JMP 오버플로우 | 4바이트 오프셋 사용 |

---

**마지막 업데이트**: 2026-04-02
**상태**: ✅ 체크리스트 준비 완료
**다음 단계**: Task 1 구현 시작
