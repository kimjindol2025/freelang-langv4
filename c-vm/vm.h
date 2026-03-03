#ifndef VM_H
#define VM_H

#include <stdint.h>
#include <setjmp.h>
#include <stdio.h>
#include <string.h>

#define STACK_SIZE 1024
#define MEM_SIZE 4096
#define MAX_REGISTERS 16
#define MAX_ERROR_MSG 256

/* 플래그 레지스터 */
typedef struct {
    uint8_t Z;  /* Zero flag */
    uint8_t C;  /* Carry flag */
    uint8_t S;  /* Sign flag */
    uint8_t E;  /* Equal flag */
    uint8_t L;  /* Less flag */
} Flags;

/* 에러 객체 */
typedef struct {
    char type[64];
    char message[256];
    int32_t code;
} ErrorObject;

/* VM 구조체 */
typedef struct {
    int32_t registers[MAX_REGISTERS];
    uint8_t memory[MEM_SIZE];
    int32_t stack[STACK_SIZE];
    int sp;
    int ip;
    Flags flags;
    ErrorObject last_error;
    jmp_buf jump_buffer;
    int try_depth;
} VM;

/* VM 초기화 */
void vm_init(VM* vm);

/* VM 실행 */
void vm_run(VM* vm, uint8_t* bytecode, int length);

/* 내부 함수 */
void vm_push(VM* vm, int32_t value);
int32_t vm_pop(VM* vm);
void vm_raise(VM* vm, const char* type, const char* msg, int code);
void vm_print_state(VM* vm);

#endif
