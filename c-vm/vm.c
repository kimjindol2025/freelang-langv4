#include "vm.h"
#include "isa.h"
#include <stdlib.h>
#include <stdio.h>

/* VM 초기화 */
void vm_init(VM* vm) {
    memset(vm->registers, 0, sizeof(vm->registers));
    memset(vm->memory, 0, sizeof(vm->memory));
    memset(vm->stack, 0, sizeof(vm->stack));
    vm->sp = -1;
    vm->ip = 0;
    vm->try_depth = 0;
    memset(&vm->flags, 0, sizeof(vm->flags));
    memset(&vm->last_error, 0, sizeof(vm->last_error));
}

/* 스택에 값 푸시 */
void vm_push(VM* vm, int32_t value) {
    if (vm->sp >= STACK_SIZE - 1) {
        vm_raise(vm, "StackOverflow", "Stack overflow", 1);
        return;
    }
    vm->stack[++vm->sp] = value;
}

/* 스택에서 값 팝 */
int32_t vm_pop(VM* vm) {
    if (vm->sp < 0) {
        vm_raise(vm, "StackUnderflow", "Stack underflow", 2);
        return 0;
    }
    return vm->stack[vm->sp--];
}

/* 예외 발생 */
void vm_raise(VM* vm, const char* type, const char* msg, int code) {
    strncpy(vm->last_error.type, type, 63);
    strncpy(vm->last_error.message, msg, 255);
    vm->last_error.code = code;
    printf("[EXCEPTION] %s: %s (code: %d)\n", type, msg, code);
    longjmp(vm->jump_buffer, 1);
}

/* 플래그 업데이트 */
void vm_update_flags(VM* vm, int32_t value) {
    vm->flags.Z = (value == 0);
    vm->flags.S = (value < 0);
    vm->flags.C = 0;  /* 간단하게 설정 */
}

/* 비교 연산 및 플래그 설정 */
void vm_cmp(VM* vm, int32_t a, int32_t b) {
    int32_t diff = a - b;
    vm->flags.E = (a == b);
    vm->flags.L = (a < b);
    vm->flags.Z = (diff == 0);
    vm->flags.S = (diff < 0);
}

/* VM 상태 출력 (디버깅용) */
void vm_print_state(VM* vm) {
    printf("\n=== VM State ===\n");
    printf("IP: %d, SP: %d\n", vm->ip, vm->sp);
    printf("Registers: ");
    for (int i = 0; i < 8; i++) {
        printf("r%d=%d ", i, vm->registers[i]);
    }
    printf("\nFlags: Z=%d C=%d S=%d E=%d L=%d\n",
           vm->flags.Z, vm->flags.C, vm->flags.S, vm->flags.E, vm->flags.L);
    printf("================\n\n");
}

/* VM 실행 */
void vm_run(VM* vm, uint8_t* bytecode, int length) {
    int call_stack[256];  /* 함수 호출 스택 */
    int call_depth = 0;

    /* Try-catch 구조 설정 */
    if (setjmp(vm->jump_buffer) != 0) {
        printf("Exception caught: %s\n", vm->last_error.message);
        return;
    }

    vm->ip = 0;
    while (vm->ip < length) {
        uint8_t byte = bytecode[vm->ip++];
        OpCode op = (OpCode)byte;

        switch (op) {
            case OP_NOP:
                /* No operation */
                break;

            case OP_HALT:
                printf("Program halted\n");
                return;

            case OP_MOV: {
                /* MOV dest, src */
                uint8_t dest = bytecode[vm->ip++];
                uint8_t src = bytecode[vm->ip++];
                vm->registers[dest] = vm->registers[src];
                break;
            }

            case OP_ADD: {
                /* ADD dest, src1, src2 */
                uint8_t dest = bytecode[vm->ip++];
                uint8_t src1 = bytecode[vm->ip++];
                uint8_t src2 = bytecode[vm->ip++];
                int32_t result = vm->registers[src1] + vm->registers[src2];
                vm->registers[dest] = result;
                vm_update_flags(vm, result);
                break;
            }

            case OP_SUB: {
                /* SUB dest, src1, src2 */
                uint8_t dest = bytecode[vm->ip++];
                uint8_t src1 = bytecode[vm->ip++];
                uint8_t src2 = bytecode[vm->ip++];
                int32_t result = vm->registers[src1] - vm->registers[src2];
                vm->registers[dest] = result;
                vm_update_flags(vm, result);
                break;
            }

            case OP_MUL: {
                /* MUL dest, src1, src2 */
                uint8_t dest = bytecode[vm->ip++];
                uint8_t src1 = bytecode[vm->ip++];
                uint8_t src2 = bytecode[vm->ip++];
                int32_t result = vm->registers[src1] * vm->registers[src2];
                vm->registers[dest] = result;
                vm_update_flags(vm, result);
                break;
            }

            case OP_DIV: {
                /* DIV dest, src1, src2 */
                uint8_t dest = bytecode[vm->ip++];
                uint8_t src1 = bytecode[vm->ip++];
                uint8_t src2 = bytecode[vm->ip++];
                if (vm->registers[src2] == 0) {
                    vm_raise(vm, "DivideByZero", "Division by zero", 3);
                }
                int32_t result = vm->registers[src1] / vm->registers[src2];
                vm->registers[dest] = result;
                vm_update_flags(vm, result);
                break;
            }

            case OP_LOAD: {
                /* LOAD reg, [addr] */
                uint8_t reg = bytecode[vm->ip++];
                uint16_t addr = (bytecode[vm->ip] << 8) | bytecode[vm->ip + 1];
                vm->ip += 2;
                if (addr >= MEM_SIZE) {
                    vm_raise(vm, "OutOfBounds", "Memory access out of bounds", 4);
                }
                vm->registers[reg] = *(int32_t*)(vm->memory + addr);
                break;
            }

            case OP_STORE: {
                /* STORE [addr], reg */
                uint16_t addr = (bytecode[vm->ip] << 8) | bytecode[vm->ip + 1];
                vm->ip += 2;
                uint8_t reg = bytecode[vm->ip++];
                if (addr >= MEM_SIZE) {
                    vm_raise(vm, "OutOfBounds", "Memory access out of bounds", 4);
                }
                *(int32_t*)(vm->memory + addr) = vm->registers[reg];
                break;
            }

            case OP_CMP: {
                /* CMP reg1, reg2 */
                uint8_t reg1 = bytecode[vm->ip++];
                uint8_t reg2 = bytecode[vm->ip++];
                vm_cmp(vm, vm->registers[reg1], vm->registers[reg2]);
                break;
            }

            case OP_JMP: {
                /* JMP addr */
                uint16_t addr = (bytecode[vm->ip] << 8) | bytecode[vm->ip + 1];
                vm->ip = addr;
                break;
            }

            case OP_JMP_IF: {
                /* JMP_IF cond, addr */
                uint8_t cond = bytecode[vm->ip++];
                uint16_t addr = (bytecode[vm->ip] << 8) | bytecode[vm->ip + 1];
                vm->ip += 2;
                int should_jump = 0;
                switch (cond) {
                    case 0: should_jump = vm->flags.Z; break;     /* Z */
                    case 1: should_jump = !vm->flags.Z; break;    /* NZ */
                    case 2: should_jump = vm->flags.E; break;     /* E */
                    case 3: should_jump = !vm->flags.E; break;    /* NE */
                    case 4: should_jump = vm->flags.L; break;     /* L */
                    default: break;
                }
                if (should_jump) {
                    vm->ip = addr;
                }
                break;
            }

            case OP_PUSH: {
                /* PUSH reg */
                uint8_t reg = bytecode[vm->ip++];
                vm_push(vm, vm->registers[reg]);
                break;
            }

            case OP_POP: {
                /* POP reg */
                uint8_t reg = bytecode[vm->ip++];
                vm->registers[reg] = vm_pop(vm);
                break;
            }

            case OP_CALL: {
                /* CALL addr */
                uint16_t addr = (bytecode[vm->ip] << 8) | bytecode[vm->ip + 1];
                vm->ip += 2;
                if (call_depth >= 256) {
                    vm_raise(vm, "StackOverflow", "Call stack overflow", 5);
                }
                call_stack[call_depth++] = vm->ip;
                vm->ip = addr;
                break;
            }

            case OP_RET: {
                /* RET */
                if (call_depth == 0) {
                    vm_raise(vm, "RuntimeError", "Return without call", 6);
                }
                vm->ip = call_stack[--call_depth];
                break;
            }

            case OP_TRY_BEGIN: {
                /* TRY_BEGIN handler_addr */
                uint16_t handler = (bytecode[vm->ip] << 8) | bytecode[vm->ip + 1];
                vm->ip += 2;
                vm->try_depth++;
                printf("Try block started (depth=%d, handler=%d)\n", vm->try_depth, handler);
                break;
            }

            case OP_TRY_END: {
                /* TRY_END */
                if (vm->try_depth > 0) {
                    vm->try_depth--;
                }
                printf("Try block ended (depth=%d)\n", vm->try_depth);
                break;
            }

            case OP_RAISE: {
                /* RAISE */
                vm_raise(vm, "UserError", "User-defined exception", 7);
                break;
            }

            case OP_CATCH: {
                /* CATCH error_reg */
                uint8_t reg = bytecode[vm->ip++];
                /* 에러 코드를 레지스터에 저장 */
                vm->registers[reg] = vm->last_error.code;
                printf("Caught error in register r%d (code=%d)\n", reg, vm->last_error.code);
                break;
            }

            case OP_FOR_INIT: {
                /* FOR_INIT reg, count */
                uint8_t reg = bytecode[vm->ip++];
                int32_t count = (bytecode[vm->ip] << 24) | (bytecode[vm->ip + 1] << 16) |
                                (bytecode[vm->ip + 2] << 8) | bytecode[vm->ip + 3];
                vm->ip += 4;
                vm->registers[reg] = count;
                break;
            }

            case OP_FOR_NEXT: {
                /* FOR_NEXT reg, start_addr */
                uint8_t reg = bytecode[vm->ip++];
                uint16_t addr = (bytecode[vm->ip] << 8) | bytecode[vm->ip + 1];
                vm->ip += 2;
                vm->registers[reg]--;
                if (vm->registers[reg] >= 0) {
                    vm->ip = addr;
                }
                break;
            }

            default:
                printf("Unknown opcode: %d at IP %d\n", op, vm->ip - 1);
                return;
        }

        /* 디버깅: 상태 출력 (선택적) */
        /* vm_print_state(vm); */
    }

    printf("Program finished normally\n");
}
