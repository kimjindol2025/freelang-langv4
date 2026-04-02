# Phase 5 설계 최종 요약

**작성일**: 2026-04-02
**상태**: ✅ 설계 완료
**목표**: FreeLang v4 부트스트랩에 제어 흐름 (if/while/return) 추가

---

## 🎯 요약

### 현재 상태 (Phase 3-4)
```
✅ Lexer: 기본 토큰화 (var, 식별자, 숫자, +)
✅ Parser: VAR 문장만 지원
✅ Compiler: PUSH_I32, STORE, HALT만 구현
❌ 제어 흐름: 지원 안 함
```

### 목표 상태 (Phase 5 완료)
```
✅ Lexer: if, else, while, return, 비교연산자 추가
✅ Parser: if/else 블록, while 루프, return 문 파싱
✅ Compiler: 조건부 점프, 루프 백패칭, 함수 반환 구현
✅ 제어 흐름: 튜링 완전성 달성
```

---

## 📊 Phase 5 범위

### 추가될 언어 기능

**제어 흐름 (Control Flow)**
```freelang
if (condition) {
  // then 블록
} else {
  // else 블록
}

while (condition) {
  // 루프 본체
}

return value;
```

**비교 연산자**
```freelang
x < y    // 작다
x > y    // 크다
x <= y   // 작거나 같다
x >= y   // 크거나 같다
x == y   // 같다
x != y   // 같지 않다
```

**산술 연산자 (추가)**
```freelang
a + b    // 더하기 (기존)
a - b    // 빼기 (신규)
a * b    // 곱하기 (신규)
a / b    // 나누기 (신규)
```

### 구현 범위

| 항목 | 내용 | 라인 |
|------|------|------|
| **Lexer** | 17개 토큰 추가 | ~50줄 |
| **Parser** | 표현식 + 제어 흐름 | ~100줄 |
| **Compiler** | 10개 옵코드 + 백패칭 | ~150줄 |
| **Tests** | 통합 및 유닛 테스트 | ~150줄 |
| **문서** | PHASE5_*.md 5개 파일 | ~1200줄 |
| **합계** | - | ~1650줄 |

---

## 🏗️ 아키텍처 개요

### 파이프라인

```
입력: FreeLang 소스코드
  │
  ├─→ PHASE 1: Lexer (토큰화)
  │   ├─ 문자 → 토큰
  │   ├─ 키워드, 식별자, 숫자, 연산자 분류
  │   └─ 출력: 토큰 배열
  │
  ├─→ PHASE 2: Parser (파싱)
  │   ├─ 토큰 → AST
  │   ├─ 재귀 강하 파싱 (Recursive Descent)
  │   ├─ 변수, if, while, return 구문 인식
  │   └─ 출력: AST 노드 배열
  │
  ├─→ PHASE 3: Compiler (바이트코드 생성)
  │   ├─ AST → 바이트코드
  │   ├─ PUSH, STORE, LOAD, CMP, JMP 옵코드
  │   ├─ 백패칭: 점프 오프셋 수정
  │   └─ 출력: 바이트코드 + 상수 풀
  │
  └─→ VM 실행
      ├─ 스택 머신으로 해석
      └─ 결과 출력
```

### 스택 머신 모델

```
동작 예: var x = 5; if (x < 10) { ... }

[1] PUSH_I32 5        스택: [5]
[2] STORE 0           전역변수[0] = 5, 스택: []

[3] LOAD 0            스택: [5]
[4] PUSH_I32 10       스택: [5, 10]
[5] CMP LT            비교: 5 < 10, 스택: [1]
[6] JMP_IF_FALSE 20   거짓이면 점프 (조건 결과가 0)
[7] ...               then 블록
[20] ...              else 또는 다음 코드
```

---

## 📈 주요 설계 결정

### 1. 토큰 구분 (2자 연산자)

**문제**: "=" vs "=="를 어떻게 구분할 것인가?

**해결책**: Lookahead (다음 문자 확인)
```freelang
if c == "=" {
  if li + 1 < length(source) && char_at(source, li + 1) == "=" {
    // ==
  } else {
    // =
  }
}
```

### 2. 평행 배열 구조

**문제**: 토큰에 (타입, 값) 정보 필요 but 타입 체커가 혼합 배열 거부

**해결책**: 별도 배열 유지
```freelang
var lexeme_types = []   // [TOK_VAR, TOK_IDENT, ...]
var lexeme_values = []  // ["var", "x", ...]

// 동기화 유지
push(lexeme_types, TOK_IDENT)
push(lexeme_values, "x")
```

### 3. AST 노드 표현

**문제**: 복잡한 구조 (조건, then, else) 표현 방법?

**해결책**: 인덱스 기반 저장
```freelang
// AST 정보를 평행 배열에 저장
var ast_types = []      // NODE_IF, NODE_VAR, ...
var ast_cond_idx = []   // 조건 노드 인덱스
var ast_then_idx = []   // then 블록 시작 인덱스
var ast_else_idx = []   // else 블록 시작 인덱스
```

### 4. 백패칭 전략

**문제**: 점프 명령어 생성 시 목표 주소를 아직 모름

**해결책**: 두 번 순회 (오프셋 나중에 수정)
```freelang
// 1단계: 점프 생성 (오프셋 = 0)
var jmp_addr = length(bytecode)
push(bytecode, OP_JMP_IF_FALSE)
push(bytecode, 0)  // 임시값

// 2단계: 목표 코드 생성
compile_block(then_block)

// 3단계: 백패칭 (실제 오프셋으로 수정)
var target = length(bytecode)
bytecode[jmp_addr + 1] = bitand(target, 255)
// ... little-endian 계속
```

### 5. 루프 처리

**문제**: while의 조건과 본체를 여러 번 실행해야 함

**해결책**: JMP로 루프 시작으로 돌아가기
```freelang
loop_start = length(bytecode)
compile_expr(condition)     // 조건 검사
JMP_IF_FALSE exit          // 끝내기
compile_block(body)         // 본체 실행
JMP loop_start             // 조건으로 돌아가기
exit:
```

---

## 🧪 테스트 전략

### 3단계 테스트

```
Level 1: 단위 테스트
├─ Lexer: 각 토큰 분류 검증
├─ Parser: 각 문장 파싱 검증
└─ Compiler: 각 옵코드 생성 검증

Level 2: 통합 테스트
├─ 전체 파이프라인 (입력 → 바이트코드)
├─ 작은 프로그램 end-to-end 검증
└─ 결과 정확성 확인

Level 3: 알고리즘 테스트
├─ 팩토리얼, 피보나치 등
├─ 중첩 제어 흐름
├─ 엣지 케이스 (무한루프, 거짓 조건 등)
└─ 성능 벤치마크
```

### 테스트 예제

```freelang
// 1. 절댓값
var x = -5
if (x < 0) {
  var x = 0 - x
}
return x  // 5

// 2. 팩토리얼
var n = 5
var result = 1
while (n > 1) {
  var result = result * n
  var n = n - 1
}
return result  // 120

// 3. 중첩 if
if (a > 0) {
  if (b > 0) {
    var c = a + b
  }
}
```

---

## 📋 산출물 목록

### 설계 문서 (5개)

1. **PHASE5_DESIGN.md** (650줄)
   - 렉서, 파서, 컴파일러 상세 설계
   - 아키텍처 검토
   - 위험도 분석

2. **PHASE5_IMPLEMENTATION_GUIDE.md** (700줄)
   - Task별 구현 단계
   - 코드 스니펫
   - 단계별 테스트 지침

3. **PHASE5_EXAMPLES.md** (500줄)
   - 12개 실제 예제
   - 각 예제의 실행 단계
   - 예상 결과

4. **PHASE5_ARCHITECTURE.md** (800줄)
   - 전체 아키텍처 다이어그램
   - 각 단계의 상세 설계
   - 알고리즘 상세

5. **PHASE5_CHECKLIST.md** (600줄)
   - Task별 체크리스트
   - 일일 진행 로그
   - 완료 기준

### 예상 구현 코드

- **compiler.fl** 추가/수정: ~450줄
- **test-phase5.fl**: ~150줄

---

## 🎓 학습 기대효과

### FreeLang 언어 특성 이해
- 비트 연산 (bitand, shr) 활용
- 동적 배열 처리
- 재귀 없이 트리 구조 구현 방법
- 스택 머신 아키텍처 이해

### 컴파일러 개발 경험
- 렉서 구현: 상태 관리, 토큰 분류
- 파서 구현: 재귀 강하, 우선순위
- 컴파일러 구현: 코드 생성, 백패칭
- 자가호스팅의 의미와 가치

### 엔지니어링 스킬
- 단계적 설계 방법론
- 광범위한 테스트 전략
- 복잡한 문제 분해 능력
- 문서화 중요성 인식

---

## 🚀 다음 Phase 준비

### Phase 6: 함수 정의 (Functions)
```freelang
fn add(a: i32, b: i32) -> i32 {
  return a + b
}

var result = add(5, 3)  // 8
```

**새로 추가될 개념**:
- 함수 선언 파싱
- 함수 호출
- 지역 변수 스코프
- 콜 스택 관리
- 반환 주소 저장

### Phase 7: 배열 (Arrays)
```freelang
var arr = [1, 2, 3, 4, 5]
var sum = arr[0] + arr[1]  // 3
```

### Phase 8: 완전 자가호스팅
- TypeScript 의존성 최소화 (VM만 유지)
- FreeLang으로 전체 컴파일러 재구현
- 프로덕션 레벨 성능

---

## 📌 핵심 포인트

### "왜 Phase 5인가?"
```
Phase 1-3: 기본 문법 (변수)
Phase 4: 산술 연산 (표현식)
Phase 5: 제어 흐름 ← 튜링 완전성 달성 지점!
         if/while/return으로 어떤 알고리즘도 구현 가능
```

### "왜 어렵고 흥미로운가?"
1. **복잡도 증가**: 선형 코드 → 분기/루프 처리
2. **백패칭**: 미래 주소를 현재 시점에 수정하는 기법
3. **중첩**: 여러 수준의 블록을 올바르게 처리
4. **스택 관리**: 평가 스택과 전역 변수를 동시 관리

### "Phase 5 후 가능해지는 것"
- ✅ 조건부 실행 (알고리즘 분기)
- ✅ 반복 (알고리즘 루프)
- ✅ 함수 반환 (제어 흐름 종료)
- ✅ 모든 기본 알고리즘 구현 (정렬, 검색, 수학 등)

---

## 📞 FAQ

### Q1: 왜 if 조건에 괄호가 필요한가?
A: 문법 단순화. `if (x < 10)` vs `if x < 10` 둘 다 가능하지만, 괄호가 있으면 파서가 더 간단함.

### Q2: else if는 지원하는가?
A: Phase 5에서는 `else if` 문법이 없음. 대신 `else { if (...) { } }` 중첩으로 구현 가능.

### Q3: break, continue는?
A: Phase 5에서는 미지원. Phase 7+ 예정.

### Q4: switch 문은?
A: Phase 5에서는 미지원. 여러 if-else로 구현 가능.

### Q5: 무한루프는?
A: `while (1) { ... }` 가능 (VM 타임아웃 없으므로 주의).

---

## 💡 설계의 정신

**"단순함 속의 강력함 (Power in Simplicity)"**

- FreeLang 타입 시스템의 제약 안에서 작동
- 평행 배열로 복잡한 구조 표현
- 선형 바이트코드로 모든 제어 흐름 표현
- 백패칭으로 우아한 점프 처리

이런 제약들이 오히려 창의적인 설계를 유도했고, 자가호스팅 가능성을 증명했다.

---

## 🎯 최종 목표

**Phase 5 완료 후 FreeLang v4는**:

```
┌──────────────────────────────────────┐
│  자신의 컴파일러를                   │
│  자신으로 완성하는 언어              │
│                                      │
│  (완전한 자가호스팅으로 한 걸음)    │
└──────────────────────────────────────┘
```

---

## 📚 참고 자료

### 설계 참고
- "Crafting Interpreters" - Robert Nystrom
  - Lox 언어의 if/while 구현
  - 백패칭 기법

- "Engineering a Compiler" - Keith D. Cooper
  - 코드 생성 알고리즘
  - 점프 최적화

### FreeLang 내부
- `/src/vm.ts` - VM 옵코드 정의
- `compiler.fl` - 현재 부트스트랩 구현
- `/ARCHITECTURE.md` - 전체 아키텍처

---

**문서 작성**: Claude Haiku 4.5 Agent
**버전**: 1.0
**상태**: ✅ 설계 완료
**날짜**: 2026-04-02

**다음 단계**: Phase 5 구현 시작 (Task 1: Lexer 토큰 추가)
