# Phase 6: 완전 셀프호스팅 (VM 구현)

## 목표
FreeLang으로 VM을 구현하여, 순수 FreeLang 기반 컴파일 시스템 완성

```
FreeLang Source → Compiler → Bytecode
                    ↓
                   VM (FreeLang)
                    ↓
                  결과
```

---

## 구현 계획

### Stage 6a: 기본 VM (PUSH, HALT)
**목표**: Stack 기반 VM 기초

```
입력: [1, 42, 0, 0, 0, 67]  (PUSH 42, HALT)
처리:
  - Stack 관리 (초기화, push, pop)
  - Opcode 디코딩
  - PUSH_I32 + 4바이트 값 읽기
  - HALT로 종료
출력: Stack = [42]
검증: ✅ PASS
```

**구현 요소**:
- vm_stack (배열)
- vm_pc (프로그램 카운터)
- vm_memory (변수 저장소)
- Opcode 루프

---

### Stage 6b: 연산 (ADD, SUB, MUL, DIV)
**목표**: 산술 연산 지원

```
입력: [1, 3, 0, 0, 0, 1, 4, 0, 0, 0, 18, 67]  (PUSH 3, PUSH 4, MUL, HALT)
처리:
  - PUSH 3: stack = [3]
  - PUSH 4: stack = [3, 4]
  - MUL: pop 4, pop 3, push 12, stack = [12]
  - HALT: 종료
출력: [12]
검증: ✅ PASS
```

**Opcode**:
- OP_ADD (16): pop b, pop a, push a+b
- OP_SUB (17): pop b, pop a, push a-b
- OP_MUL (18): pop b, pop a, push a*b
- OP_DIV (19): pop b, pop a, push a/b

---

### Stage 6c: 변수 (LOAD, STORE)
**목표**: 메모리 관리 (변수 저장/로드)

```
입력: [1, 10, 0, 0, 0, 49, 0, 0, 0, 0, 50, 0, 0, 0, 0, 67]
      (PUSH 10, STORE 0, LOAD 0, HALT)
처리:
  - PUSH 10: stack = [10]
  - STORE 0: memory[0] = 10, stack = []
  - LOAD 0: stack = [10]
  - HALT: 종료
출력: [10]
검증: ✅ PASS
```

**Opcode**:
- OP_LOAD (50): push memory[arg]
- OP_STORE (49): memory[arg] = pop()

---

### Stage 6d: 제어흐름 (JMP_FALSE)
**목표**: 조건부 점프

```
입력: [50, 0, 0, 0, 0, 1, 0, 0, 0, 0, 22, 30, 16, 0, 0, 0, 67]
      (LOAD 0, PUSH 0, GT, JMP_FALSE 16, ..., HALT)
처리:
  - LOAD 0: stack = [x]
  - PUSH 0: stack = [x, 0]
  - GT: pop 0, pop x, push (x>0 ? 1 : 0)
  - JMP_FALSE 16: if top == 0, pc = 16 else pc++
  - HALT
검증: ✅ PASS
```

**Opcode**:
- OP_LT (21): pop b, pop a, push (a < b ? 1 : 0)
- OP_GT (22): pop b, pop a, push (a > b ? 1 : 0)
- OP_JMP_FALSE (30): if pop() == 0, pc = arg else pc++

---

### Stage 6e: 빌트인 (CALL_BUILTIN)
**목표**: 내장 함수 호출

```
입력: [2, 0, 0, 0, 0, 60, 1, 0, 0, 0, 67]
      (PUSH_STR 0, CALL_BUILTIN 1, HALT)
처리:
  - PUSH_STR 0: stack = [const_pool[0]]
  - CALL_BUILTIN 1: println(stack[0])
  - HALT
검증: ✅ PASS (화면 출력)
```

**Opcode**:
- OP_PUSH_STR (2): push constants[arg]
- OP_CALL_BUILTIN (60): 빌트인 함수 호출

---

### Stage 6f: 통합 + 최종 검증
**목표**: 완전 셀프호스팅 검증

```
구조:
  compiler.fl (FreeLang 컴파일러)
       ↓ 컴파일
  bytecode (11 bytes)
       ↓ 실행
  vm.fl (FreeLang VM)
       ↓ 결과
  [1, 42, ...]
```

검증:
1. fl-compiler.fl 실행 → bytecode 생성
2. vm.fl에 bytecode 입력
3. vm.fl 실행 → 결과 출력
4. compiler.fl 결과와 일치 확인

---

## 파일 구조

```
freelang-v4/
├── vm-basic.fl         (Stage 6a: PUSH, HALT)
├── vm-arithmetic.fl    (Stage 6b: +, -, *, /)
├── vm-memory.fl        (Stage 6c: LOAD, STORE)
├── vm-control.fl       (Stage 6d: JMP_FALSE)
├── vm-builtin.fl       (Stage 6e: CALL_BUILTIN)
└── vm.fl               (Stage 6f: 통합 VM)
```

---

## 구현 난제 & 해결책

### 난제 1: Stack 관리 (FreeLang 배열)
```freelang
❌ var stack = [i32]  // 혼합 타입 배열 불가
✅ var stack = []     // 빈 배열로 시작
   push(stack, value) // 동적 추가
```

### 난제 2: 4바이트 정수 디코딩
```freelang
// bytecode: [1, 42, 0, 0, 0, 49, ...]
// bytecode[0] = opcode
// bytecode[1..4] = little-endian 정수

var val = bytecode[1] + 
          bytecode[2] * 256 +
          bytecode[3] * 65536 +
          bytecode[4] * 16777216
```

### 난제 3: 메모리 (배열)
```freelang
var memory = []        // 변수 저장소
push(memory, 0)        // memory[0] 초기화
memory[idx] = value    // STORE
var x = memory[idx]    // LOAD
```

### 난제 4: 상수풀 (문자열)
```freelang
var constants = ["hello", "world"]
// PUSH_STR 0 → stack.push(constants[0])
```

---

## 성능 목표

| 지표 | 목표 |
|------|------|
| 실행 속도 | O(bytecode 길이) |
| 메모리 | ~1KB/실행 |
| 지원 opcode | 13개 |
| 변수 개수 | 무제한 |

---

## 검증 계획

### Test 1: 기본 (Stage 6a)
```bash
node dist/main.js vm-basic.fl
# INPUT: [1, 42, 0, 0, 0, 67]
# OUTPUT: Stack = [42] ✅
```

### Test 2: 연산 (Stage 6b)
```bash
node dist/main.js vm-arithmetic.fl
# INPUT: [1, 3, 0, 0, 0, 1, 4, 0, 0, 0, 18, 67]
# OUTPUT: 12 ✅
```

### Test 3: 변수 (Stage 6c)
```bash
node dist/main.js vm-memory.fl
# INPUT: PUSH 10, STORE 0, LOAD 0, HALT
# OUTPUT: [10] ✅
```

### Test 4: 제어흐름 (Stage 6d)
```bash
node dist/main.js vm-control.fl
# INPUT: if (x > 0)
# OUTPUT: JMP_FALSE 작동 ✅
```

### Test 5: 빌트인 (Stage 6e)
```bash
node dist/main.js vm-builtin.fl
# INPUT: CALL_BUILTIN println
# OUTPUT: hello ✅
```

### Test 6: 완전 셀프호스팅 (Stage 6f)
```bash
node dist/main.js vm.fl
# INPUT: compiler.fl이 생성한 bytecode
# OUTPUT: 원본과 동일 ✅
```

---

## 진행 상태

- [ ] Stage 6a: 기본 VM (PUSH, HALT)
- [ ] Stage 6b: 연산 (ADD, SUB, MUL, DIV)
- [ ] Stage 6c: 변수 (LOAD, STORE)
- [ ] Stage 6d: 제어흐름 (JMP_FALSE)
- [ ] Stage 6e: 빌트인 (CALL_BUILTIN)
- [ ] Stage 6f: 통합 + 최종 검증

**목표**: 2026-04-02 완료
**상태**: 준비 중

---

## Phase 6 완료 기준

✅ 6개 Stage 모두 실행 검증
✅ 13개 Opcode 정상 작동
✅ compiler.fl → bytecode → vm.fl → 결과 일치
✅ TypeScript VM 대체 확인
✅ 완전 셀프호스팅 달성

