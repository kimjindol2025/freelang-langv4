# ISA v1.0: Instruction Set Architecture

**Version**: 1.0
**Status**: Stable
**Date**: 2026-03-03

---

## 목차
1. [개념](#개념)
2. [명령어 분류](#명령어-분류)
3. [레지스터 모델](#레지스터-모델)
4. [명령어 형식](#명령어-형식)
5. [기본 명령어](#기본-명령어)
6. [제어 흐름 명령어](#제어-흐름-명령어)
7. [메모리 관리 명령어](#메모리-관리-명령어)
8. [고급 기능 명령어](#고급-기능-명령어)
9. [예제](#예제)

---

## 개념

**ISA (Instruction Set Architecture)**는 **VM 또는 CPU가 실행할 수 있는 저수준 명령어**를 정의합니다.

### 역할

```
High-Level Language (FreeLang v4)
    ↓ [Compiler/Codegen]
Intermediate Representation (AST)
    ↓ [Code Generation]
Bytecode / Machine Code (ISA v1.0)
    ↓ [VM/CPU Execution]
Runtime Execution
```

### 설계 원칙

1. **고수준 구조와 직접 연계**: Struct, Array, Functions 등을 직접 지원
2. **스택 기반 VM**: 간단한 구현, 효율적 메모리 관리
3. **제어 흐름 통합**: 조건, 루프, 함수 호출을 명령어로 표현
4. **타입 안전성**: 런타임 타입 검사 지원

---

## 명령어 분류

| 카테고리 | 설명 | 예시 |
|---------|------|------|
| **Data Movement** | 값 복사 및 이동 | MOV, LOAD, STORE |
| **Arithmetic/Logic** | 산술, 논리 연산 | ADD, SUB, MUL, DIV, AND, OR, XOR |
| **Comparison** | 비교 및 플래그 설정 | CMP, JMP_IF |
| **Control Flow** | 분기, 루프, 함수 호출 | JMP, CALL, RET, FOR_INIT, FOR_NEXT |
| **Memory Allocation** | 스택 프레임 관리 | ALLOC, FREE, PUSH, POP |
| **Pattern Matching** | 구조 매칭 | MATCH |
| **Exception Handling** | 오류 처리 | TRY_BEGIN, TRY_END, RAISE, CATCH |
| **Closures & First-Class** | 클로저, 고차 함수 | CLOSURE_CREATE, CLOSURE_CALL |
| **System Calls** | 표준 라이브러리 호출 | SYS_CALL |

---

## 레지스터 모델

### 범용 레지스터

```
r0, r1, r2, ..., r15   (16개 범용 레지스터)
```

### 특수 레지스터

```
ip (Instruction Pointer)     # 다음 실행할 명령어 위치
sp (Stack Pointer)           # 스택 최상단
fp (Frame Pointer)           # 현재 함수 프레임
flags                        # 플래그 레지스터
```

### 플래그 레지스터

| 플래그 | 비트 | 의미 |
|--------|------|------|
| Z (Zero) | 0 | 마지막 연산 결과가 0 |
| C (Carry) | 1 | 산술 오버플로우/언더플로우 |
| S (Sign) | 2 | 마지막 결과가 음수 |
| E (Equal) | 3 | CMP 결과가 같음 |
| L (Less) | 4 | CMP 결과가 작음 |
| G (Greater) | 5 | CMP 결과가 큼 |

---

## 명령어 형식

### 1. 기본 형식

```
OPCODE operand1, operand2, ...

예:
MOV r0, r1         # r1의 값을 r0에 복사
ADD r0, r1, r2     # r0 = r1 + r2
```

### 2. 피연산자 종류

| 종류 | 표기 | 예시 |
|------|------|------|
| 레지스터 | r\<n\> | r0, r1, ..., r15 |
| 메모리 | [addr] | [r0], [1024] |
| 상수 | const | 42, 3.14, "hello" |
| 레이블 | label | loop_start, func_end |
| 주소 | &var | &x (변수 x의 주소) |

---

## 기본 명령어

### 1. 데이터 이동 (Data Movement)

```
MOV dest, src          # dest ← src
LOAD reg, [addr]       # reg ← Memory[addr]
STORE [addr], reg      # Memory[addr] ← reg
```

**예시**:
```
MOV r0, 42             # r0 ← 42
LOAD r1, [r0]          # r1 ← Memory[r0의 값]
STORE [100], r0        # Memory[100] ← r0의 값
```

---

### 2. 산술 연산 (Arithmetic)

```
ADD dest, src1, src2   # dest ← src1 + src2
SUB dest, src1, src2   # dest ← src1 - src2
MUL dest, src1, src2   # dest ← src1 * src2
DIV dest, src1, src2   # dest ← src1 / src2
MOD dest, src1, src2   # dest ← src1 % src2
```

**플래그 설정**: Z, C, S 플래그 업데이트

---

### 3. 논리 연산 (Logic)

```
AND dest, src1, src2   # dest ← src1 & src2
OR dest, src1, src2    # dest ← src1 | src2
XOR dest, src1, src2   # dest ← src1 ^ src2
NOT dest, src          # dest ← ~src
```

---

### 4. 비교 (Comparison)

```
CMP reg1, reg2         # reg1과 reg2 비교, 플래그 설정
```

**설정되는 플래그**:
- E (Equal): reg1 == reg2
- L (Less): reg1 < reg2
- G (Greater): reg1 > reg2
- Z (Zero): 차이가 0

---

### 5. 스택 연산 (Stack)

```
PUSH reg               # 스택에 reg 값 푸시
POP reg                # 스택에서 값 꺼내 reg에 저장
```

**스택 포인터 자동 갱신**

---

## 제어 흐름 명령어

### 1. 무조건 분기

```
JMP addr               # addr로 점프 (IP ← addr)
```

**예시**:
```
JMP loop_start         # loop_start 레이블로 점프
```

---

### 2. 조건부 분기

```
JMP_IF cond, addr      # 조건이 true면 addr로 점프
```

**조건**:
```
Z      # if Zero flag
NZ     # if Not Zero
C      # if Carry
NC     # if No Carry
E      # if Equal
NE     # if Not Equal
L      # if Less
LE     # if Less or Equal
G      # if Greater
GE     # if Greater or Equal
```

**예시**:
```
CMP r0, 0
JMP_IF NZ, not_zero    # r0 != 0이면 not_zero로 점프
```

---

### 3. 함수 호출 및 반환

```
CALL addr              # 함수 addr 호출 (복귀 주소 스택에 푸시)
RET                    # 스택에서 복귀 주소 꺼내 점프
```

**호출 규칙** (Calling Convention):
- 인자: r0, r1, r2, ... (순서대로)
- 반환값: r0
- 호출자가 스택 정리
- 복귀 주소: 호출 직후 주소 자동 푸시

**예시**:
```
MOV r0, 10             # 인자: 10
MOV r1, 20             # 인자: 20
CALL func_add          # func_add(10, 20) 호출
# 복귀 후 r0에 결과
```

---

## 메모리 관리 명령어

### 1. 스택 프레임

```
ALLOC size             # 스택에서 size 바이트 할당 (fp 조정)
FREE size              # 스택에서 size 바이트 해제
```

**함수 프로롤로그/에필로그**:
```
; 함수 시작
PUSH fp                # 이전 fp 저장
MOV fp, sp             # 새 fp 설정
ALLOC local_size       # 로컬 변수 공간 할당

; ... 함수 본체 ...

; 함수 종료
FREE local_size
POP fp
RET
```

---

### 2. 메모리 접근

```
LOAD reg, [addr]       # 메모리에서 읽기
STORE [addr], reg      # 메모리에 쓰기
```

**주소 모드**:
```
[r0]               # 레지스터 간접 (r0의 값이 주소)
[r0 + offset]      # 레지스터 + 오프셋
[1024]             # 절대 주소
```

---

## 고급 기능 명령어

### 1. 구조체 연산

```
STRUCT_CREATE type     # type 구조체 인스턴스 생성
STRUCT_GET reg, field  # 필드 읽기
STRUCT_SET field, reg  # 필드 쓰기
```

**예시**:
```
STRUCT_CREATE Point    # Point 인스턴스 생성 → r0에 저장
MOV r1, 10
STRUCT_SET Point.x, r1 # Point.x ← 10
STRUCT_GET r2, Point.x # r2 ← Point.x (r2 = 10)
```

---

### 2. 배열 연산

```
ARRAY_CREATE type, size    # 크기 size의 배열 생성
ARRAY_GET reg, [arr], idx  # arr[idx] 읽기
ARRAY_SET [arr], idx, reg  # arr[idx] ← reg
ARRAY_LEN reg, [arr]       # 배열 길이 구하기
```

---

### 3. 패턴 매칭

```
MATCH val, pattern_table   # val을 pattern_table과 매칭
```

**pattern_table**: 패턴 → 액션 주소 매핑

**동작**:
```
for each (pattern, action_addr) in pattern_table:
  if matches(val, pattern):
    JMP action_addr
    break
```

---

### 4. 예외 처리

```
TRY_BEGIN handler_addr     # try 시작, 오류 시 handler_addr로
TRY_END                    # try 종료
RAISE error_obj            # 오류 발생
CATCH error_var            # catch 절 시작
FINALLY addr               # finally 블록 주소
```

**실행 흐름**:
```
1. TRY_BEGIN → try 블록 실행
2. 오류 발생 → handler_addr로 점프
3. CATCH에서 처리
4. FINALLY 실행 (항상)
```

---

### 5. 클로저 & 일급 함수

```
CLOSURE_CREATE reg, fn_addr, env_reg   # 클로저 생성
CLOSURE_CALL reg, arg_count            # 클로저 호출
```

**동작**:
```
; 클로저 생성
CLOSURE_CREATE r0, my_func, env        # r0 ← 클로저
MOV r1, 10                             # 인자
CLOSURE_CALL r0, 1                     # 클로저(10) 호출
```

---

### 6. 루프 지원

```
FOR_INIT reg, count        # 루프 초기화 (reg ← count)
FOR_NEXT reg, start_addr   # 다음 반복 (reg--, start_addr로 점프)
```

**while 루프 구현**:
```
loop_start:
  CMP cond, 0              # 조건 평가
  JMP_IF Z, loop_end       # 조건 거짓이면 루프 종료
  ; 루프 본체
  JMP loop_start
loop_end:
```

**for...of 루프 구현**:
```
FOR_INIT r0, array_len     # r0 ← 배열 길이
for_start:
  ARRAY_GET r1, [arr], r0  # r1 ← arr[r0]
  ; 루프 본체 (r1 사용)
  FOR_NEXT r0, for_start   # r0--, for_start로 점프 (r0 >= 0)
```

---

### 7. 시스템 호출

```
SYS_CALL code, [args...]   # 표준 라이브러리 함수 호출
```

**코드 번호**:
```
1: println(string)
2: read_file(path)
3: write_file(path, content)
4: json_parse(string)
...
```

**예시**:
```
MOV r0, 1                  # SYS_CALL 코드 (println)
MOV r1, &"hello"           # 인자 (문자열 주소)
SYS_CALL 1, r1             # println("hello")
```

---

## 예제

### 예제 1: 함수 호출

```
; 함수 정의
func_add:
  PUSH fp
  MOV fp, sp
  ALLOC 0

  ADD r0, r0, r1           ; r0 ← r0 + r1

  FREE 0
  POP fp
  RET

; 메인
main:
  MOV r0, 10
  MOV r1, 20
  CALL func_add            ; func_add(10, 20)
  SYS_CALL 1, r0           ; println(30)
```

---

### 예제 2: Struct 인스턴스

```
; struct Point { x: f64, y: f64 }

main:
  STRUCT_CREATE Point      ; r0 ← Point 인스턴스
  MOV r1, 3.14
  STRUCT_SET Point.x, r1   ; Point.x ← 3.14
  MOV r2, 2.71
  STRUCT_SET Point.y, r2   ; Point.y ← 2.71

  STRUCT_GET r3, Point.x   ; r3 ← Point.x
  SYS_CALL 1, r3           ; println(3.14)
```

---

### 예제 3: for...of 루프

```
; for x of [1, 2, 3, 4, 5]

main:
  ARRAY_CREATE i32, 5      ; r0 ← 배열

  ; 배열 초기화
  MOV r2, 0                ; 인덱스
  MOV r3, 1
loop_init:
  ARRAY_SET [r0], r2, r3
  ADD r3, r3, 1
  ADD r2, r2, 1
  CMP r2, 5
  JMP_IF NE, loop_init

  ; for...of 루프
  FOR_INIT r2, 5
loop_start:
  ARRAY_GET r1, [r0], r2   ; r1 ← 배열[인덱스]
  SYS_CALL 1, r1           ; println(r1)
  FOR_NEXT r2, loop_start
```

---

### 예제 4: 패턴 매칭

```
; match value with
;   0 => "zero"
;   1 => "one"
;   _ => "other"

main:
  MOV r0, 1                ; value = 1

  MATCH r0, patterns       ; 패턴 테이블로 점프

patterns:
  ; pattern_table: {0 → addr_zero, 1 → addr_one, _ → addr_other}
  ; MATCH r0과 비교해 매칭되는 주소로 점프

addr_zero:
  SYS_CALL 1, &"zero"
  JMP end

addr_one:
  SYS_CALL 1, &"one"
  JMP end

addr_other:
  SYS_CALL 1, &"other"
  JMP end

end:
```

---

### 예제 5: 예외 처리

```
; try { ... } catch (e) { ... }

main:
  TRY_BEGIN catch_handler

  MOV r0, 0
  CMP r0, 0
  JMP_IF Z, error_case     ; 0이면 오류 발생

  SYS_CALL 1, &"success"
  JMP finally_block

error_case:
  RAISE {type: "ValueError", message: "..."}

catch_handler:
  ; 오류 객체가 r0에 저장됨
  SYS_CALL 1, &"error caught"

finally_block:
  SYS_CALL 1, &"cleanup"
```

---

## 상호 참조

- **SPEC_09**: Struct (STRUCT_* 명령어)
- **SPEC_10**: First-Class Functions (CLOSURE_* 명령어)
- **SPEC_11**: Control Flow (JMP, FOR_* 명령어)
- **SPEC_12**: Pattern Matching (MATCH 명령어)
- **SPEC_13**: Error Handling (TRY_*, RAISE, CATCH)

---

## 변경 이력

| 버전 | 날짜        | 변경사항        |
|------|-----------|-------------|
| 1.0  | 2026-03-03 | 초판 작성      |

---

## VM 구현 가이드

ISA v1.0을 VM으로 구현하려면:

1. **명령어 디코더**: 바이트코드 → 명령어 파싱
2. **실행 엔진**: 명령어 순서대로 실행
3. **레지스터/메모리**: 상태 관리
4. **스택**: 함수 호출 및 로컬 변수
5. **플래그**: 비교 결과 저장

### 간단한 VM 사이클

```
while (running) {
  instr = fetch_instruction(ip);
  execute(instr);
  ip++;
}
```

### 명령어 실행 예

```
MOV r0, 42:
  registers[0] = 42

ADD r0, r1, r2:
  registers[0] = registers[1] + registers[2]
  update_flags(registers[0])

CALL addr:
  push(ip + 1)          ; 복귀 주소 저장
  ip = addr
```

---

## 확장 계획

- **SIMD 명령어**: 벡터 연산
- **비동기 I/O**: async/await 지원
- **JIT 컴파일**: 네이티브 코드 생성
- **최적화**: 루프 언롤링, 인라인 확장
