// FreeLang v4 — Bytecode Compiler (SPEC_02 구현)
// AST → Bytecode

import { Program, Stmt, Expr, Pattern, MatchArm, Param, TypeAnnotation, ImportDecl, ExportDecl } from "./ast";
import { IrValue, IrInst, IrFunction, IrProgram } from "./ir";

// ============================================================
// Opcodes
// ============================================================

export enum Op {
  // 상수 로드
  PUSH_I32 = 0x01,
  PUSH_F64 = 0x02,
  PUSH_STR = 0x03,
  PUSH_TRUE = 0x04,
  PUSH_FALSE = 0x05,
  PUSH_VOID = 0x06,
  PUSH_NONE = 0x07,
  POP = 0x08,

  // 산술 (i32)
  ADD_I32 = 0x10,
  SUB_I32 = 0x11,
  MUL_I32 = 0x12,
  DIV_I32 = 0x13,
  MOD_I32 = 0x14,
  NEG_I32 = 0x15,

  // 산술 (f64)
  ADD_F64 = 0x18,
  SUB_F64 = 0x19,
  MUL_F64 = 0x1A,
  DIV_F64 = 0x1B,
  MOD_F64 = 0x1C,
  NEG_F64 = 0x1D,

  // 비교
  EQ = 0x20,
  NEQ = 0x21,
  LT = 0x22,
  GT = 0x23,
  LTEQ = 0x24,
  GTEQ = 0x25,

  // 논리
  AND = 0x28,
  OR = 0x29,
  NOT = 0x2A,

  // 문자열
  STR_CONCAT = 0x2E,

  // 변수
  LOAD_LOCAL = 0x30,
  STORE_LOCAL = 0x31,
  LOAD_GLOBAL = 0x32,
  STORE_GLOBAL = 0x33,

  // 제어
  JUMP = 0x40,
  JUMP_IF_FALSE = 0x41,
  RETURN = 0x42,
  HALT = 0x43,

  // 함수
  CALL = 0x50,
  CALL_BUILTIN = 0x51,

  // 배열
  ARRAY_NEW = 0x60,
  ARRAY_GET = 0x61,
  ARRAY_SET = 0x62,

  // 구조체
  STRUCT_NEW = 0x68,
  STRUCT_GET = 0x69,
  STRUCT_SET = 0x6A,

  // Option/Result
  WRAP_OK = 0x70,
  WRAP_ERR = 0x71,
  WRAP_SOME = 0x72,
  UNWRAP = 0x73,
  IS_OK = 0x74,
  IS_ERR = 0x75,
  IS_SOME = 0x76,
  IS_NONE = 0x77,

  // Actor/Channel
  SPAWN = 0x80,
  CHAN_NEW = 0x81,
  CHAN_SEND = 0x82,
  CHAN_RECV = 0x83,

  // 디버그
  DUP = 0xF0,
}

// ============================================================
// Chunk — 바이트코드 청크
// ============================================================

export type FuncInfo = {
  name: string;
  arity: number;
  offset: number; // bytecode 시작 위치
};

export class Chunk {
  code: number[] = [];
  constants: any[] = [];
  functions: FuncInfo[] = [];
  lines: number[] = []; // 각 바이트코드의 소스 줄

  emit(op: Op, line: number): void {
    this.code.push(op);
    this.lines.push(line);
  }

  emitByte(b: number, line: number): void {
    this.code.push(b & 0xFF);
    this.lines.push(line);
  }

  emitI32(val: number, line: number): void {
    // 4바이트 little-endian
    this.code.push(val & 0xFF);
    this.code.push((val >> 8) & 0xFF);
    this.code.push((val >> 16) & 0xFF);
    this.code.push((val >> 24) & 0xFF);
    for (let i = 0; i < 4; i++) this.lines.push(line);
  }

  emitF64(val: number, line: number): void {
    const buf = new ArrayBuffer(8);
    new Float64Array(buf)[0] = val;
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < 8; i++) {
      this.code.push(bytes[i]);
      this.lines.push(line);
    }
  }

  addConstant(val: any): number {
    const idx = this.constants.length;
    this.constants.push(val);
    return idx;
  }

  // 패치: 나중에 오프셋 채우기
  currentOffset(): number {
    return this.code.length;
  }

  patchI32(offset: number, val: number): void {
    this.code[offset] = val & 0xFF;
    this.code[offset + 1] = (val >> 8) & 0xFF;
    this.code[offset + 2] = (val >> 16) & 0xFF;
    this.code[offset + 3] = (val >> 24) & 0xFF;
  }
}

// ============================================================
// Compiler — 스코프 내 변수 슬롯 관리
// ============================================================

type LocalVar = {
  name: string;
  slot: number;
  depth: number;
};

// ============================================================
// Compiler
// ============================================================

type LoopLabel = {
  loopStart: number;       // 루프 시작 (조건 계산)
  breakPatches: number[];  // break JUMP placeholder 위치들
  continuePatches: number[]; // continue JUMP placeholder 위치들 (for 루프에서만 필요)
};

export class Compiler {
  private chunk: Chunk = new Chunk();
  private locals: LocalVar[] = [];
  private scopeDepth: number = 0;
  private nextSlot: number = 0;
  private functionBodies: Map<string, Stmt & { kind: "fn_decl" }> = new Map();
  private currentLoopLabels: LoopLabel[] = [];

  compile(program: Program): Chunk {
    // Pass 1: 함수 등록
    for (const stmt of program.stmts) {
      if (stmt.kind === "fn_decl") {
        this.functionBodies.set(stmt.name, stmt);
        this.chunk.functions.push({
          name: stmt.name,
          arity: stmt.params.length,
          offset: -1, // 나중에 패치
        });
      }
    }

    // Pass 2: 최상위 코드 컴파일
    for (const stmt of program.stmts) {
      if (stmt.kind !== "fn_decl") {
        this.compileStmt(stmt);
      }
    }
    this.chunk.emit(Op.HALT, 0);

    // Pass 3: 함수 본문 컴파일
    for (const [name, stmt] of this.functionBodies) {
      this.compileFnBody(name, stmt);
    }

    return this.chunk;
  }

  // ============================================================
  // IR → Bytecode (새 파이프라인)
  // ============================================================

  compileIR(ir: IrProgram): Chunk {
    // Pass 1: 함수 등록
    for (const fn of ir.functions) {
      this.chunk.functions.push({
        name: fn.name,
        arity: fn.params.length,
        offset: -1,
      });
    }

    // Pass 2: main 코드 컴파일
    for (const inst of ir.main) {
      this.compileIrInst(inst);
    }
    this.chunk.emit(Op.HALT, 0);

    // Pass 3: 함수 본문 컴파일
    for (const fn of ir.functions) {
      this.compileIrFunction(fn);
    }

    return this.chunk;
  }

  private irLabelOffsets: Map<string, number> = new Map();
  private irLabelPatches: Map<string, number[]> = new Map();

  private recordLabel(label: string): void {
    this.irLabelOffsets.set(label, this.chunk.currentOffset());
  }

  private patchLabel(label: string): void {
    const targets = this.irLabelPatches.get(label) || [];
    const offset = this.irLabelOffsets.get(label);
    if (offset !== undefined) {
      for (const patchOffset of targets) {
        this.chunk.patchI32(patchOffset, offset);
      }
      this.irLabelPatches.delete(label);
    }
  }

  private emitJumpPlaceholder(label: string): number {
    const offset = this.chunk.currentOffset();
    this.chunk.emitI32(0, 0); // placeholder
    const targets = this.irLabelPatches.get(label) || [];
    targets.push(offset);
    this.irLabelPatches.set(label, targets);
    return offset;
  }

  private pushIrValue(val: IrValue): void {
    switch (val.kind) {
      case "const_i32":
        this.chunk.emit(Op.PUSH_I32, 0);
        this.chunk.emitI32(val.val, 0);
        break;
      case "const_f64":
        this.chunk.emit(Op.PUSH_F64, 0);
        this.chunk.emitF64(val.val, 0);
        break;
      case "const_str":
        this.chunk.emit(Op.PUSH_STR, 0);
        this.chunk.emitI32(this.chunk.addConstant(val.val), 0);
        break;
      case "const_bool":
        if (val.val) {
          this.chunk.emit(Op.PUSH_TRUE, 0);
        } else {
          this.chunk.emit(Op.PUSH_FALSE, 0);
        }
        break;
      case "local":
        // 로컬 변수는 LOAD_LOCAL로 로드
        const slot = this.resolveLocal(val.name);
        if (slot >= 0) {
          this.chunk.emit(Op.LOAD_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        }
        break;
      case "global":
        // 글로벌 변수는 LOAD_GLOBAL로 로드
        this.chunk.emit(Op.LOAD_GLOBAL, 0);
        this.chunk.emitI32(this.chunk.addConstant(val.name), 0);
        break;
      case "temp":
        // temp는 로컬로 취급 (slot 할당 필요)
        const tslot = this.resolveLocal(val.name);
        if (tslot >= 0) {
          this.chunk.emit(Op.LOAD_LOCAL, 0);
          this.chunk.emitI32(tslot, 0);
        }
        break;
    }
  }

  private compileIrInst(inst: IrInst): void {
    switch (inst.kind) {
      case "assign": {
        this.pushIrValue(inst.src);
        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          // 새 로컬 변수 선언
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }

      case "binop": {
        this.pushIrValue(inst.left);
        this.pushIrValue(inst.right);

        // 연산자에 따른 Op 선택 (타입은 런타임에 결정됨)
        switch (inst.op) {
          case "+":
            this.chunk.emit(Op.ADD_I32, 0); // 런타임에 타입 체크
            break;
          case "-":
            this.chunk.emit(Op.SUB_I32, 0);
            break;
          case "*":
            this.chunk.emit(Op.MUL_I32, 0);
            break;
          case "/":
            this.chunk.emit(Op.DIV_I32, 0);
            break;
          case "%":
            this.chunk.emit(Op.MOD_I32, 0);
            break;
          case "==":
            this.chunk.emit(Op.EQ, 0);
            break;
          case "!=":
            this.chunk.emit(Op.NEQ, 0);
            break;
          case "<":
            this.chunk.emit(Op.LT, 0);
            break;
          case ">":
            this.chunk.emit(Op.GT, 0);
            break;
          case "<=":
            this.chunk.emit(Op.LTEQ, 0);
            break;
          case ">=":
            this.chunk.emit(Op.GTEQ, 0);
            break;
          case "&&":
            this.chunk.emit(Op.AND, 0);
            break;
          case "||":
            this.chunk.emit(Op.OR, 0);
            break;
          default:
            break;
        }

        // 결과를 dest에 저장
        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }

      case "unop": {
        this.pushIrValue(inst.src);
        switch (inst.op) {
          case "-":
            this.chunk.emit(Op.NEG_I32, 0);
            break;
          case "!":
            this.chunk.emit(Op.NOT, 0);
            break;
          default:
            break;
        }
        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }

      case "label": {
        this.recordLabel(inst.name);
        break;
      }

      case "jump": {
        this.chunk.emit(Op.JUMP, 0);
        this.emitJumpPlaceholder(inst.target);
        break;
      }

      case "jump_if_false": {
        this.pushIrValue(inst.cond);
        this.chunk.emit(Op.JUMP_IF_FALSE, 0);
        this.emitJumpPlaceholder(inst.target);
        break;
      }

      case "call": {
        // 인수 푸시
        for (const arg of inst.args) {
          this.pushIrValue(arg);
        }
        // 함수 호출
        this.chunk.emit(Op.CALL, 0);
        this.chunk.emitI32(this.chunk.addConstant(inst.fn), 0);
        this.chunk.emitByte(inst.args.length, 0);

        // 결과 저장
        if (inst.dest) {
          const slot = this.resolveLocal(inst.dest);
          if (slot >= 0) {
            this.chunk.emit(Op.STORE_LOCAL, 0);
            this.chunk.emitI32(slot, 0);
          } else {
            const newSlot = this.declareLocal(inst.dest);
            this.chunk.emit(Op.STORE_LOCAL, 0);
            this.chunk.emitI32(newSlot, 0);
          }
        }
        break;
      }

      case "call_builtin": {
        // 인수 푸시
        for (const arg of inst.args) {
          this.pushIrValue(arg);
        }
        // 내장 함수 호출
        this.chunk.emit(Op.CALL_BUILTIN, 0);
        this.chunk.emitI32(this.chunk.addConstant(inst.name), 0);
        this.chunk.emitByte(inst.args.length, 0);

        // 결과 저장
        if (inst.dest) {
          const slot = this.resolveLocal(inst.dest);
          if (slot >= 0) {
            this.chunk.emit(Op.STORE_LOCAL, 0);
            this.chunk.emitI32(slot, 0);
          } else {
            const newSlot = this.declareLocal(inst.dest);
            this.chunk.emit(Op.STORE_LOCAL, 0);
            this.chunk.emitI32(newSlot, 0);
          }
        }
        break;
      }

      case "return": {
        if (inst.value) {
          this.pushIrValue(inst.value);
        } else {
          this.chunk.emit(Op.PUSH_VOID, 0);
        }
        this.chunk.emit(Op.RETURN, 0);
        break;
      }

      case "array_new": {
        for (const elem of inst.elements) {
          this.pushIrValue(elem);
        }
        this.chunk.emit(Op.ARRAY_NEW, 0);
        this.chunk.emitI32(inst.elements.length, 0);

        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }

      case "array_get": {
        this.pushIrValue(inst.arr);
        this.pushIrValue(inst.idx);
        this.chunk.emit(Op.ARRAY_GET, 0);

        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }

      case "array_set": {
        this.pushIrValue(inst.arr);
        this.pushIrValue(inst.idx);
        this.pushIrValue(inst.value);
        this.chunk.emit(Op.ARRAY_SET, 0);
        break;
      }

      case "struct_new": {
        // 각 필드마다: PUSH_STR(fieldName) + value
        for (const field of inst.fields) {
          this.chunk.emit(Op.PUSH_STR, 0);
          this.chunk.emitI32(this.chunk.addConstant(field.name), 0);
          this.pushIrValue(field.value);
        }
        this.chunk.emit(Op.STRUCT_NEW, 0);
        this.chunk.emitI32(inst.fields.length, 0);

        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }

      case "struct_get": {
        this.pushIrValue(inst.obj);
        this.chunk.emit(Op.STRUCT_GET, 0);
        this.chunk.emitI32(this.chunk.addConstant(inst.field), 0);

        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }

      case "struct_set": {
        this.pushIrValue(inst.obj);
        this.pushIrValue(inst.value);
        this.chunk.emit(Op.STRUCT_SET, 0);
        this.chunk.emitI32(this.chunk.addConstant(inst.field), 0);
        break;
      }

      case "wrap_ok": {
        this.pushIrValue(inst.value);
        this.chunk.emit(Op.WRAP_OK, 0);
        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }

      case "wrap_err": {
        this.pushIrValue(inst.value);
        this.chunk.emit(Op.WRAP_ERR, 0);
        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }

      case "unwrap": {
        this.pushIrValue(inst.value);
        this.chunk.emit(Op.UNWRAP, 0);
        const slot = this.resolveLocal(inst.dest);
        if (slot >= 0) {
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(slot, 0);
        } else {
          const newSlot = this.declareLocal(inst.dest);
          this.chunk.emit(Op.STORE_LOCAL, 0);
          this.chunk.emitI32(newSlot, 0);
        }
        break;
      }
    }
  }

  private compileIrFunction(fn: IrFunction): void {
    const fnInfo = this.chunk.functions.find((f) => f.name === fn.name);
    if (fnInfo) fnInfo.offset = this.chunk.currentOffset();

    const prevLocals = this.locals;
    const prevSlot = this.nextSlot;
    const prevDepth = this.scopeDepth;

    this.locals = [];
    this.nextSlot = 0;
    this.scopeDepth = 0;
    this.irLabelOffsets.clear();
    this.irLabelPatches.clear();

    // 매개변수 선언
    for (const param of fn.params) {
      this.declareLocal(param);
    }

    // 함수 본문 컴파일
    for (const inst of fn.insts) {
      this.compileIrInst(inst);
    }

    // 명시적 return이 없으면 void return 추가
    const lastInst = fn.insts[fn.insts.length - 1];
    if (!lastInst || lastInst.kind !== "return") {
      this.chunk.emit(Op.PUSH_VOID, 0);
      this.chunk.emit(Op.RETURN, 0);
    }

    this.locals = prevLocals;
    this.nextSlot = prevSlot;
    this.scopeDepth = prevDepth;
  }

  // ============================================================
  // 문 컴파일
  // ============================================================

  private compileStmt(stmt: Stmt): void {
    switch (stmt.kind) {
      case "var_decl": return this.compileVarDecl(stmt);
      case "fn_decl": return; // Pass 3에서 처리
      case "if_stmt": return this.compileIfStmt(stmt);
      case "match_stmt": return this.compileMatchStmt(stmt);
      case "for_stmt": return this.compileForStmt(stmt);
      case "for_of_stmt": return this.compileForOfStmt(stmt);
      case "while_stmt": return this.compileWhileStmt(stmt);
      case "break_stmt": return this.compileBreakStmt(stmt);
      case "continue_stmt": return this.compileContinueStmt(stmt);
      case "struct_decl": return; // 타입 선언, 런타임 불필요
      case "spawn_stmt": return this.compileSpawnStmt(stmt);
      case "return_stmt": return this.compileReturnStmt(stmt);
      case "expr_stmt": return this.compileExprStmt(stmt);
      case "import_decl": return; // 모듈 로드는 별도 처리
      case "export_decl": return; // export는 컴파일 시점에 무시
    }
  }

  private compileVarDecl(stmt: Stmt & { kind: "var_decl" }): void {
    this.compileExpr(stmt.init);
    const slot = this.declareLocal(stmt.name);
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(slot, stmt.line);
  }

  private compileFnBody(name: string, stmt: Stmt & { kind: "fn_decl" }): void {
    // 함수 오프셋 기록
    const fnInfo = this.chunk.functions.find((f) => f.name === name);
    if (fnInfo) fnInfo.offset = this.chunk.currentOffset();

    // 스코프 + 매개변수
    const prevLocals = this.locals;
    const prevSlot = this.nextSlot;
    const prevDepth = this.scopeDepth;

    this.locals = [];
    this.nextSlot = 0;
    this.scopeDepth = 0;

    for (const p of stmt.params) {
      this.declareLocal(p.name);
    }

    // 본문: 마지막 statement가 expr_stmt/match_stmt이면 값을 반환
    let lastStmtIsExpr = false;
    for (let i = 0; i < stmt.body.length; i++) {
      const s = stmt.body[i];
      const isLast = i === stmt.body.length - 1;

      if (isLast && s.kind === "expr_stmt") {
        // 마지막이 expression statement → expression 값을 스택에 남김
        this.compileExpr(s.expr);
        lastStmtIsExpr = true;
      } else if (isLast && s.kind === "match_stmt") {
        // 마지막이 match statement → match 값을 반환하도록 컴파일
        this.compileMatchStmtAsExpr(s as Stmt & { kind: "match_stmt" });
        lastStmtIsExpr = true;
      } else {
        this.compileStmt(s);
      }
    }

    // void 함수는 암시적 return
    if (!lastStmtIsExpr) {
      this.chunk.emit(Op.PUSH_VOID, stmt.line);
    }
    this.chunk.emit(Op.RETURN, stmt.line);

    this.locals = prevLocals;
    this.nextSlot = prevSlot;
    this.scopeDepth = prevDepth;
  }

  private compileIfStmt(stmt: Stmt & { kind: "if_stmt" }): void {
    this.compileExpr(stmt.condition);

    // JUMP_IF_FALSE → else or end
    this.chunk.emit(Op.JUMP_IF_FALSE, stmt.line);
    const elseJump = this.chunk.currentOffset();
    this.chunk.emitI32(0, stmt.line); // 패치 대상

    // then
    this.beginScope();
    for (const s of stmt.then) this.compileStmt(s);
    this.endScope(stmt.line);

    if (stmt.else_) {
      // JUMP → end (then 끝에서)
      this.chunk.emit(Op.JUMP, stmt.line);
      const endJump = this.chunk.currentOffset();
      this.chunk.emitI32(0, stmt.line);

      // else 시작 (패치)
      this.chunk.patchI32(elseJump, this.chunk.currentOffset());

      this.beginScope();
      for (const s of stmt.else_) this.compileStmt(s);
      this.endScope(stmt.line);

      // end (패치)
      this.chunk.patchI32(endJump, this.chunk.currentOffset());
    } else {
      this.chunk.patchI32(elseJump, this.chunk.currentOffset());
    }
  }

  private compileMatchStmt(stmt: Stmt & { kind: "match_stmt" }): void {
    this.compileExpr(stmt.subject);

    // subject를 로컬 슬롯에 저장 (struct/array 분해 바인딩용)
    const subjectSlot = this.declareLocal("__match_subject__");
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(subjectSlot, stmt.line);

    const endJumps: number[] = [];

    for (const arm of stmt.arms) {
      // subject를 스택에 로드해서 테스트
      this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
      this.chunk.emitI32(subjectSlot, stmt.line);

      // 패턴 매칭 코드
      this.compilePatternTest(arm.pattern, stmt.line);

      // JUMP_IF_FALSE → 다음 arm
      this.chunk.emit(Op.JUMP_IF_FALSE, stmt.line);
      const nextArm = this.chunk.currentOffset();
      this.chunk.emitI32(0, stmt.line);

      // Pattern 매칭 성공 — scope 시작 및 변수 바인딩
      this.beginScope();
      this.compilePatternBind(arm.pattern, stmt.line, subjectSlot);

      // Guard 절이 있으면 추가 조건 검사 (pattern bind 후)
      let guardJump: number | null = null;
      if (arm.guard) {
        this.compileExpr(arm.guard);
        this.chunk.emit(Op.JUMP_IF_FALSE, stmt.line);
        guardJump = this.chunk.currentOffset();
        this.chunk.emitI32(0, stmt.line);
      }

      // body
      this.compileExpr(arm.body);
      this.chunk.emit(Op.POP, stmt.line); // match stmt → 값 버림
      this.endScope(stmt.line);

      // JUMP → end
      this.chunk.emit(Op.JUMP, stmt.line);
      endJumps.push(this.chunk.currentOffset());
      this.chunk.emitI32(0, stmt.line);

      // 다음 arm (패치) - pattern fail과 guard fail 모두 이 위치로
      this.chunk.patchI32(nextArm, this.chunk.currentOffset());
      if (guardJump !== null) {
        this.chunk.patchI32(guardJump, this.chunk.currentOffset());
      }
    }

    // end 패치
    for (const j of endJumps) {
      this.chunk.patchI32(j, this.chunk.currentOffset());
    }
  }

  private compileMatchStmtAsExpr(stmt: Stmt & { kind: "match_stmt" }): void {
    // match_stmt를 expression처럼 컴파일 (값을 반환)
    this.compileExpr(stmt.subject);

    const subjectSlot = this.declareLocal("__match_subject__");
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(subjectSlot, stmt.line);

    const endJumps: number[] = [];

    for (const arm of stmt.arms) {
      this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
      this.chunk.emitI32(subjectSlot, stmt.line);
      this.compilePatternTest(arm.pattern, stmt.line);
      this.chunk.emit(Op.JUMP_IF_FALSE, stmt.line);
      const nextArm = this.chunk.currentOffset();
      this.chunk.emitI32(0, stmt.line);

      // Pattern 매칭 성공 — scope 시작 및 변수 바인딩
      this.beginScope();
      this.compilePatternBind(arm.pattern, stmt.line, subjectSlot);

      // Guard 절이 있으면 추가 조건 검사 (pattern bind 후)
      let guardJump: number | null = null;
      if (arm.guard) {
        this.compileExpr(arm.guard);
        this.chunk.emit(Op.JUMP_IF_FALSE, stmt.line);
        guardJump = this.chunk.currentOffset();
        this.chunk.emitI32(0, stmt.line);
      }

      // body 실행
      this.compileExpr(arm.body);  // 값을 반환 (POP 없음)
      this.endScope(stmt.line);

      this.chunk.emit(Op.JUMP, stmt.line);
      endJumps.push(this.chunk.currentOffset());
      this.chunk.emitI32(0, stmt.line);

      // 다음 arm (패치) - pattern fail과 guard fail 모두 이 위치로
      this.chunk.patchI32(nextArm, this.chunk.currentOffset());
      if (guardJump !== null) {
        this.chunk.patchI32(guardJump, this.chunk.currentOffset());
      }
    }

    this.chunk.emit(Op.PUSH_VOID, stmt.line);
    const afterMatchLabel = this.chunk.currentOffset();
    for (const j of endJumps) {
      this.chunk.patchI32(j, afterMatchLabel);
    }
  }

  private compileForStmt(stmt: Stmt & { kind: "for_stmt" }): void {
    // iterable 계산
    this.compileExpr(stmt.iterable);
    const arrSlot = this.declareLocal("__arr__");
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(arrSlot, stmt.line);

    // 인덱스 = 0
    this.chunk.emit(Op.PUSH_I32, stmt.line);
    this.chunk.emitI32(0, stmt.line);
    const idxSlot = this.declareLocal("__idx__");
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);

    // 루프 변수
    this.chunk.emit(Op.PUSH_VOID, stmt.line);
    const itemSlot = this.declareLocal(stmt.variable);
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(itemSlot, stmt.line);

    const loopStart = this.chunk.currentOffset();

    // 루프 레이블 푸시
    const loopLabel: LoopLabel = { loopStart, breakPatches: [], continuePatches: [] };
    this.currentLoopLabels.push(loopLabel);

    // 조건: idx < length(arr)
    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);
    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(arrSlot, stmt.line);
    this.chunk.emit(Op.CALL_BUILTIN, stmt.line);
    this.chunk.emitI32(this.chunk.addConstant("length"), stmt.line);
    this.chunk.emitByte(1, stmt.line); // 1 arg
    this.chunk.emit(Op.LT, stmt.line);
    this.chunk.emit(Op.JUMP_IF_FALSE, stmt.line);
    const exitJump = this.chunk.currentOffset();
    this.chunk.emitI32(0, stmt.line);

    // item = arr[idx]
    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(arrSlot, stmt.line);
    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);
    this.chunk.emit(Op.ARRAY_GET, stmt.line);
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(itemSlot, stmt.line);

    // body
    this.beginScope();
    for (const s of stmt.body) this.compileStmt(s);
    this.endScope(stmt.line);

    // idx = idx + 1 (continueTarget 설정)
    const continueTarget = this.chunk.currentOffset();
    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);
    this.chunk.emit(Op.PUSH_I32, stmt.line);
    this.chunk.emitI32(1, stmt.line);
    this.chunk.emit(Op.ADD_I32, stmt.line);
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);

    // JUMP → loopStart
    this.chunk.emit(Op.JUMP, stmt.line);
    this.chunk.emitI32(loopStart, stmt.line);

    // exit 주소 결정 및 패치
    const exitTarget = this.chunk.currentOffset();
    this.chunk.patchI32(exitJump, exitTarget);

    // break 문 모두 패치
    for (const breakPatch of loopLabel.breakPatches) {
      this.chunk.patchI32(breakPatch, exitTarget);
    }

    // continue 문 모두 패치 (for는 idx 증가로)
    for (const continuePatch of loopLabel.continuePatches) {
      this.chunk.patchI32(continuePatch, continueTarget);
    }

    // 루프 레이블 팝
    this.currentLoopLabels.pop();
  }

  private compileForOfStmt(stmt: Stmt & { kind: "for_of_stmt" }): void {
    // for_of_stmt는 for_stmt와 동일 (변수 선언 방식만 다름)
    this.compileExpr(stmt.iterable);
    const arrSlot = this.declareLocal("__arr__");
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(arrSlot, stmt.line);

    this.chunk.emit(Op.PUSH_I32, stmt.line);
    this.chunk.emitI32(0, stmt.line);
    const idxSlot = this.declareLocal("__idx__");
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);

    this.chunk.emit(Op.PUSH_VOID, stmt.line);
    const itemSlot = this.declareLocal(stmt.variable);
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(itemSlot, stmt.line);

    const loopStart = this.chunk.currentOffset();

    // 루프 레이블 푸시
    const loopLabel: LoopLabel = { loopStart, breakPatches: [], continuePatches: [] };
    this.currentLoopLabels.push(loopLabel);

    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);
    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(arrSlot, stmt.line);
    this.chunk.emit(Op.CALL_BUILTIN, stmt.line);
    this.chunk.emitI32(this.chunk.addConstant("length"), stmt.line);
    this.chunk.emitByte(1, stmt.line);
    this.chunk.emit(Op.LT, stmt.line);
    this.chunk.emit(Op.JUMP_IF_FALSE, stmt.line);
    const exitJump = this.chunk.currentOffset();
    this.chunk.emitI32(0, stmt.line);

    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(arrSlot, stmt.line);
    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);
    this.chunk.emit(Op.ARRAY_GET, stmt.line);
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(itemSlot, stmt.line);

    this.beginScope();
    for (const s of stmt.body) this.compileStmt(s);
    this.endScope(stmt.line);

    // idx = idx + 1 (continueTarget 설정)
    const continueTarget = this.chunk.currentOffset();
    this.chunk.emit(Op.LOAD_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);
    this.chunk.emit(Op.PUSH_I32, stmt.line);
    this.chunk.emitI32(1, stmt.line);
    this.chunk.emit(Op.ADD_I32, stmt.line);
    this.chunk.emit(Op.STORE_LOCAL, stmt.line);
    this.chunk.emitI32(idxSlot, stmt.line);

    this.chunk.emit(Op.JUMP, stmt.line);
    this.chunk.emitI32(loopStart, stmt.line);

    // exit 주소 결정 및 패치
    const exitTarget = this.chunk.currentOffset();
    this.chunk.patchI32(exitJump, exitTarget);

    // break 문 모두 패치
    for (const breakPatch of loopLabel.breakPatches) {
      this.chunk.patchI32(breakPatch, exitTarget);
    }

    // continue 문 모두 패치 (for는 idx 증가로)
    for (const continuePatch of loopLabel.continuePatches) {
      this.chunk.patchI32(continuePatch, continueTarget);
    }

    // 루프 레이블 팝
    this.currentLoopLabels.pop();
  }

  private compileWhileStmt(stmt: Stmt & { kind: "while_stmt" }): void {
    const loopStart = this.chunk.currentOffset();

    // 루프 레이블 푸시
    const loopLabel: LoopLabel = { loopStart, breakPatches: [], continuePatches: [] };
    this.currentLoopLabels.push(loopLabel);

    // 조건 계산
    this.compileExpr(stmt.condition);
    this.chunk.emit(Op.JUMP_IF_FALSE, stmt.line);
    const exitJump = this.chunk.currentOffset();
    this.chunk.emitI32(0, stmt.line); // 패치 예정

    // body
    this.beginScope();
    for (const s of stmt.body) this.compileStmt(s);
    this.endScope(stmt.line);

    // JUMP → loopStart
    this.chunk.emit(Op.JUMP, stmt.line);
    this.chunk.emitI32(loopStart, stmt.line);

    // exit 주소 결정 및 패치
    const exitTarget = this.chunk.currentOffset();
    this.chunk.patchI32(exitJump, exitTarget);

    // break 문 모두 패치
    for (const breakPatch of loopLabel.breakPatches) {
      this.chunk.patchI32(breakPatch, exitTarget);
    }

    // continue 문 모두 패치 (while은 loopStart로)
    for (const continuePatch of loopLabel.continuePatches) {
      this.chunk.patchI32(continuePatch, loopStart);
    }

    // 루프 레이블 팝
    this.currentLoopLabels.pop();
  }

  private compileSpawnStmt(stmt: Stmt & { kind: "spawn_stmt" }): void {
    // SPAWN: 본문의 시작 오프셋을 인자로
    this.chunk.emit(Op.SPAWN, stmt.line);
    const bodyJump = this.chunk.currentOffset();
    this.chunk.emitI32(0, stmt.line); // 패치

    // main은 spawn 다음으로 점프
    this.chunk.emit(Op.JUMP, stmt.line);
    const skipJump = this.chunk.currentOffset();
    this.chunk.emitI32(0, stmt.line);

    // spawn body 시작 (패치)
    this.chunk.patchI32(bodyJump, this.chunk.currentOffset());
    for (const s of stmt.body) this.compileStmt(s);
    this.chunk.emit(Op.HALT, stmt.line);

    // skip end (패치)
    this.chunk.patchI32(skipJump, this.chunk.currentOffset());
  }

  private compileReturnStmt(stmt: Stmt & { kind: "return_stmt" }): void {
    if (stmt.value) {
      this.compileExpr(stmt.value);
    } else {
      this.chunk.emit(Op.PUSH_VOID, stmt.line);
    }
    this.chunk.emit(Op.RETURN, stmt.line);
  }

  private compileBreakStmt(stmt: Stmt & { kind: "break_stmt" }): void {
    if (this.currentLoopLabels.length === 0) {
      throw new Error("break 문이 루프 밖에 있습니다");
    }
    const loopLabel = this.currentLoopLabels[this.currentLoopLabels.length - 1];
    this.chunk.emit(Op.JUMP, stmt.line);
    const breakPatch = this.chunk.currentOffset();
    this.chunk.emitI32(0, stmt.line); // placeholder
    loopLabel.breakPatches.push(breakPatch);
  }

  private compileContinueStmt(stmt: Stmt & { kind: "continue_stmt" }): void {
    if (this.currentLoopLabels.length === 0) {
      throw new Error("continue 문이 루프 밖에 있습니다");
    }
    const loopLabel = this.currentLoopLabels[this.currentLoopLabels.length - 1];
    this.chunk.emit(Op.JUMP, stmt.line);
    const continuePatch = this.chunk.currentOffset();
    this.chunk.emitI32(0, stmt.line); // placeholder
    loopLabel.continuePatches.push(continuePatch);
  }

  private compileExprStmt(stmt: Stmt & { kind: "expr_stmt" }): void {
    this.compileExpr(stmt.expr);
    // 할당은 이미 STORE_LOCAL을 emit하므로 POP 불필요
    if (stmt.expr.kind !== "assign") {
      this.chunk.emit(Op.POP, stmt.line);
    }
  }

  // ============================================================
  // 식 컴파일
  // ============================================================

  private compileExpr(expr: Expr): void {
    switch (expr.kind) {
      case "int_lit":
        this.chunk.emit(Op.PUSH_I32, expr.line);
        this.chunk.emitI32(expr.value, expr.line);
        break;

      case "float_lit":
        this.chunk.emit(Op.PUSH_F64, expr.line);
        this.chunk.emitF64(expr.value, expr.line);
        break;

      case "string_lit": {
        const idx = this.chunk.addConstant(expr.value);
        this.chunk.emit(Op.PUSH_STR, expr.line);
        this.chunk.emitI32(idx, expr.line);
        break;
      }

      case "bool_lit":
        this.chunk.emit(expr.value ? Op.PUSH_TRUE : Op.PUSH_FALSE, expr.line);
        break;

      case "ident":
        this.compileIdent(expr);
        break;

      case "binary":
        this.compileBinary(expr);
        break;

      case "unary":
        this.compileUnary(expr);
        break;

      case "await": {
        // Promise 객체를 스택에 push
        this.compileExpr(expr.expr);

        // Promise._value 필드 추출
        this.chunk.emit(Op.STRUCT_GET, expr.line);
        this.chunk.emitI32(
          this.chunk.addConstant("_value"),
          expr.line
        );

        // 이제 스택에 추출된 값이 있음
        break;
      }

      case "call":
        this.compileCall(expr);
        break;

      case "index":
        this.compileExpr(expr.object);
        this.compileExpr(expr.index);
        this.chunk.emit(Op.ARRAY_GET, expr.line);
        break;

      case "field_access":
        this.compileExpr(expr.object);
        this.chunk.emit(Op.STRUCT_GET, expr.line);
        this.chunk.emitI32(this.chunk.addConstant(expr.field), expr.line);
        break;

      case "assign":
        this.compileAssign(expr);
        break;

      case "try":
        this.compileExpr(expr.operand);
        this.chunk.emit(Op.UNWRAP, expr.line);
        break;

      case "if_expr":
        this.compileIfExpr(expr);
        break;

      case "match_expr":
        this.compileMatchExpr(expr);
        break;

      case "array_lit":
        for (const el of expr.elements) this.compileExpr(el);
        this.chunk.emit(Op.ARRAY_NEW, expr.line);
        this.chunk.emitI32(expr.elements.length, expr.line);
        break;

      case "struct_lit":
        for (const f of expr.fields) {
          this.chunk.emit(Op.PUSH_STR, expr.line);
          this.chunk.emitI32(this.chunk.addConstant(f.name), expr.line);
          this.compileExpr(f.value);
        }
        this.chunk.emit(Op.STRUCT_NEW, expr.line);
        this.chunk.emitI32(expr.fields.length, expr.line);
        break;

      case "block_expr":
        this.beginScope();
        for (const s of expr.stmts) this.compileStmt(s);
        if (expr.expr) this.compileExpr(expr.expr);
        else this.chunk.emit(Op.PUSH_VOID, expr.line);
        this.endScope(expr.line);
        break;

      case "chan_new":
        this.chunk.emit(Op.CHAN_NEW, expr.line);
        break;

      case "chan_send":
        this.compileExpr(expr.chan);
        this.compileExpr(expr.value);
        this.chunk.emit(Op.CHAN_SEND, expr.line);
        break;

      case "chan_recv":
        this.compileExpr(expr.chan);
        this.chunk.emit(Op.CHAN_RECV, expr.line);
        break;
    }
  }

  private compileIdent(expr: Expr & { kind: "ident" }): void {
    const local = this.resolveLocal(expr.name);
    if (local !== -1) {
      this.chunk.emit(Op.LOAD_LOCAL, expr.line);
      this.chunk.emitI32(local, expr.line);
    } else {
      // global 또는 함수 이름 — 함수 참조로 처리
      this.chunk.emit(Op.LOAD_GLOBAL, expr.line);
      this.chunk.emitI32(this.chunk.addConstant(expr.name), expr.line);
    }
  }

  private compileBinary(expr: Expr & { kind: "binary" }): void {
    // 문자열 + 문자열
    if (expr.op === "+") {
      this.compileExpr(expr.left);
      this.compileExpr(expr.right);
      // VM이 런타임에 타입 보고 ADD_I32/ADD_F64/STR_CONCAT 결정
      // 여기서는 일반 ADD로 emit
      this.chunk.emit(Op.ADD_I32, expr.line);
      return;
    }

    this.compileExpr(expr.left);
    this.compileExpr(expr.right);

    switch (expr.op) {
      case "-": this.chunk.emit(Op.SUB_I32, expr.line); break;
      case "*": this.chunk.emit(Op.MUL_I32, expr.line); break;
      case "/": this.chunk.emit(Op.DIV_I32, expr.line); break;
      case "%": this.chunk.emit(Op.MOD_I32, expr.line); break;
      case "==": this.chunk.emit(Op.EQ, expr.line); break;
      case "!=": this.chunk.emit(Op.NEQ, expr.line); break;
      case "<": this.chunk.emit(Op.LT, expr.line); break;
      case ">": this.chunk.emit(Op.GT, expr.line); break;
      case "<=": this.chunk.emit(Op.LTEQ, expr.line); break;
      case ">=": this.chunk.emit(Op.GTEQ, expr.line); break;
      case "&&": this.chunk.emit(Op.AND, expr.line); break;
      case "||": this.chunk.emit(Op.OR, expr.line); break;
    }
  }

  private compileUnary(expr: Expr & { kind: "unary" }): void {
    this.compileExpr(expr.operand);
    if (expr.op === "-") this.chunk.emit(Op.NEG_I32, expr.line);
    if (expr.op === "!") this.chunk.emit(Op.NOT, expr.line);
  }

  private compileCall(expr: Expr & { kind: "call" }): void {
    // 내장 함수
    if (expr.callee.kind === "ident") {
      const name = expr.callee.name;
      const builtins = [
        "println", "print", "read_line", "read_file", "write_file",
        "i32", "i64", "f64", "str",
        "push", "pop", "slice", "clone", "length",
        "char_at", "contains", "split", "trim", "to_upper", "to_lower",
        "abs", "min", "max", "pow", "sqrt",
        "range", "channel", "panic", "typeof", "assert",
        // Phase 7: 20 Core Libraries
        // Cryptography & Encoding (6)
        "md5", "sha256", "sha512", "base64_encode", "base64_decode", "hmac",
        // JSON (4)
        "json_parse", "json_stringify", "json_validate", "json_pretty",
        // Advanced Strings (3)
        "starts_with", "ends_with", "replace",
        // Advanced Arrays (3)
        "reverse", "sort", "unique",
        // Math (2)
        "gcd", "lcm",
        // Utils (2)
        "uuid", "timestamp",
        // Channel (2)
        "send", "recv",
        // Environment (1)
        "env",
        // HTTP Client (4) - Phase 2
        "http_get", "http_post", "http_post_json", "fetch",
        // Database (7) - Phase 3
        "sqlite_open", "sqlite_query", "sqlite_execute", "sqlite_close",
        "sqlite_begin", "sqlite_commit", "sqlite_rollback",
      ];

      if (builtins.includes(name)) {
        for (const arg of expr.args) this.compileExpr(arg);
        this.chunk.emit(Op.CALL_BUILTIN, expr.line);
        this.chunk.emitI32(this.chunk.addConstant(name), expr.line);
        this.chunk.emitByte(expr.args.length, expr.line);
        return;
      }

      // 사용자 함수
      const fnIdx = this.chunk.functions.findIndex((f) => f.name === name);
      if (fnIdx !== -1) {
        for (const arg of expr.args) this.compileExpr(arg);
        this.chunk.emit(Op.CALL, expr.line);
        this.chunk.emitI32(fnIdx, expr.line);
        this.chunk.emitByte(expr.args.length, expr.line);
        return;
      }
    }

    // 메서드 호출: obj.method(args)
    if (expr.callee.kind === "field_access") {
      this.compileExpr(expr.callee.object);
      for (const arg of expr.args) this.compileExpr(arg);
      this.chunk.emit(Op.CALL_BUILTIN, expr.line);
      this.chunk.emitI32(this.chunk.addConstant(expr.callee.field), expr.line);
      this.chunk.emitByte(expr.args.length + 1, expr.line); // +1 for self
      return;
    }

    // fallback: 동적 호출
    this.compileExpr(expr.callee);
    for (const arg of expr.args) this.compileExpr(arg);
    this.chunk.emit(Op.CALL, expr.line);
    this.chunk.emitI32(-1, expr.line);
    this.chunk.emitByte(expr.args.length, expr.line);
  }

  private compileAssign(expr: Expr & { kind: "assign" }): void {
    if (expr.target.kind === "ident") {
      this.compileExpr(expr.value);
      const slot = this.resolveLocal(expr.target.name);
      if (slot !== -1) {
        this.chunk.emit(Op.STORE_LOCAL, expr.line);
        this.chunk.emitI32(slot, expr.line);
      } else {
        this.chunk.emit(Op.STORE_GLOBAL, expr.line);
        this.chunk.emitI32(this.chunk.addConstant(expr.target.name), expr.line);
      }
    } else if (expr.target.kind === "index") {
      // Stack order: array, index, value
      // VM ARRAY_SET pops: val=pop(), idx=pop(), arr=pop()
      this.compileExpr(expr.target.object);
      this.compileExpr(expr.target.index);
      this.compileExpr(expr.value);
      this.chunk.emit(Op.ARRAY_SET, expr.line);
    }
  }

  private compileIfExpr(expr: Expr & { kind: "if_expr" }): void {
    this.compileExpr(expr.condition);
    this.chunk.emit(Op.JUMP_IF_FALSE, expr.line);
    const elseJump = this.chunk.currentOffset();
    this.chunk.emitI32(0, expr.line);

    // then — 마지막 식이 값
    for (const e of expr.then) this.compileExpr(e);

    this.chunk.emit(Op.JUMP, expr.line);
    const endJump = this.chunk.currentOffset();
    this.chunk.emitI32(0, expr.line);

    this.chunk.patchI32(elseJump, this.chunk.currentOffset());

    // else — 마지막 식이 값
    for (const e of expr.else_) this.compileExpr(e);

    this.chunk.patchI32(endJump, this.chunk.currentOffset());
  }

  private compileMatchExpr(expr: Expr & { kind: "match_expr" }): void {
    this.compileExpr(expr.subject);

    // subject를 로컬 슬롯에 저장 (struct/array 분해 바인딩용)
    const subjectSlot = this.declareLocal("__match_subject__");
    this.chunk.emit(Op.STORE_LOCAL, expr.line);
    this.chunk.emitI32(subjectSlot, expr.line);

    const endJumps: number[] = [];

    for (const arm of expr.arms) {
      // subject를 스택에 로드해서 테스트
      this.chunk.emit(Op.LOAD_LOCAL, expr.line);
      this.chunk.emitI32(subjectSlot, expr.line);

      this.compilePatternTest(arm.pattern, expr.line);
      this.chunk.emit(Op.JUMP_IF_FALSE, expr.line);
      const nextArm = this.chunk.currentOffset();
      this.chunk.emitI32(0, expr.line);

      // Pattern 매칭 성공 — scope 시작 및 변수 바인딩
      this.beginScope();
      this.compilePatternBind(arm.pattern, expr.line, subjectSlot);

      // Guard 절이 있으면 추가 조건 검사
      let guardJump: number | null = null;
      if (arm.guard) {
        this.compileExpr(arm.guard);
        this.chunk.emit(Op.JUMP_IF_FALSE, expr.line);
        guardJump = this.chunk.currentOffset();
        this.chunk.emitI32(0, expr.line);
      }

      // arm body의 값이 스택에 남음
      this.compileExpr(arm.body);
      this.endScope(expr.line); // scope 종료

      this.chunk.emit(Op.JUMP, expr.line);
      endJumps.push(this.chunk.currentOffset());
      this.chunk.emitI32(0, expr.line);

      // Guard 실패 시 처리 - guard fail 점프를 다음 arm으로 설정
      this.chunk.patchI32(nextArm, this.chunk.currentOffset());
      if (guardJump !== null) {
        // guard fail 시에도 같은 위치(nextArm)로 점프하도록 설정
        this.chunk.patchI32(guardJump, this.chunk.currentOffset());
      }
    }

    // fallthrough (아무 arm도 매칭 안 됨) - void
    this.chunk.emit(Op.PUSH_VOID, expr.line);

    // arm이 성공했으면 여기(PUSH_VOID 이후)로 점프
    const afterMatchLabel = this.chunk.currentOffset();

    for (const j of endJumps) {
      this.chunk.patchI32(j, afterMatchLabel);
    }
  }

  // ============================================================
  // 패턴 컴파일
  // ============================================================

  private compilePatternTest(pattern: Pattern, line: number): void {
    switch (pattern.kind) {
      case "wildcard":
      case "ident":
        // 항상 매칭
        this.chunk.emit(Op.PUSH_TRUE, line);
        break;
      case "literal":
        this.compileExpr(pattern.value);
        this.chunk.emit(Op.EQ, line);
        break;
      case "none":
        this.chunk.emit(Op.IS_NONE, line);
        break;
      case "some":
        this.chunk.emit(Op.IS_SOME, line);
        break;
      case "ok":
        this.chunk.emit(Op.IS_OK, line);
        break;
      case "err":
        this.chunk.emit(Op.IS_ERR, line);
        break;
      case "struct":
        // 구조체 분해: 이름으로 타입 확인
        this.chunk.emit(Op.POP, line); // 일단 subject 제거
        this.chunk.emit(Op.PUSH_TRUE, line);
        break;
      case "array":
        // 배열 분해: 배열 타입 확인
        this.chunk.emit(Op.POP, line); // 일단 subject 제거
        this.chunk.emit(Op.PUSH_TRUE, line);
        break;
      case "tuple":
        // 튜플은 아직 미지원
        this.chunk.emit(Op.POP, line);
        this.chunk.emit(Op.PUSH_FALSE, line);
        break;
    }
  }

  private compilePatternBind(pattern: Pattern, line: number, subjectSlot?: number): void {
    // 패턴에서 바인딩 변수 생성
    switch (pattern.kind) {
      case "ident": {
        // pattern test 후 스택에 subject가 있음 — 직접 저장
        const slot = this.declareLocal(pattern.name);
        this.chunk.emit(Op.STORE_LOCAL, line);
        this.chunk.emitI32(slot, line);
        break;
      }
      case "struct": {
        // 구조체 필드 분해 바인딩
        // Point { x, y } 패턴에서 각 필드에 대해:
        // LOAD_LOCAL(subjectSlot) → STRUCT_GET(field) → STORE_LOCAL(field_slot)
        for (const field of pattern.fields) {
          // subject 로드
          this.chunk.emit(Op.LOAD_LOCAL, line);
          this.chunk.emitI32(subjectSlot!, line);

          // 필드 접근
          this.chunk.emit(Op.STRUCT_GET, line);
          this.chunk.emitI32(this.chunk.addConstant(field.name), line);

          // 필드 패턴에 바인딩
          if (field.pattern.kind === "ident") {
            // 간단한 ident 바인딩
            const fieldSlot = this.declareLocal(field.pattern.name);
            this.chunk.emit(Op.STORE_LOCAL, line);
            this.chunk.emitI32(fieldSlot, line);
          } else {
            // 복잡한 패턴 (nested struct, array, etc)
            const fieldTempSlot = this.declareLocal(`__field_${field.name}__`);
            this.chunk.emit(Op.STORE_LOCAL, line);
            this.chunk.emitI32(fieldTempSlot, line);
            this.compilePatternBind(field.pattern, line, fieldTempSlot);
          }
        }
        break;
      }
      case "array": {
        // 배열 요소 분해 바인딩
        // [a, b, c] 패턴에서 각 요소에 대해:
        // LOAD_LOCAL(subjectSlot) → PUSH_I32(index) → ARRAY_GET → STORE_LOCAL(elem_slot)
        // [a, .., b] rest 패턴의 경우: 뒤쪽 요소는 배열 길이를 동적으로 계산해서 인덱싱

        const restIndex = pattern.restIndex ?? pattern.elements.length;
        const afterRestCount = pattern.elements.length - restIndex;
        let arrayLenSlot: number | null = null;

        // rest 패턴이 있고 뒤에 요소가 있으면 배열 길이를 미리 저장
        if (pattern.rest && afterRestCount > 0) {
          this.chunk.emit(Op.LOAD_LOCAL, line);
          this.chunk.emitI32(subjectSlot!, line);
          // length() 내장 함수 호출
          this.chunk.emit(Op.CALL_BUILTIN, line);
          this.chunk.emitI32(this.chunk.addConstant("length"), line);
          this.chunk.emitByte(1, line); // argCount = 1
          arrayLenSlot = this.declareLocal("__array_len__");
          this.chunk.emit(Op.STORE_LOCAL, line);
          this.chunk.emitI32(arrayLenSlot, line);
        }

        for (let i = 0; i < pattern.elements.length; i++) {
          const elem = pattern.elements[i];

          // 실제 배열 인덱스 결정
          const isAfterRest = i >= restIndex;

          // subject 로드
          this.chunk.emit(Op.LOAD_LOCAL, line);
          this.chunk.emitI32(subjectSlot!, line);

          // 인덱스 계산 및 로드
          if (isAfterRest && arrayLenSlot !== null) {
            // rest 뒤: len - (afterRestCount - (i - restIndex))
            // [a, .., b, c], restIndex=1, len=5 → i=1: 5-(2-0)=3, i=2: 5-(2-1)=4
            const offsetFromEnd = afterRestCount - (i - restIndex);
            this.chunk.emit(Op.LOAD_LOCAL, line);
            this.chunk.emitI32(arrayLenSlot, line);
            this.chunk.emit(Op.PUSH_I32, line);
            this.chunk.emitI32(offsetFromEnd, line);
            this.chunk.emit(Op.SUB_I32, line);
          } else {
            // rest 앞: 순서대로 0, 1, 2, ...
            this.chunk.emit(Op.PUSH_I32, line);
            this.chunk.emitI32(i, line);
          }

          // 배열 요소 접근
          this.chunk.emit(Op.ARRAY_GET, line);

          // 요소 패턴에 바인딩
          if (elem.kind === "ident") {
            // 간단한 ident 바인딩
            const elemSlot = this.declareLocal(elem.name);
            this.chunk.emit(Op.STORE_LOCAL, line);
            this.chunk.emitI32(elemSlot, line);
          } else if (elem.kind === "wildcard") {
            // wildcard는 버림
            this.chunk.emit(Op.POP, line);
          } else {
            // 복잡한 패턴 (nested struct, array, etc)
            const elemTempSlot = this.declareLocal(`__elem_${i}__`);
            this.chunk.emit(Op.STORE_LOCAL, line);
            this.chunk.emitI32(elemTempSlot, line);
            this.compilePatternBind(elem, line, elemTempSlot);
          }
        }
        break;
      }
      case "some":
      case "ok": {
        // Option/Result의 inner 패턴 처리
        if (pattern.inner && subjectSlot !== undefined) {
          // LOAD_LOCAL(subjectSlot) → UNWRAP → 임시 슬롯에 저장
          this.chunk.emit(Op.LOAD_LOCAL, line);
          this.chunk.emitI32(subjectSlot, line);
          this.chunk.emit(Op.UNWRAP, line);

          if (pattern.inner.kind === "ident") {
            const innerSlot = this.declareLocal(pattern.inner.name);
            this.chunk.emit(Op.STORE_LOCAL, line);
            this.chunk.emitI32(innerSlot, line);
          } else {
            const innerTempSlot = this.declareLocal(`__unwrapped__`);
            this.chunk.emit(Op.STORE_LOCAL, line);
            this.chunk.emitI32(innerTempSlot, line);
            this.compilePatternBind(pattern.inner, line, innerTempSlot);
          }
        }
        break;
      }
      case "err": {
        // Err의 inner 패턴 처리 (same as Ok)
        if (pattern.inner && subjectSlot !== undefined) {
          this.chunk.emit(Op.LOAD_LOCAL, line);
          this.chunk.emitI32(subjectSlot, line);
          this.chunk.emit(Op.UNWRAP, line);

          if (pattern.inner.kind === "ident") {
            const innerSlot = this.declareLocal(pattern.inner.name);
            this.chunk.emit(Op.STORE_LOCAL, line);
            this.chunk.emitI32(innerSlot, line);
          } else {
            const innerTempSlot = this.declareLocal(`__unwrapped__`);
            this.chunk.emit(Op.STORE_LOCAL, line);
            this.chunk.emitI32(innerTempSlot, line);
            this.compilePatternBind(pattern.inner, line, innerTempSlot);
          }
        }
        break;
      }
      case "wildcard":
      case "literal":
      case "none":
      case "tuple":
        // 이들은 바인딩이 필요 없음
        break;
    }
  }

  // ============================================================
  // 스코프 관리
  // ============================================================

  private beginScope(): void {
    this.scopeDepth++;
  }

  private endScope(line: number): void {
    while (this.locals.length > 0 && this.locals[this.locals.length - 1].depth === this.scopeDepth) {
      this.locals.pop();
      this.nextSlot--;
    }
    this.scopeDepth--;
  }

  private declareLocal(name: string): number {
    const slot = this.nextSlot++;
    this.locals.push({ name, slot, depth: this.scopeDepth });
    return slot;
  }

  private resolveLocal(name: string): number {
    for (let i = this.locals.length - 1; i >= 0; i--) {
      if (this.locals[i].name === name) return this.locals[i].slot;
    }
    return -1;
  }
}
