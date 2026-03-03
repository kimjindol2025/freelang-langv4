#ifndef ISA_H
#define ISA_H

#include <stdint.h>

/* ISA v1.0 - 명령어 코드 */
typedef enum {
    /* 기본 */
    OP_NOP = 0,           /* No operation */
    OP_HALT = 1,          /* Program end */

    /* 데이터 이동 */
    OP_MOV = 10,          /* MOV dest, src */
    OP_LOAD = 11,         /* LOAD reg, [addr] */
    OP_STORE = 12,        /* STORE [addr], reg */

    /* 산술 연산 */
    OP_ADD = 20,          /* ADD dest, src1, src2 */
    OP_SUB = 21,          /* SUB dest, src1, src2 */
    OP_MUL = 22,          /* MUL dest, src1, src2 */
    OP_DIV = 23,          /* DIV dest, src1, src2 */

    /* 비교 */
    OP_CMP = 30,          /* CMP reg1, reg2 (플래그 설정) */

    /* 제어 흐름 */
    OP_JMP = 40,          /* JMP addr */
    OP_JMP_IF = 41,       /* JMP_IF cond, addr */
    OP_CALL = 42,         /* CALL addr */
    OP_RET = 43,          /* RET */

    /* 스택 */
    OP_PUSH = 50,         /* PUSH reg */
    OP_POP = 51,          /* POP reg */

    /* 예외 처리 */
    OP_TRY_BEGIN = 60,    /* TRY_BEGIN handler_addr */
    OP_TRY_END = 61,      /* TRY_END */
    OP_RAISE = 62,        /* RAISE (예외 발생) */
    OP_CATCH = 63,        /* CATCH error_reg */

    /* 루프 */
    OP_FOR_INIT = 70,     /* FOR_INIT reg, count */
    OP_FOR_NEXT = 71      /* FOR_NEXT reg, addr */
} OpCode;

/* 명령어 구조 */
typedef struct {
    uint8_t opcode;
    uint8_t reg1;
    uint8_t reg2;
    uint8_t reg3;
    int32_t operand;
} Instruction;

#endif
