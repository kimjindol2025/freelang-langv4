# Phase 5 예제: 제어 흐름 활용 사례

**작성일**: 2026-04-02
**상태**: ✅ 예제 문서

---

## 개요

Phase 5에서 if/while/return을 지원하면 다양한 알고리즘을 구현할 수 있습니다. 이 문서는 실제 예제들을 보여줍니다.

---

## 예제 1: 절댓값 (Absolute Value)

### 소스코드

```freelang
var x = -5

if (x < 0) {
  var x = 0 - x
}

return x
```

### 바이트코드 (의사코드)

```
PUSH_I32 -5
STORE 0          // x = -5

LOAD 0           // 스택: [-5]
PUSH_I32 0       // 스택: [-5, 0]
CMP LT           // 스택: [1] (true)
JMP_IF_FALSE 15  // 점프 안 함

PUSH_I32 0       // 스택: [0]
LOAD 0           // 스택: [0, -5]
SUB              // 스택: [5]
STORE 0          // x = 5

RETURN           // 반환
```

### 실행 결과

```
입력: x = -5
출력: 5
```

---

## 예제 2: 최대값 (Maximum)

### 소스코드

```freelang
var a = 10
var b = 20

var max = a

if (b > a) {
  var max = b
}

return max
```

### 바이트코드 (의사코드)

```
PUSH_I32 10
STORE 0          // a = 10

PUSH_I32 20
STORE 1          // b = 20

LOAD 0
STORE 2          // max = a

LOAD 1           // 스택: [20]
LOAD 0           // 스택: [20, 10]
CMP GT           // 스택: [1] (true)
JMP_IF_FALSE 20  // 점프 안 함

LOAD 1
STORE 2          // max = b

RETURN
```

### 실행 결과

```
입력: a = 10, b = 20
출력: max = 20
```

---

## 예제 3: 팩토리얼 (Factorial)

### 소스코드

```freelang
var n = 5
var result = 1

while (n > 1) {
  var result = result * n
  var n = n - 1
}

return result
```

### 바이트코드 (의사코드)

```
PUSH_I32 5
STORE 0          // n = 5

PUSH_I32 1
STORE 1          // result = 1

// Loop start @ 16
LOAD 0           // 스택: [5]
PUSH_I32 1       // 스택: [5, 1]
CMP GT           // 스택: [1] (true)
JMP_IF_FALSE 40  // Exit loop

LOAD 1           // 스택: [1]
LOAD 0           // 스택: [1, 5]
MUL              // 스택: [5]
STORE 1          // result = 5

LOAD 0           // 스택: [5]
PUSH_I32 1       // 스택: [5, 1]
SUB              // 스택: [4]
STORE 0          // n = 4

JMP 16           // Loop back

// Exit @ 40
RETURN
```

### 실행 결과

```
입력: n = 5
계산: 5! = 5 * 4 * 3 * 2 * 1
출력: result = 120
```

### 단계별 실행

| 반복 | n | result | 조건 | 액션 |
|------|---|--------|------|------|
| 초기 | 5 | 1 | - | - |
| 1 | 5 | 1 | 5>1 ✓ | result = 1*5 = 5 |
| 2 | 4 | 5 | 4>1 ✓ | result = 5*4 = 20 |
| 3 | 3 | 20 | 3>1 ✓ | result = 20*3 = 60 |
| 4 | 2 | 60 | 2>1 ✓ | result = 60*2 = 120 |
| 5 | 1 | 120 | 1>1 ✗ | exit |

---

## 예제 4: 구구단 (Multiplication Table)

### 소스코드

```freelang
var row = 1

while (row <= 9) {
  var col = 1

  while (col <= 9) {
    var result = row * col
    // 출력: result (프린트 기능 필요)

    var col = col + 1
  }

  var row = row + 1
}
```

### 특징

- 중첩 while 루프
- 각 반복에서 변수 재할당

### 예상 출력

```
1 2 3 4 5 6 7 8 9
2 4 6 8 10 12 14 16 18
3 6 9 12 15 18 21 24 27
...
```

---

## 예제 5: 피보나치 수열 (Fibonacci)

### 소스코드

```freelang
var n = 10
var a = 0
var b = 1
var i = 0

while (i < n) {
  var temp = a + b
  var a = b
  var b = temp

  var i = i + 1
}

return b
```

### 단계별 실행

| i | a | b | temp | 설명 |
|---|---|---|------|------|
| 0 | 0 | 1 | 1 | fib(0) = 0 |
| 1 | 1 | 1 | 2 | fib(1) = 1 |
| 2 | 1 | 2 | 3 | fib(2) = 1 |
| 3 | 2 | 3 | 5 | fib(3) = 2 |
| 4 | 3 | 5 | 8 | fib(4) = 3 |
| ... | ... | ... | ... | ... |
| 9 | 34 | 55 | - | fib(10) = 55 |

### 결과

```
입력: n = 10
출력: fib(10) = 55
```

---

## 예제 6: GCD (최대공약수)

### 소스코드

```freelang
var a = 48
var b = 18

while (b != 0) {
  var temp = b
  var b = a - b
  var a = temp
}

return a
```

### 알고리즘

유클리드 호제법: gcd(a, b) = gcd(b, a mod b)

### 단계별 실행

| 반복 | a | b | 조건 | 액션 |
|------|---|---|------|------|
| 초기 | 48 | 18 | - | - |
| 1 | 48 | 18 | b≠0 ✓ | temp=18, b=48-18=30, a=18 |
| 2 | 18 | 30 | b≠0 ✓ | temp=30, b=18-30=-12, a=30 |
| 3 | 30 | -12 | b≠0 ✓ | temp=-12, b=30-(-12)=42, a=-12 |
| ... | ... | ... | ... | ... |

**참고**: 이 예제는 뺄셈 기반이므로 나머지 연산이 필요 (Phase 6에서 추가 예정)

---

## 예제 7: 수 검증 (Is Prime - 간단한 버전)

### 소스코드

```freelang
var n = 17
var is_prime = 1
var divisor = 2

while (divisor < n) {
  if (n == divisor * divisor) {
    // 약수 발견
    var is_prime = 0
  }

  var divisor = divisor + 1
}

return is_prime
```

### 특징

- if 내부에서 변수 재할당
- 복합 조건 검사

**주의**: 현재 모듈로 연산이 없으므로 완벽한 소수 판정은 불가능

---

## 예제 8: 숫자 역순 (Reverse Number)

### 소스코드

```freelang
var num = 12345
var reversed = 0
var digit = 0

while (num > 0) {
  var digit = num - (num / 10) * 10  // digit = num % 10
  var reversed = reversed * 10 + digit
  var num = num / 10
}

return reversed
```

**주의**: 나눗셈 연산이 필요합니다.

### 예상 결과

```
입력: 12345
출력: 54321
```

---

## 예제 9: 중첩 if 조건문

### 소스코드

```freelang
var x = 15
var y = 20
var z = 0

if (x > 10) {
  if (y > 10) {
    var z = x + y
  } else {
    var z = x
  }
} else {
  var z = 0
}

return z
```

### 바이트코드 (의사코드)

```
PUSH 15
STORE 0          // x = 15

PUSH 20
STORE 1          // y = 20

PUSH 0
STORE 2          // z = 0

// if (x > 10)
LOAD 0           // 스택: [15]
PUSH 10          // 스택: [15, 10]
CMP GT           // 스택: [1]
JMP_IF_FALSE 50  // 외부 else로 점프

  // if (y > 10)
  LOAD 1         // 스택: [20]
  PUSH 10        // 스택: [20, 10]
  CMP GT         // 스택: [1]
  JMP_IF_FALSE 35 // 내부 else로 점프

    // z = x + y
    LOAD 0       // 스택: [15]
    LOAD 1       // 스택: [15, 20]
    ADD          // 스택: [35]
    STORE 2      // z = 35

    JMP 50       // 외부 else 건너뛰기

  // 내부 else @ 35
  35: LOAD 0     // 스택: [15]
      STORE 2    // z = 15

      JMP 50     // 외부 else 건너뛰기

// 외부 else @ 50
50: RETURN
```

### 실행 결과

```
입력: x = 15, y = 20
15 > 10 (true) -> 20 > 10 (true) -> z = 15 + 20 = 35
출력: z = 35
```

---

## 예제 10: 복합 루프 제어

### 소스코드

```freelang
var i = 1
var sum = 0

while (i <= 10) {
  if (i == 5) {
    // 특정 값 스킵 (return으로 대체, 다음 Phase에서 continue 추가)
    var i = i + 1
  } else {
    var sum = sum + i
    var i = i + 1
  }
}

return sum
```

### 예상 결과

```
입력: i = 1~10, 5는 스킵
계산: 1+2+3+4+6+7+8+9+10 = 50
출력: sum = 50
```

---

## 예제 11: 두 수의 GCD (비교 버전)

### 소스코드

```freelang
var a = 48
var b = 18

while (a != b) {
  if (a > b) {
    var a = a - b
  } else {
    var b = b - a
  }
}

return a
```

### 단계별 실행

| 반복 | a | b | 조건 | 액션 |
|------|---|---|------|------|
| 초기 | 48 | 18 | - | - |
| 1 | 48 | 18 | 48≠18 ✓, 48>18 ✓ | a = 48-18 = 30 |
| 2 | 30 | 18 | 30≠18 ✓, 30>18 ✓ | a = 30-18 = 12 |
| 3 | 12 | 18 | 12≠18 ✓, 12>18 ✗ | b = 18-12 = 6 |
| 4 | 12 | 6 | 12≠6 ✓, 12>6 ✓ | a = 12-6 = 6 |
| 5 | 6 | 6 | 6≠6 ✗ | exit |

### 결과

```
입력: a = 48, b = 18
출력: gcd = 6
```

---

## 예제 12: 선택 정렬 (Selection Sort) - 개념

### 의사코드

```freelang
// 배열 정렬 (Phase 6에서 배열 지원 후 구현)
var arr = [64, 34, 25, 12, 22, 11, 90]

var i = 0
while (i < 7) {
  var min_idx = i
  var j = i + 1

  while (j < 7) {
    if (arr[j] < arr[min_idx]) {
      var min_idx = j
    }
    var j = j + 1
  }

  // swap arr[i] with arr[min_idx]

  var i = i + 1
}
```

**주의**: Phase 5에서는 배열 인덱싱 미지원. Phase 6에서 구현 예정.

---

## 성능 고찰

### Phase 5 제약

| 기능 | 지원 | 예상 영향 |
|------|------|---------|
| if/else | ✅ | 조건부 실행 가능 |
| while | ✅ | 반복 실행 가능 |
| return | ✅ | 함수 반환 가능 |
| 변수 | ✅ | 로컬 상태 관리 |
| 산술 연산 | ✅ | +, -, *, / |
| 비교 연산 | ✅ | <, >, <=, >=, ==, != |
| **배열** | ❌ | 정렬/검색 불가 |
| **함수 정의** | ❌ | 서브루틴 불가 (다음 Phase) |
| **모듈로** | ❌ | % 연산 불가 (Phase 6+) |

### 성능 예상

| 예제 | 바이트코드 | 실행 시간 | 메모리 |
|------|-----------|---------|--------|
| 절댓값 | 20 바이트 | <1ms | 8 바이트 |
| 팩토리얼(5) | 40 바이트 | <1ms | 16 바이트 |
| 피보나치(10) | 50 바이트 | <1ms | 24 바이트 |
| 구구단 | 80 바이트 | ~5ms | 16 바이트 |

---

## 디버깅 팁

### 무한 루프 탐지

```freelang
// 문제: while (x > 0) { var y = y + 1 }
// x가 감소하지 않으므로 무한 루프

// 해결: 조건 확인
while (x > 0) {
  var x = x - 1  // 반드시 x 감소시키기
}
```

### 변수 범위 이슈

```freelang
// 문제: if 블록 내에서 선언한 변수가 블록 밖에서 사용 불가
var result = 0

if (x > 0) {
  var temp = x + 1
}

// temp는 여기서 정의되지 않음

// 해결: 사전에 선언
var temp = 0
if (x > 0) {
  var temp = x + 1
}
```

### 비교 연산자 오류

```freelang
// 잘못: if (x = 5)  // 대입
// 맞음: if (x == 5) // 비교
```

---

## 예제 테스트 절차

각 예제를 다음처럼 테스트합니다:

```bash
# 1. 소스코드를 compiler.fl에 입력
var source = "var x = -5; if (x < 0) { var x = 0 - x } return x"

# 2. Lexer 실행
# Tokens 확인

# 3. Parser 실행
# AST 확인

# 4. Compiler 실행
# Bytecode 확인

# 5. VM에서 실행
# 결과 확인: 5 ✓
```

---

## 다음 예제 (Phase 6+)

- 배열 초기화 및 접근
- 배열 반복 (for 루프)
- 함수 정의 및 호출
- 구조체 정의 및 메서드
- 패턴 매칭
- 모듈 시스템

---

**작성자**: Claude Haiku 4.5 Agent
**마지막 업데이트**: 2026-04-02
