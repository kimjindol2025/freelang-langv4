#include "vm.h"
#include "isa.h"
#include <string.h>

/**
 * Example 1: 산술 연산 (3 + 5 = 8)
 * MOV r0, 0   (r0 = 0)
 * MOV r1, 3   (r1 = 3)
 * MOV r2, 5   (r2 = 5)
 * ADD r0, r1, r2  (r0 = r1 + r2)
 * HALT
 */
void test_arithmetic() {
    printf("\n=== Test 1: Arithmetic (3 + 5) ===\n");

    uint8_t bytecode[] = {
        OP_MOV, 0, 0,              /* MOV r0, r0 (dummy) */
        OP_MOV, 1, 0,              /* MOV r1, 0 */
        OP_MOV, 2, 0,              /* MOV r2, 0 */
        OP_MOV, 0, 1,              /* MOV r0, r1 (r0 = 3) */
        /* Need to load immediate values - use LOAD for simplicity */
        OP_HALT
    };

    /* Simpler: directly set register values */
    VM vm;
    vm_init(&vm);
    vm.registers[1] = 3;   /* r1 = 3 */
    vm.registers[2] = 5;   /* r2 = 5 */

    uint8_t code[] = {
        OP_ADD, 0, 1, 2,   /* ADD r0, r1, r2 */
        OP_HALT
    };

    vm_run(&vm, code, sizeof(code));
    printf("Result: r0 = %d (expected 8)\n", vm.registers[0]);
    if (vm.registers[0] == 8) printf("✓ PASS\n");
    else printf("✗ FAIL\n");
}

/**
 * Example 2: 조건 분기 (if r1 == r2 then jump)
 * CMP r1, r2          (compare r1 and r2)
 * JMP_IF E, addr_true (if equal, jump to addr_true)
 * HALT
 * addr_true: MOV r0, 1 (r0 = 1)
 * HALT
 */
void test_conditional_jump() {
    printf("\n=== Test 2: Conditional Jump (5 == 5) ===\n");

    VM vm;
    vm_init(&vm);
    vm.registers[1] = 5;
    vm.registers[2] = 5;

    /*
     * Bytecode:
     * 0: CMP r1, r2  [0,1,2]
     * 3: JMP_IF E(equal), addr 8  [3,4,5,6]
     * 7: HALT (not taken)  [7]
     * 8: MOV r0, r1 (taken path)  [8,9,10]
     * 11: HALT  [11]
     */
    uint8_t code[] = {
        OP_CMP, 1, 2,              /* CMP r1, r2 */
        OP_JMP_IF, 2, 0, 8,        /* JMP_IF E(equal), addr 8 */
        OP_HALT,                   /* Not taken */
        OP_MOV, 0, 1,              /* r0 = r1 (taken path) */
        OP_HALT
    };

    vm_run(&vm, code, sizeof(code));
    printf("Result: r0 = %d (expected 5, jump was taken)\n", vm.registers[0]);
    if (vm.registers[0] == 5) printf("✓ PASS\n");
    else printf("✗ FAIL\n");
}

/**
 * Example 3: 함수 호출 (CALL + RET)
 * CALL func_addr      (call function at addr 6)
 * HALT
 * func_addr: MOV r0, 42 (function body)
 * RET
 */
void test_function_call() {
    printf("\n=== Test 3: Function Call ===\n");

    VM vm;
    vm_init(&vm);

    /*
     * Bytecode:
     * 0: CALL 4
     * 3: HALT
     * 4: MOV r0, 1 (function)
     * 7: RET
     */
    uint8_t code[] = {
        OP_CALL, 0, 4,             /* CALL addr 4 */
        OP_HALT,
        OP_MOV, 0, 1,              /* Function: r0 = r1 (r1=42) */
        OP_RET
    };

    vm.registers[1] = 42;          /* Pass value in r1 */
    vm_run(&vm, code, sizeof(code));
    printf("Result: r0 = %d (expected 42)\n", vm.registers[0]);
    if (vm.registers[0] == 42) printf("✓ PASS\n");
    else printf("✗ FAIL\n");
}

/**
 * Example 4: 루프 (FOR_INIT + FOR_NEXT)
 * FOR_INIT r0, 3      (loop 3 times)
 * ADD r1, r1, r2      (r1 += r2, r2=1)
 * FOR_NEXT r0, loop_start
 * HALT
 */
void test_loop() {
    printf("\n=== Test 4: Loop (sum 1+1+1) ===\n");

    VM vm;
    vm_init(&vm);
    vm.registers[1] = 0;           /* r1 = 0 (accumulator) */
    vm.registers[2] = 1;           /* r2 = 1 (increment) */

    /*
     * Bytecode (address calculation):
     * 0-4: FOR_INIT r0, 3  [OP, reg, c1, c2, c3, c4]
     * 5-8: ADD r1, r1, r2  [OP, dest, src1, src2]
     * 9-12: FOR_NEXT r0, 0 [OP, reg, addr_hi, addr_lo]
     * 13: HALT
     *
     * Total: 14 bytes
     */
    uint8_t code[] = {
        OP_FOR_INIT, 0, 0, 0, 3,   /* FOR_INIT r0, 3 (5 bytes) */
        OP_ADD, 1, 1, 2,           /* r1 = r1 + r2 (4 bytes) */
        OP_FOR_NEXT, 0, 0, 0,      /* FOR_NEXT r0, addr 0 (4 bytes) */
        OP_HALT                    /* (1 byte) */
    };

    vm_run(&vm, code, sizeof(code));
    printf("Result: r1 = %d (expected 3, sum of 1+1+1)\n", vm.registers[1]);
    if (vm.registers[1] == 3) printf("✓ PASS\n");
    else printf("✗ FAIL\n");
}

/**
 * Example 5: 예외 처리 (TRY + RAISE + CATCH)
 * TRY_BEGIN handler_addr
 * MOV r1, 1
 * DIV r0, r1, r0      (divide by 0 → exception)
 * MOV r0, 999
 * TRY_END
 * HALT
 * handler_addr: CATCH r0 (r0 = error code)
 * HALT
 */
void test_exception_handling() {
    printf("\n=== Test 5: Exception Handling (divide by zero) ===\n");

    VM vm;
    vm_init(&vm);
    vm.registers[0] = 0;           /* r0 = 0 (divisor - will cause exception) */
    vm.registers[1] = 10;          /* r1 = 10 (dividend) */

    /*
     * Bytecode:
     * 0: TRY_BEGIN 8
     * 3: DIV r0, r1, r0 (10 / 0 → exception)
     * 7: MOV r0, 999 (not executed)
     * 10: HALT
     * 8: CATCH r0 (catch error, code in r0)
     * 10: HALT
     */
    uint8_t code[] = {
        OP_TRY_BEGIN, 0, 8,        /* TRY_BEGIN handler at 8 */
        OP_DIV, 0, 1, 0,           /* DIV r0, r1, r0 → will raise */
        OP_MOV, 0, 1,              /* Not executed */
        OP_HALT,
        OP_CATCH, 0,               /* CATCH error_code into r0 */
        OP_HALT
    };

    /* Note: Exception handler is set up, but this is simplified for demo */
    printf("Note: Full exception handling requires signal setup (see vm_raise)\n");
    printf("Expected: DivideByZero exception caught\n");
}

/**
 * Example 6: 스택 연산 (PUSH + POP)
 * MOV r0, 100
 * PUSH r0
 * MOV r1, 200
 * POP r2
 * HALT
 */
void test_stack_operations() {
    printf("\n=== Test 6: Stack Operations (PUSH/POP) ===\n");

    VM vm;
    vm_init(&vm);
    vm.registers[0] = 100;
    vm.registers[1] = 200;

    uint8_t code[] = {
        OP_PUSH, 0,                /* PUSH r0 */
        OP_POP, 2,                 /* POP r2 */
        OP_HALT
    };

    vm_run(&vm, code, sizeof(code));
    printf("Result: r2 = %d (expected 100, popped from stack)\n", vm.registers[2]);
    printf("Stack pointer: sp = %d (expected -1)\n", vm.sp);
    if (vm.registers[2] == 100 && vm.sp == -1) printf("✓ PASS\n");
    else printf("✗ FAIL\n");
}

/**
 * Example 7: 메모리 접근 (LOAD + STORE)
 * MOV r0, 42
 * STORE [addr 0], r0  (store 42 at address 0)
 * LOAD r1, [addr 0]   (load from address 0)
 * HALT
 */
void test_memory_access() {
    printf("\n=== Test 7: Memory Access (LOAD/STORE) ===\n");

    VM vm;
    vm_init(&vm);
    vm.registers[0] = 42;

    /*
     * Bytecode:
     * 0: STORE addr(0,0), r0  (store r0 at addr 0)
     * 4: LOAD r1, addr(0,0)   (load from addr 0 to r1)
     * 7: HALT
     */
    uint8_t code[] = {
        OP_STORE, 0, 0, 0,         /* STORE [addr 0], r0 */
        OP_LOAD, 1, 0, 0,          /* LOAD r1, [addr 0] */
        OP_HALT
    };

    vm_run(&vm, code, sizeof(code));
    printf("Result: r1 = %d (expected 42, loaded from memory)\n", vm.registers[1]);
    printf("Memory[0]: %d (expected 42)\n", *(int32_t*)(vm.memory + 0));
    if (vm.registers[1] == 42) printf("✓ PASS\n");
    else printf("✗ FAIL\n");
}

/**
 * Example 8: 비교 및 플래그 (CMP)
 * MOV r1, 10
 * MOV r2, 5
 * CMP r1, r2   (10 > 5)
 * JMP_IF L(less), skip
 * MOV r0, 1    (r0 = 1, not less)
 * skip: HALT
 */
void test_comparison_flags() {
    printf("\n=== Test 8: Comparison and Flags (10 > 5) ===\n");

    VM vm;
    vm_init(&vm);
    vm.registers[1] = 10;
    vm.registers[2] = 5;

    uint8_t code[] = {
        OP_CMP, 1, 2,              /* CMP r1, r2 */
        OP_JMP_IF, 4, 0, 8,        /* JMP_IF L(less), skip (addr 8) */
        OP_MOV, 0, 1,              /* r0 = r1 (r1=10) */
        OP_HALT                    /* skip: */
    };

    vm_run(&vm, code, sizeof(code));
    printf("Result: r0 = %d (expected 10, not less than 5)\n", vm.registers[0]);
    printf("Flags: Z=%d E=%d L=%d (expected 0,0,0 for 10 > 5)\n",
           vm.flags.Z, vm.flags.E, vm.flags.L);
    if (vm.registers[0] == 10 && vm.flags.L == 0) printf("✓ PASS\n");
    else printf("✗ FAIL\n");
}

int main() {
    printf("\n╔════════════════════════════════════════════╗\n");
    printf("║   FreeLang v4 ISA v1.0 VM 테스트 프로그램   ║\n");
    printf("╚════════════════════════════════════════════╝\n");

    test_arithmetic();
    test_conditional_jump();
    test_function_call();
    test_loop();
    test_exception_handling();
    test_stack_operations();
    test_memory_access();
    test_comparison_flags();

    printf("\n╔════════════════════════════════════════════╗\n");
    printf("║   테스트 완료                               ║\n");
    printf("╚════════════════════════════════════════════╝\n");

    return 0;
}
