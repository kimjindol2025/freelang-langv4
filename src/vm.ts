// FreeLang v4 — Stack VM (SPEC_02 구현)
// fetch-decode-execute + Actor cooperative scheduling

import { Op, Chunk, FuncInfo } from "./compiler";
import * as crypto from "crypto";
import * as fs from "fs";
import { SQLiteDB, DBAdapter } from "./db";

// ============================================================
// Value (SPEC_02 Q3)
// ============================================================

export type Value =
  | { tag: "i32"; val: number }
  | { tag: "f64"; val: number }
  | { tag: "str"; val: string }
  | { tag: "bool"; val: boolean }
  | { tag: "arr"; val: Value[] }
  | { tag: "struct"; fields: Map<string, Value> }
  | { tag: "ok"; val: Value }
  | { tag: "err"; val: Value }
  | { tag: "some"; val: Value }
  | { tag: "none" }
  | { tag: "chan"; id: number }
  | { tag: "db"; id: number }
  | { tag: "void" };

// ============================================================
// CallFrame (SPEC_02 Q5)
// ============================================================

type CallFrame = {
  returnAddr: number;
  baseSlot: number;
  locals: Value[];
};

// ============================================================
// Channel
// ============================================================

type Channel = {
  id: number;
  buffer: Value[];
  waitingRecv: number[]; // actor ids waiting to recv
};

// ============================================================
// Actor (SPEC_02 Q7)
// ============================================================

type Actor = {
  id: number;
  ip: number;
  stack: Value[];
  frames: CallFrame[];
  state: "running" | "waiting" | "done";
  waitingChan: number | null;
};

// ============================================================
// VM
// ============================================================

export class VM {
  private chunk!: Chunk;
  private actors: Actor[] = [];
  private channels: Map<number, Channel> = new Map();
  private nextChannelId: number = 0;
  private databases: Map<number, DBAdapter> = new Map();
  private nextDbId: number = 0;
  private httpServers: Map<number, any> = new Map(); // {app, server, requestQueue, nextReqId}
  private nextServerId: number = 0;
  private nextReqId: number = 0;
  private globals: Map<string, Value> = new Map();
  private output: string[] = [];
  private instructionCount: number = 0;
  private maxInstructions: number = 1_000_000;
  private runningCount: number = 0;

  async run(chunk: Chunk): Promise<{ output: string[]; error: string | null }> {
    this.chunk = chunk;
    this.output = [];
    this.instructionCount = 0;

    // main actor
    this.actors = [{
      id: 0,
      ip: 0,
      stack: [],
      frames: [{ returnAddr: -1, baseSlot: 0, locals: [] }],
      state: "running",
      waitingChan: null,
    }];
    this.runningCount = 1;

    try {
      await this.schedule();
      return { output: this.output, error: null };
    } catch (e: any) {
      return { output: this.output, error: e.message || String(e) };
    }
  }

  // ============================================================
  // Scheduler — round-robin (SPEC_02 Q7)
  // ============================================================

  private async schedule(): Promise<void> {
    const SLICE = 1000;
    let current = 0;

    while (this.runningCount > 0) {
      const actor = this.actors[current];

      if (actor.state === "running") {
        await this.runSlice(actor, SLICE);
      } else if (actor.state === "waiting" && actor.waitingChan !== null) {
        const chan = this.channels.get(actor.waitingChan);
        if (chan && chan.buffer.length > 0) {
          const val = chan.buffer.shift()!;
          actor.stack.push({ tag: "ok", val });
          actor.state = "running";
          actor.waitingChan = null;
        }
      }

      current = (current + 1) % this.actors.length;

      if (this.instructionCount > this.maxInstructions) {
        throw new Error("execution limit exceeded (infinite loop?)");
      }
    }
  }

  // ============================================================
  // Execute slice
  // ============================================================

  private async runSlice(actor: Actor, maxOps: number): Promise<void> {
    let ops = 0;

    while (ops < maxOps && actor.state === "running") {
      if (actor.ip >= this.chunk.code.length) {
        actor.state = "done";
        this.runningCount--;
        return;
      }

      const op = this.chunk.code[actor.ip++];
      this.instructionCount++;
      ops++;

      // currentFrame 캐시 (CALL/RETURN에서 업데이트)
      let currentFrame = actor.frames[actor.frames.length - 1];

      switch (op) {
        // ---- 상수 로드 ----
        case Op.PUSH_I32: {
          const val = this.readI32(actor);
          actor.stack.push({ tag: "i32", val });
          break;
        }
        case Op.PUSH_F64: {
          const val = this.readF64(actor);
          actor.stack.push({ tag: "f64", val });
          break;
        }
        case Op.PUSH_STR: {
          const idx = this.readI32(actor);
          actor.stack.push({ tag: "str", val: this.chunk.constants[idx] });
          break;
        }
        case Op.PUSH_TRUE:
          actor.stack.push({ tag: "bool", val: true });
          break;
        case Op.PUSH_FALSE:
          actor.stack.push({ tag: "bool", val: false });
          break;
        case Op.PUSH_VOID:
          actor.stack.push({ tag: "void" });
          break;
        case Op.PUSH_NONE:
          actor.stack.push({ tag: "none" });
          break;
        case Op.POP:
          actor.stack.pop();
          break;
        case Op.DUP:
          actor.stack.push(actor.stack[actor.stack.length - 1]);
          break;

        // ---- 산술 (i32) ----
        case Op.ADD_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          if (a.tag === "str" && b.tag === "str") {
            actor.stack.push({ tag: "str", val: a.val + b.val });
          } else {
            actor.stack.push({ tag: a.tag as any, val: (a as any).val + (b as any).val });
          }
          break;
        }
        case Op.SUB_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: a.tag as any, val: (a as any).val - (b as any).val });
          break;
        }
        case Op.MUL_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: a.tag as any, val: (a as any).val * (b as any).val });
          break;
        }
        case Op.DIV_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          if ((b as any).val === 0) throw new Error("panic: division by zero");
          const result = a.tag === "i32"
            ? Math.trunc((a as any).val / (b as any).val)
            : (a as any).val / (b as any).val;
          actor.stack.push({ tag: a.tag as any, val: result });
          break;
        }
        case Op.MOD_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          if ((b as any).val === 0) throw new Error("panic: division by zero");
          actor.stack.push({ tag: a.tag as any, val: (a as any).val % (b as any).val });
          break;
        }
        case Op.NEG_I32: {
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: a.tag as any, val: -(a as any).val });
          break;
        }

        // ---- f64 산술 ----
        case Op.ADD_F64: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          if (a.tag === "str" && b.tag === "str") {
            actor.stack.push({ tag: "str", val: a.val + b.val });
          } else {
            actor.stack.push({ tag: "f64", val: (a as any).val + (b as any).val });
          }
          break;
        }
        case Op.SUB_F64: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "f64", val: (a as any).val - (b as any).val });
          break;
        }
        case Op.MUL_F64: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "f64", val: (a as any).val * (b as any).val });
          break;
        }
        case Op.DIV_F64: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          if ((b as any).val === 0) throw new Error("panic: division by zero");
          actor.stack.push({ tag: "f64", val: (a as any).val / (b as any).val });
          break;
        }
        case Op.MOD_F64: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          if ((b as any).val === 0) throw new Error("panic: division by zero");
          actor.stack.push({ tag: "f64", val: (a as any).val % (b as any).val });
          break;
        }
        case Op.NEG_F64: {
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "f64", val: -(a as any).val });
          break;
        }

        // ---- 비교 ----
        case Op.EQ: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: this.valuesEqual(a, b) });
          break;
        }
        case Op.NEQ: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: !this.valuesEqual(a, b) });
          break;
        }
        case Op.LT: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val < (b as any).val });
          break;
        }
        case Op.GT: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val > (b as any).val });
          break;
        }
        case Op.LTEQ: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val <= (b as any).val });
          break;
        }
        case Op.GTEQ: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val >= (b as any).val });
          break;
        }

        // ---- 논리 ----
        case Op.AND: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val && (b as any).val });
          break;
        }
        case Op.OR: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val || (b as any).val });
          break;
        }
        case Op.NOT: {
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: !(a as any).val });
          break;
        }

        // ---- 변수 ----
        case Op.LOAD_LOCAL: {
          const slot = this.readI32(actor);
          const frame = actor.frames[actor.frames.length - 1];
          actor.stack.push(frame.locals[slot] ?? { tag: "void" });
          break;
        }
        case Op.STORE_LOCAL: {
          const slot = this.readI32(actor);
          const val = actor.stack.pop()!;
          const frame = actor.frames[actor.frames.length - 1];
          while (frame.locals.length <= slot) frame.locals.push({ tag: "void" });
          frame.locals[slot] = val;
          break;
        }
        case Op.LOAD_GLOBAL: {
          const idx = this.readI32(actor);
          const name = this.chunk.constants[idx];
          actor.stack.push(this.globals.get(name) ?? { tag: "void" });
          break;
        }
        case Op.STORE_GLOBAL: {
          const idx = this.readI32(actor);
          const name = this.chunk.constants[idx];
          const val = actor.stack.pop()!;
          this.globals.set(name, val);
          break;
        }

        // ---- 제어 ----
        case Op.JUMP: {
          const target = this.readI32(actor);
          actor.ip = target;
          break;
        }
        case Op.JUMP_IF_FALSE: {
          const target = this.readI32(actor);
          const cond = actor.stack.pop()!;
          if (cond.tag === "bool" && !cond.val) {
            actor.ip = target;
          }
          break;
        }
        case Op.RETURN: {
          const retVal = actor.stack.pop() ?? { tag: "void" as const };
          const frame = actor.frames.pop()!;

          if (actor.frames.length === 0) {
            actor.state = "done";
            this.runningCount--;
            return;
          }

          actor.ip = frame.returnAddr;
          // 스택 정리
          actor.stack.length = frame.baseSlot;
          actor.stack.push(retVal);
          break;
        }
        case Op.HALT:
          actor.state = "done";
          this.runningCount--;
          return;

        // ---- 함수 호출 ----
        case Op.CALL: {
          const fnIdx = this.readI32(actor);
          const argCount = this.chunk.code[actor.ip++];

          const fn = this.chunk.functions[fnIdx];
          if (!fn) throw new Error(`panic: undefined function index ${fnIdx}`);

          const args: Value[] = new Array(argCount);
          for (let i = argCount - 1; i >= 0; i--) {
            args[i] = actor.stack.pop()!;
          }

          actor.frames.push({
            returnAddr: actor.ip,
            baseSlot: actor.stack.length,
            locals: args,
          });

          actor.ip = fn.offset;
          break;
        }
        case Op.CALL_BUILTIN: {
          const nameIdx = this.readI32(actor);
          const argCount = this.chunk.code[actor.ip++];
          const name = this.chunk.constants[nameIdx];

          const args: Value[] = new Array(argCount);
          for (let i = argCount - 1; i >= 0; i--) {
            args[i] = actor.stack.pop()!;
          }

          const result = await this.callBuiltin(name, args);
          actor.stack.push(result);
          break;
        }

        // ---- 배열 ----
        case Op.ARRAY_NEW: {
          const count = this.readI32(actor);
          const elements: Value[] = new Array(count);
          for (let i = count - 1; i >= 0; i--) {
            elements[i] = actor.stack.pop()!;
          }
          actor.stack.push({ tag: "arr", val: elements });
          break;
        }
        case Op.ARRAY_GET: {
          const idx = actor.stack.pop()!;
          const arr = actor.stack.pop()!;
          if (arr.tag !== "arr") throw new Error("panic: not an array");
          const i = (idx as any).val;
          if (i < 0 || i >= arr.val.length) throw new Error(`panic: index out of bounds: ${i}`);
          actor.stack.push(arr.val[i]);
          break;
        }
        case Op.ARRAY_SET: {
          const val = actor.stack.pop()!;
          const idx = actor.stack.pop()!;
          const arr = actor.stack.pop()!;
          if (arr.tag !== "arr") throw new Error("panic: not an array");
          arr.val[(idx as any).val] = val;
          break;
        }

        // ---- 구조체 ----
        case Op.STRUCT_NEW: {
          const count = this.readI32(actor);
          const fields = new Map<string, Value>();
          for (let i = 0; i < count; i++) {
            const val = actor.stack.pop()!;
            const key = actor.stack.pop()!;
            fields.set((key as any).val, val);
          }
          actor.stack.push({ tag: "struct", fields });
          break;
        }
        case Op.STRUCT_GET: {
          const nameIdx = this.readI32(actor);
          const fieldName = this.chunk.constants[nameIdx];
          const obj = actor.stack.pop()!;
          if (obj.tag !== "struct") throw new Error("panic: not a struct");
          actor.stack.push(obj.fields.get(fieldName) ?? { tag: "void" });
          break;
        }

        // ---- Option/Result ----
        case Op.WRAP_OK: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "ok", val });
          break;
        }
        case Op.WRAP_ERR: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "err", val });
          break;
        }
        case Op.WRAP_SOME: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "some", val });
          break;
        }
        case Op.UNWRAP: {
          const val = actor.stack.pop()!;
          if (val.tag === "ok" || val.tag === "some") {
            actor.stack.push(val.val);
          } else {
            throw new Error(`panic: unwrap on ${val.tag}`);
          }
          break;
        }
        case Op.IS_OK: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: val.tag === "ok" });
          break;
        }
        case Op.IS_ERR: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: val.tag === "err" });
          break;
        }
        case Op.IS_SOME: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: val.tag === "some" });
          break;
        }
        case Op.IS_NONE: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: val.tag === "none" });
          break;
        }

        // ---- Actor/Channel ----
        case Op.SPAWN: {
          const bodyOffset = this.readI32(actor);
          const newActor: Actor = {
            id: this.actors.length,
            ip: bodyOffset,
            stack: [],
            frames: [{ returnAddr: -1, baseSlot: 0, locals: [] }],
            state: "running",
            waitingChan: null,
          };
          this.actors.push(newActor);
          this.runningCount++;
          break;
        }
        case Op.CHAN_NEW: {
          const id = this.nextChannelId++;
          const chan: Channel = {
            id,
            buffer: [],
            waitingRecv: [],
          };
          this.channels.set(id, chan);
          actor.stack.push({ tag: "chan", id });
          break;
        }
        case Op.CHAN_SEND: {
          const val = actor.stack.pop()!;
          const chanVal = actor.stack.pop()!;
          if (chanVal.tag !== "chan") throw new Error("panic: send on non-channel");
          const chan = this.channels.get(chanVal.id)!;
          chan.buffer.push(val);
          // 대기 중인 actor 깨우기
          if (chan.waitingRecv.length > 0) {
            const waitId = chan.waitingRecv.shift()!;
            const waitActor = this.actors[waitId];
            if (waitActor) {
              waitActor.state = "running";
              waitActor.waitingChan = null;
            }
          }
          break;
        }
        case Op.CHAN_RECV: {
          const chanVal = actor.stack.pop()!;
          if (chanVal.tag !== "chan") throw new Error("panic: recv on non-channel");
          const chan = this.channels.get(chanVal.id)!;
          if (chan.buffer.length > 0) {
            const val = chan.buffer.shift()!;
            actor.stack.push({ tag: "ok", val });
          } else {
            // 대기 상태로 전환
            actor.state = "waiting";
            actor.waitingChan = chanVal.id;
            chan.waitingRecv.push(actor.id);
            return;
          }
          break;
        }

        default:
          throw new Error(`panic: unknown opcode 0x${op.toString(16)}`);
      }
    }
  }

  // ============================================================
  // 내장 함수 (SPEC_10)
  // ============================================================

  private async callBuiltin(name: string, args: Value[]): Promise<Value> {
    // ============================================================
    // DB 헬퍼 함수들
    // ============================================================
    const getDB = (arg: Value): DBAdapter | null => {
      if (arg.tag !== "db") return null;
      return this.databases.get(arg.id) ?? null;
    };

    const dbErr = (msg: string): Value => ({
      tag: "err",
      val: { tag: "str", val: msg },
    });

    const rowToValue = (row: any): Value => {
      const fields = new Map<string, Value>();
      for (const [key, val] of Object.entries(row)) {
        fields.set(key, this.jsonToValue(val));
      }
      return { tag: "struct", fields };
    };

    switch (name) {
      case "println": {
        const text = args.map((a) => this.valueToString(a)).join(" ");
        this.output.push(text);
        return { tag: "void" };
      }
      case "print": {
        const text = args.map((a) => this.valueToString(a)).join(" ");
        // print는 줄바꿈 없이 마지막 출력에 이어붙임
        if (this.output.length > 0) {
          this.output[this.output.length - 1] += text;
        } else {
          this.output.push(text);
        }
        return { tag: "void" };
      }
      case "str":
        return { tag: "str", val: this.valueToString(args[0]) };
      case "length":
        if (args[0].tag === "arr") return { tag: "i32", val: args[0].val.length };
        if (args[0].tag === "str") return { tag: "i32", val: args[0].val.length };
        return { tag: "i32", val: 0 };
      case "range": {
        const start = (args[0] as any).val;
        const end = (args[1] as any).val;
        const arr: Value[] = [];
        for (let i = start; i < end; i++) arr.push({ tag: "i32", val: i });
        return { tag: "arr", val: arr };
      }
      case "push":
        if (args[0].tag === "arr") args[0].val.push(args[1]);
        return { tag: "void" };
      case "pop":
        if (args[0].tag === "arr") return args[0].val.pop() ?? { tag: "void" };
        return { tag: "void" };
      case "abs":
        return { tag: (args[0] as any).tag, val: Math.abs((args[0] as any).val) };
      case "min":
        return { tag: (args[0] as any).tag, val: Math.min((args[0] as any).val, (args[1] as any).val) };
      case "max":
        return { tag: (args[0] as any).tag, val: Math.max((args[0] as any).val, (args[1] as any).val) };
      case "pow":
        return { tag: "f64", val: Math.pow((args[0] as any).val, (args[1] as any).val) };
      case "sqrt":
        return { tag: "f64", val: Math.sqrt((args[0] as any).val) };
      case "typeof":
        return { tag: "str", val: args[0].tag };
      case "assert":
        if (args[0].tag === "bool" && !args[0].val) {
          const msg = args.length > 1 ? this.valueToString(args[1]) : "assertion failed";
          throw new Error(`panic: ${msg}`);
        }
        return { tag: "void" };
      case "panic":
        throw new Error(`panic: ${this.valueToString(args[0])}`);
      case "bitand":
        return { tag: "i32", val: (args[0] as any).val & (args[1] as any).val };
      case "bitor":
        return { tag: "i32", val: (args[0] as any).val | (args[1] as any).val };
      case "bitxor":
        return { tag: "i32", val: (args[0] as any).val ^ (args[1] as any).val };
      case "shl":
        return { tag: "i32", val: (args[0] as any).val << (args[1] as any).val };
      case "shr":
        return { tag: "i32", val: (args[0] as any).val >> (args[1] as any).val };
      case "contains":
        if (args[0].tag === "str") {
          return { tag: "bool", val: args[0].val.includes((args[1] as any).val) };
        }
        return { tag: "bool", val: false };
      case "split":
        if (args[0].tag === "str") {
          const parts = args[0].val.split((args[1] as any).val);
          return { tag: "arr", val: parts.map((s) => ({ tag: "str" as const, val: s })) };
        }
        return { tag: "arr", val: [] };
      case "trim":
        if (args[0].tag === "str") return { tag: "str", val: args[0].val.trim() };
        return args[0];
      case "to_upper":
        if (args[0].tag === "str") return { tag: "str", val: args[0].val.toUpperCase() };
        return args[0];
      case "to_lower":
        if (args[0].tag === "str") return { tag: "str", val: args[0].val.toLowerCase() };
        return args[0];
      case "char_at":
        if (args[0].tag === "str") {
          const i = (args[1] as any).val;
          return { tag: "str", val: args[0].val[i] ?? "" };
        }
        return { tag: "str", val: "" };
      case "slice":
        if (args[0].tag === "arr") {
          const s = (args[1] as any).val;
          const e = (args[2] as any).val;
          return { tag: "arr", val: args[0].val.slice(s, e) };
        }
        if (args[0].tag === "str") {
          const s = (args[1] as any).val;
          const e = (args[2] as any).val;
          return { tag: "str", val: args[0].val.slice(s, e) };
        }
        return args[0];
      case "clone":
        return this.deepClone(args[0]);
      case "channel": {
        const id = this.nextChannelId++;
        const chan: Channel = { id, buffer: [], waitingRecv: [] };
        this.channels.set(id, chan);
        return { tag: "chan", id };
      }
      case "i32": {
        const parsed = parseInt(this.valueToString(args[0]), 10);
        if (isNaN(parsed)) return { tag: "err", val: { tag: "str", val: "Invalid number for i32" } };
        return { tag: "ok", val: { tag: "i32", val: parsed } };
      }
      case "i64":
        return { tag: "ok", val: { tag: "i32", val: parseInt(this.valueToString(args[0]), 10) || 0 } };
      case "f64":
        return { tag: "ok", val: { tag: "f64", val: parseFloat(this.valueToString(args[0])) || 0 } };
      case "read_line": {
        // synchronous readline from stdin (simplified - returns empty for now)
        // In real implementation, would need async or proper stdin handling
        return { tag: "str", val: "" };
      }
      case "read_file": {
        const filepath = this.valueToString(args[0]);
        try {
          const content = fs.readFileSync(filepath, "utf-8");
          return { tag: "ok", val: { tag: "str", val: content } };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "unknown error";
          return { tag: "err", val: { tag: "str", val: errMsg } };
        }
      }
      case "write_file": {
        const filepath = this.valueToString(args[0]);
        const content = this.valueToString(args[1]);
        try {
          fs.writeFileSync(filepath, content, "utf-8");
          return { tag: "ok", val: { tag: "void" } };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "unknown error";
          return { tag: "err", val: { tag: "str", val: errMsg } };
        }
      }
      case "recv":
        // method-style: obj.recv()
        if (args[0] && args[0].tag === "chan") {
          const chan = this.channels.get(args[0].id);
          if (chan && chan.buffer.length > 0) {
            return { tag: "ok", val: chan.buffer.shift()! };
          }
          return { tag: "err", val: { tag: "str", val: "channel empty" } };
        }
        return { tag: "err", val: { tag: "str", val: "not a channel" } };
      case "send":
        if (args[0] && args[0].tag === "chan") {
          const chan = this.channels.get(args[0].id);
          if (chan) chan.buffer.push(args[1]);
          return { tag: "void" };
        }
        return { tag: "void" };

      // ============================================================
      // Phase 7: 20 Core Libraries
      // ============================================================

      // Cryptography & Encoding (6)
      case "md5": {
        const input = this.valueToString(args[0]);
        const hash = crypto.createHash("md5").update(input).digest("hex");
        return { tag: "str", val: hash };
      }
      case "sha256": {
        const input = this.valueToString(args[0]);
        const hash = crypto.createHash("sha256").update(input).digest("hex");
        return { tag: "str", val: hash };
      }
      case "sha512": {
        const input = this.valueToString(args[0]);
        const hash = crypto.createHash("sha512").update(input).digest("hex");
        return { tag: "str", val: hash };
      }
      case "base64_encode": {
        const input = this.valueToString(args[0]);
        const encoded = Buffer.from(input, "utf8").toString("base64");
        return { tag: "str", val: encoded };
      }
      case "base64_decode": {
        try {
          const input = this.valueToString(args[0]);
          const decoded = Buffer.from(input, "base64").toString("utf8");
          return { tag: "ok", val: { tag: "str", val: decoded } };
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: "invalid base64" } };
        }
      }
      case "hmac": {
        const message = this.valueToString(args[0]);
        const secret = this.valueToString(args[1]);
        const hmac = crypto.createHmac("sha256", secret).update(message).digest("hex");
        return { tag: "str", val: hmac };
      }

      // JSON (4)
      case "json_parse": {
        try {
          const jsonStr = this.valueToString(args[0]);
          const obj = JSON.parse(jsonStr);
          const value = this.jsonToValue(obj);
          return { tag: "ok", val: value };
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `JSON parse error: ${String(e)}` } };
        }
      }
      case "json_stringify": {
        try {
          const jsonStr = JSON.stringify(this.valueToJSON(args[0]), null, 0);
          return { tag: "str", val: jsonStr };
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `JSON stringify error: ${String(e)}` } };
        }
      }
      case "json_validate": {
        try {
          const jsonStr = this.valueToString(args[0]);
          JSON.parse(jsonStr);
          return { tag: "bool", val: true };
        } catch {
          return { tag: "bool", val: false };
        }
      }
      case "json_pretty": {
        try {
          const jsonStr = this.valueToString(args[0]);
          const obj = JSON.parse(jsonStr);
          const pretty = JSON.stringify(obj, null, 2);
          return { tag: "str", val: pretty };
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `JSON pretty error: ${String(e)}` } };
        }
      }

      // Advanced Strings (3)
      case "starts_with": {
        if (args[0].tag === "str" && args[1].tag === "str") {
          const result = args[0].val.startsWith(args[1].val);
          return { tag: "bool", val: result };
        }
        return { tag: "bool", val: false };
      }
      case "ends_with": {
        if (args[0].tag === "str" && args[1].tag === "str") {
          const result = args[0].val.endsWith(args[1].val);
          return { tag: "bool", val: result };
        }
        return { tag: "bool", val: false };
      }
      case "replace": {
        if (args[0].tag === "str" && args[1].tag === "str" && args[2].tag === "str") {
          const result = args[0].val.replaceAll(args[1].val, args[2].val);
          return { tag: "str", val: result };
        }
        return args[0];
      }

      // Advanced Arrays (3)
      case "reverse": {
        if (args[0].tag === "arr") {
          const reversed = [...args[0].val].reverse();
          return { tag: "arr", val: reversed };
        }
        return args[0];
      }
      case "sort": {
        if (args[0].tag === "arr") {
          const sorted = [...args[0].val].sort((a, b) => {
            const aVal = (a as any).val ?? 0;
            const bVal = (b as any).val ?? 0;
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          });
          return { tag: "arr", val: sorted };
        }
        return args[0];
      }
      case "unique": {
        if (args[0].tag === "arr") {
          const seen = new Set<string>();
          const unique: Value[] = [];
          for (const item of args[0].val) {
            const key = JSON.stringify(this.valueToJSON(item));
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(item);
            }
          }
          return { tag: "arr", val: unique };
        }
        return args[0];
      }

      // Math (2)
      case "gcd": {
        const a = Math.abs((args[0] as any).val);
        const b = Math.abs((args[1] as any).val);
        const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
        return { tag: "i32", val: gcd(a, b) };
      }
      case "lcm": {
        const a = Math.abs((args[0] as any).val);
        const b = Math.abs((args[1] as any).val);
        const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
        return { tag: "i32", val: (a * b) / gcd(a, b) };
      }

      // Utils (2)
      case "uuid": {
        const uuid = crypto.randomUUID();
        return { tag: "str", val: uuid };
      }
      case "timestamp": {
        const now = Date.now();
        return { tag: "f64", val: now };
      }

      // Environment (1)
      case "env": {
        const key = this.valueToString(args[0]);
        const value = process.env[key] ?? "";
        return { tag: "str", val: value };
      }

      // HTTP Client (5) — Phase 2
      case "http_get": {
        const url = this.valueToString(args[0]);
        try {
          const result = await this.httpGetAsync(url);
          return result;
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `HTTP error: ${String(e)}` } };
        }
      }
      case "http_post": {
        const url = this.valueToString(args[0]);
        const body = this.valueToString(args[1]);
        try {
          const result = await this.httpPostAsync(url, body);
          return result;
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `HTTP error: ${String(e)}` } };
        }
      }
      case "http_post_json": {
        const url = this.valueToString(args[0]);
        const jsonBody = this.valueToString(args[1]);
        try {
          const result = await this.httpPostJsonAsync(url, jsonBody);
          return result;
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `HTTP error: ${String(e)}` } };
        }
      }
      case "fetch": {
        const url = this.valueToString(args[0]);
        const method = args.length > 1 ? this.valueToString(args[1]) : "GET";
        const headers = args.length > 2 ? args[2] : null;
        const body = args.length > 3 ? this.valueToString(args[3]) : null;
        try {
          const result = await this.fetchAsync(url, method, headers, body);
          return result;
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `HTTP error: ${String(e)}` } };
        }
      }

      // Database (5)
      case "sqlite_open": {
        const path = this.valueToString(args[0]);
        try {
          const db = new SQLiteDB(path);
          await db.init();
          const dbId = this.nextDbId++;
          this.databases.set(dbId, db);
          return { tag: "db", id: dbId };
        } catch (e: any) {
          return { tag: "err", val: { tag: "str", val: `Database error: ${e.message}` } };
        }
      }
      case "sqlite_query": {
        const db = getDB(args[0]);
        if (!db) return dbErr("first argument must be a database");
        const sql = this.valueToString(args[1]);
        const params = args.length > 2 && args[2].tag === "arr" ? args[2].val.map(v => (v as any).val) : [];
        try {
          const rows = await db.query(sql, params);
          const result = rows.map(rowToValue);
          return { tag: "ok", val: { tag: "arr", val: result } };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }
      case "sqlite_execute": {
        const db = getDB(args[0]);
        if (!db) return dbErr("first argument must be a database");
        const sql = this.valueToString(args[1]);
        const params = args.length > 2 && args[2].tag === "arr" ? args[2].val.map(v => (v as any).val) : [];
        try {
          const result = await db.execute(sql, params);
          return { tag: "ok", val: { tag: "struct", fields: new Map([["changes", { tag: "i32", val: result.changes }]]) } };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }
      case "sqlite_close": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        try {
          await db.close();
          const dbId = (args[0] as { tag: "db"; id: number }).id;
          this.databases.delete(dbId);
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      // Transaction builtins
      case "sqlite_begin": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        const isolation = args.length > 1 ? this.valueToString(args[1]) : "deferred";
        try {
          await (db as any).begin(isolation);
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "sqlite_commit": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        try {
          await (db as any).commit();
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "sqlite_rollback": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        try {
          await (db as any).rollback();
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      // PostgreSQL builtins
      case "pg_connect": {
        if (args.length < 5) return dbErr("pg_connect requires 5 arguments");
        const [host, port, user, password, database] = args.map(a => this.valueToString(a));
        try {
          const { PostgreSQLDB } = await import("./db");
          const db = new PostgreSQLDB({
            host,
            port: parseInt(port),
            user,
            password,
            database,
          });
          await db.connect();
          const dbId = this.nextDbId++;
          this.databases.set(dbId, db);
          return { tag: "db", id: dbId };
        } catch (e: any) {
          return dbErr(`pg_connect error: ${e.message}`);
        }
      }

      case "pg_query": {
        const db = getDB(args[0]);
        if (!db) return dbErr("first argument must be a database");
        const sql = this.valueToString(args[1]);
        const params = args.length > 2 && args[2].tag === "arr" ? args[2].val.map(v => (v as any).val) : [];
        try {
          const rows = await db.query(sql, params);
          const result = rows.map(rowToValue);
          return { tag: "ok", val: { tag: "arr", val: result } };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "pg_execute": {
        const db = getDB(args[0]);
        if (!db) return dbErr("first argument must be a database");
        const sql = this.valueToString(args[1]);
        const params = args.length > 2 && args[2].tag === "arr" ? args[2].val.map(v => (v as any).val) : [];
        try {
          const result = await db.execute(sql, params);
          return { tag: "ok", val: { tag: "struct", fields: new Map([["changes", { tag: "i32", val: result.changes }]]) } };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "pg_close": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        try {
          await db.close();
          const dbId = (args[0] as { tag: "db"; id: number }).id;
          this.databases.delete(dbId);
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "pg_begin": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        const isolation = args.length > 1 ? this.valueToString(args[1]) : "deferred";
        try {
          await (db as any).begin(isolation);
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "pg_commit": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        try {
          await (db as any).commit();
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "pg_rollback": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        try {
          await (db as any).rollback();
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "mysql_connect": {
        if (args.length < 5) return dbErr("mysql_connect requires 5 arguments");
        const [host, port, user, password, database] = args.map(a => this.valueToString(a));
        try {
          const { MySQLDB } = await import("./db");
          const db = new MySQLDB({
            host,
            port: parseInt(port),
            user,
            password,
            database,
          });
          await db.connect();
          const dbId = this.nextDbId++;
          this.databases.set(dbId, db);
          return { tag: "db", id: dbId };
        } catch (e: any) {
          return dbErr(`mysql_connect error: ${e.message}`);
        }
      }

      case "mysql_query": {
        const db = getDB(args[0]);
        if (!db) return dbErr("first argument must be a database");
        const sql = this.valueToString(args[1]);
        const params = args.length > 2 && args[2].tag === "arr" ? args[2].val.map(v => (v as any).val) : [];
        try {
          const rows = await db.query(sql, params);
          const result = rows.map(rowToValue);
          return { tag: "ok", val: { tag: "arr", val: result } };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "mysql_execute": {
        const db = getDB(args[0]);
        if (!db) return dbErr("first argument must be a database");
        const sql = this.valueToString(args[1]);
        const params = args.length > 2 && args[2].tag === "arr" ? args[2].val.map(v => (v as any).val) : [];
        try {
          const result = await db.execute(sql, params);
          return { tag: "ok", val: { tag: "struct", fields: new Map([["changes", { tag: "i32", val: result.changes }]]) } };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "mysql_close": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        try {
          await db.close();
          const dbId = (args[0] as { tag: "db"; id: number }).id;
          this.databases.delete(dbId);
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "mysql_begin": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        const isolation = args.length > 1 ? this.valueToString(args[1]) : "deferred";
        try {
          await (db as any).begin(isolation);
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "mysql_commit": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        try {
          await (db as any).commit();
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      case "mysql_rollback": {
        const db = getDB(args[0]);
        if (!db) return dbErr("argument must be a database");
        try {
          await (db as any).rollback();
          return { tag: "void" };
        } catch (e: any) {
          return dbErr(e.message);
        }
      }

      // Math Functions (7) — B-1
      case "floor": {
        const num = (args[0] as any).val ?? 0;
        return { tag: "i32", val: Math.floor(num) };
      }
      case "ceil": {
        const num = (args[0] as any).val ?? 0;
        return { tag: "i32", val: Math.ceil(num) };
      }
      case "round": {
        const num = (args[0] as any).val ?? 0;
        return { tag: "i32", val: Math.round(num) };
      }
      case "random": {
        return { tag: "f64", val: Math.random() };
      }
      case "sin": {
        const num = (args[0] as any).val ?? 0;
        return { tag: "f64", val: Math.sin(num) };
      }
      case "cos": {
        const num = (args[0] as any).val ?? 0;
        return { tag: "f64", val: Math.cos(num) };
      }
      case "log": {
        const num = (args[0] as any).val ?? 1;
        if (num <= 0) return { tag: "err", val: { tag: "str", val: "log: invalid argument" } };
        return { tag: "f64", val: Math.log(num) };
      }

      // String Functions (3) — B-2
      case "index_of": {
        if (args[0].tag === "str" && args[1].tag === "str") {
          const idx = args[0].val.indexOf(args[1].val);
          if (idx >= 0) {
            return { tag: "some", val: { tag: "i32", val: idx } };
          }
          return { tag: "none" };
        }
        return { tag: "none" };
      }
      case "pad_left": {
        if (args[0].tag === "str" && args[1].tag === "i32" && args[2].tag === "str") {
          const char = args[2].val.charAt(0) || " ";
          const padded = args[0].val.padStart(args[1].val, char);
          return { tag: "str", val: padded };
        }
        return args[0];
      }
      case "pad_right": {
        if (args[0].tag === "str" && args[1].tag === "i32" && args[2].tag === "str") {
          const char = args[2].val.charAt(0) || " ";
          const padded = args[0].val.padEnd(args[1].val, char);
          return { tag: "str", val: padded };
        }
        return args[0];
      }

      // Regex Functions (3) — B-3
      case "regex_match": {
        if (args[0].tag === "str" && args[1].tag === "str") {
          try {
            const regex = new RegExp(args[1].val);
            const match = args[0].val.match(regex);
            if (match) {
              return { tag: "some", val: { tag: "str", val: match[0] } };
            }
            return { tag: "none" };
          } catch (e) {
            return { tag: "err", val: { tag: "str", val: `regex error: ${String(e)}` } };
          }
        }
        return { tag: "none" };
      }
      case "regex_find_all": {
        if (args[0].tag === "str" && args[1].tag === "str") {
          try {
            const regex = new RegExp(args[1].val, "g");
            const matches = args[0].val.match(regex) || [];
            const arr: Value[] = matches.map(m => ({ tag: "str", val: m }));
            return { tag: "arr", val: arr };
          } catch (e) {
            return { tag: "err", val: { tag: "str", val: `regex error: ${String(e)}` } };
          }
        }
        return { tag: "arr", val: [] };
      }
      case "regex_replace": {
        if (args[0].tag === "str" && args[1].tag === "str" && args[2].tag === "str") {
          try {
            const regex = new RegExp(args[1].val, "g");
            const replaced = args[0].val.replace(regex, args[2].val);
            return { tag: "str", val: replaced };
          } catch (e) {
            return { tag: "err", val: { tag: "str", val: `regex error: ${String(e)}` } };
          }
        }
        return args[0];
      }

      // CSV Functions (2) — B-4
      case "csv_parse": {
        if (args[0].tag === "str") {
          try {
            const lines = args[0].val.split("\n").filter(l => l.trim());
            const result: Value[] = [];
            for (const line of lines) {
              const cells = this.parseCsvRow(line);
              const row: Value[] = cells.map(c => ({ tag: "str", val: c }));
              result.push({ tag: "arr", val: row });
            }
            return { tag: "arr", val: result };
          } catch (e) {
            return { tag: "err", val: { tag: "str", val: `CSV parse error: ${String(e)}` } };
          }
        }
        return { tag: "arr", val: [] };
      }
      case "csv_stringify": {
        if (args[0].tag === "arr") {
          try {
            const rows: string[] = [];
            for (const row of args[0].val) {
              if (row.tag === "arr") {
                const cells = row.val.map(v => this.valueToString(v));
                const escaped = cells.map(c => {
                  if (c.includes(",") || c.includes('"') || c.includes("\n")) {
                    return `"${c.replace(/"/g, '""')}"`;
                  }
                  return c;
                });
                rows.push(escaped.join(","));
              }
            }
            return { tag: "str", val: rows.join("\n") };
          } catch (e) {
            return { tag: "err", val: { tag: "str", val: `CSV stringify error: ${String(e)}` } };
          }
        }
        return { tag: "str", val: "" };
      }

      // DateTime Functions (3) — B-5
      case "now": {
        return { tag: "f64", val: Date.now() };
      }
      case "format_date": {
        if (args[0].tag === "f64" && args[1].tag === "str") {
          const timestamp = args[0].val;
          const format = args[1].val;
          const date = new Date(timestamp);
          let result = format;
          result = result.replace(/YYYY/g, date.getFullYear().toString());
          result = result.replace(/MM/g, String(date.getMonth() + 1).padStart(2, "0"));
          result = result.replace(/DD/g, String(date.getDate()).padStart(2, "0"));
          result = result.replace(/HH/g, String(date.getHours()).padStart(2, "0"));
          result = result.replace(/mm/g, String(date.getMinutes()).padStart(2, "0"));
          result = result.replace(/ss/g, String(date.getSeconds()).padStart(2, "0"));
          return { tag: "str", val: result };
        }
        return { tag: "str", val: "" };
      }
      case "parse_date": {
        if (args[0].tag === "str" && args[1].tag === "str") {
          const dateStr = args[0].val;
          const format = args[1].val;
          try {
            // Simple date parsing - support YYYY-MM-DD HH:mm:ss
            const timestamp = new Date(dateStr).getTime();
            if (isNaN(timestamp)) {
              return { tag: "err", val: { tag: "str", val: "Invalid date format" } };
            }
            return { tag: "ok", val: { tag: "f64", val: timestamp } };
          } catch (e) {
            return { tag: "err", val: { tag: "str", val: `Date parse error: ${String(e)}` } };
          }
        }
        return { tag: "err", val: { tag: "str", val: "Invalid arguments" } };
      }

      // YAML Functions (2) — v4.3 Extension
      case "yaml_parse": {
        if (args[0].tag === "str") {
          try {
            const yaml = args[0].val;
            const obj = this.parseYAML(yaml);
            return { tag: "ok", val: this.jsonToValue(obj) };
          } catch (e) {
            return { tag: "err", val: { tag: "str", val: `YAML parse error: ${String(e)}` } };
          }
        }
        return { tag: "err", val: { tag: "str", val: "Invalid arguments" } };
      }
      case "yaml_stringify": {
        try {
          const yamlStr = this.valueToYAML(args[0], 0);
          return { tag: "str", val: yamlStr };
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `YAML stringify error: ${String(e)}` } };
        }
      }

      case "http_server_create": {
        const port = (args[0] as any).val;
        try {
          const result = await this.httpServerCreateAsync(port);
          return result;
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `HTTP server error: ${String(e)}` } };
        }
      }

      case "http_server_accept": {
        const serverId = (args[0] as any).val;
        try {
          const result = await this.httpServerAcceptAsync(serverId);
          return result;
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `HTTP accept error: ${String(e)}` } };
        }
      }

      case "http_server_respond": {
        const serverId = (args[0] as any).val;
        const reqId = (args[1] as any).val;
        const status = (args[2] as any).val;
        const headersJson = (args[3] as any).val;
        const body = this.valueToString(args[4]);
        try {
          await this.httpServerRespondAsync(serverId, reqId, status, headersJson, body);
          return { tag: "void" };
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `HTTP respond error: ${String(e)}` } };
        }
      }

      case "exec_command": {
        const cmd = (args[0] as any).val;
        let cmdArgs: string[] = [];
        if (args[1].tag === "arr") {
          cmdArgs = (args[1] as any).val.map((v: Value) => this.valueToString(v));
        }
        try {
          const result = await this.execCommandAsync(cmd, cmdArgs);
          return result;
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `Command execution error: ${String(e)}` } };
        }
      }

      case "char_code": {
        // char_code("A") → 65 (문자의 ASCII 코드)
        const s = (args[0] as any).val as string;
        if (s.length === 0) {
          return { tag: "i32", val: 0 };
        }
        return { tag: "i32", val: s.charCodeAt(0) };
      }

      case "chr": {
        // chr(65) → "A" (ASCII 코드를 문자로)
        const n = (args[0] as any).val as number;
        return { tag: "str", val: String.fromCharCode(n) };
      }

      case "parse_int": {
        // parse_int("42") → Ok(42), parse_int("abc") → Err("Invalid number")
        const numStr = this.valueToString(args[0]);
        const parsed = parseInt(numStr, 10);
        if (isNaN(parsed)) {
          return { tag: "err", val: { tag: "str", val: "Invalid number" } };
        }
        return { tag: "ok", val: { tag: "i32", val: parsed } };
      }

      case "first": {
        // first([1,2,3]) → Some(1), first([]) → None
        if (args[0].tag === "arr") {
          const arr = args[0].val;
          if (arr.length === 0) {
            return { tag: "none" };
          }
          return { tag: "some", val: arr[0] };
        }
        return { tag: "none" };
      }

      case "last": {
        // last([1,2,3]) → Some(3), last([]) → None
        if (args[0].tag === "arr") {
          const arr = args[0].val;
          if (arr.length === 0) {
            return { tag: "none" };
          }
          return { tag: "some", val: arr[arr.length - 1] };
        }
        return { tag: "none" };
      }

      case "append_file": {
        // append_file(filepath, content) → Ok() or Err(msg)
        const filepath = this.valueToString(args[0]);
        const content = this.valueToString(args[1]);
        try {
          fs.appendFileSync(filepath, content);
          return { tag: "ok", val: { tag: "void" } };
        } catch (e) {
          return { tag: "err", val: { tag: "str", val: `File append error: ${String(e)}` } };
        }
      }

      case "exists": {
        // exists(filepath) → bool
        const filepath = this.valueToString(args[0]);
        try {
          const result = fs.existsSync(filepath);
          return { tag: "bool", val: result };
        } catch (e) {
          return { tag: "bool", val: false };
        }
      }

      default:
        throw new Error(`panic: unknown builtin '${name}'`);
    }
  }

  // ============================================================
  // 유틸리티
  // ============================================================

  private readI32(actor: Actor): number {
    const b0 = this.chunk.code[actor.ip++];
    const b1 = this.chunk.code[actor.ip++];
    const b2 = this.chunk.code[actor.ip++];
    const b3 = this.chunk.code[actor.ip++];
    return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
  }

  private readF64(actor: Actor): number {
    const buf = new ArrayBuffer(8);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < 8; i++) bytes[i] = this.chunk.code[actor.ip++];
    return new Float64Array(buf)[0];
  }

  private valueToString(v: Value): string {
    switch (v.tag) {
      case "i32": case "f64": return String(v.val);
      case "str": return v.val;
      case "bool": return v.val ? "true" : "false";
      case "void": return "void";
      case "none": return "None";
      case "arr": return `[${v.val.map((e) => this.valueToString(e)).join(", ")}]`;
      case "struct": {
        const entries = [...v.fields.entries()].map(([k, val]) => `${k}: ${this.valueToString(val)}`);
        return `{ ${entries.join(", ")} }`;
      }
      case "ok": return `Ok(${this.valueToString(v.val)})`;
      case "err": return `Err(${this.valueToString(v.val)})`;
      case "some": return `Some(${this.valueToString(v.val)})`;
      case "chan": return `channel(${v.id})`;
      case "db": return `database(${v.id})`;
    }
  }

  private valuesEqual(a: Value, b: Value): boolean {
    if (a.tag !== b.tag) return false;
    if (a.tag === "void" && b.tag === "void") return true;
    if (a.tag === "none" && b.tag === "none") return true;
    if ("val" in a && "val" in b) return (a as any).val === (b as any).val;
    return false;
  }

  private deepClone(v: Value): Value {
    switch (v.tag) {
      case "arr": return { tag: "arr", val: v.val.map((e) => this.deepClone(e)) };
      case "struct": {
        const fields = new Map<string, Value>();
        for (const [k, val] of v.fields) fields.set(k, this.deepClone(val));
        return { tag: "struct", fields };
      }
      case "ok": return { tag: "ok", val: this.deepClone(v.val) };
      case "err": return { tag: "err", val: this.deepClone(v.val) };
      case "some": return { tag: "some", val: this.deepClone(v.val) };
      default: return v; // Copy 타입은 그대로
    }
  }

  // ============================================================
  // JSON Conversion (Phase 7)
  // ============================================================

  private jsonToValue(obj: any): Value {
    if (obj === null) return { tag: "none" };
    if (typeof obj === "boolean") return { tag: "bool", val: obj };
    if (typeof obj === "number") return { tag: "i32", val: Math.floor(obj) };
    if (typeof obj === "string") return { tag: "str", val: obj };
    if (Array.isArray(obj)) {
      return { tag: "arr", val: obj.map((v) => this.jsonToValue(v)) };
    }
    if (typeof obj === "object") {
      const fields = new Map<string, Value>();
      for (const [k, v] of Object.entries(obj)) {
        fields.set(k, this.jsonToValue(v));
      }
      return { tag: "struct", fields };
    }
    return { tag: "void" };
  }

  private valueToJSON(v: Value): any {
    switch (v.tag) {
      case "i32":
      case "f64":
        return v.val;
      case "bool":
        return v.val;
      case "str":
        return v.val;
      case "arr":
        return v.val.map((item) => this.valueToJSON(item));
      case "struct":
        const obj: any = {};
        for (const [k, val] of v.fields.entries()) {
          obj[k] = this.valueToJSON(val);
        }
        return obj;
      case "ok":
        return this.valueToJSON(v.val);
      case "err":
        return { error: this.valueToJSON(v.val) };
      case "some":
        return this.valueToJSON(v.val);
      case "none":
        return null;
      default:
        return null;
    }
  }

  private parseYAML(yaml: string): any {
    const lines = yaml.split("\n").map((l) => l);
    const result: any = {};
    let currentObj: any = result;
    const stack: any[] = [result];
    let lastIndent = -1;

    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith("#")) continue;

      const indent = line.length - line.trimLeft().length;
      const trimmed = line.trim();

      // Handle indent changes
      if (indent > lastIndent) {
        // Push to stack
        if (lastIndent >= 0 && typeof currentObj === "object") {
          stack.push(currentObj);
        }
      } else if (indent < lastIndent) {
        // Pop from stack
        while (stack.length > 1 && indent < lastIndent) {
          stack.pop();
          currentObj = stack[stack.length - 1];
          lastIndent -= 2;
        }
      }

      lastIndent = indent;

      // Parse key: value
      if (trimmed.includes(":")) {
        const colonIdx = trimmed.indexOf(":");
        const key = trimmed.substring(0, colonIdx).trim();
        const valueStr = trimmed.substring(colonIdx + 1).trim();

        if (valueStr === "") {
          // Nested object
          currentObj[key] = {};
          currentObj = currentObj[key];
        } else {
          // Scalar value
          currentObj[key] = this.parseYAMLValue(valueStr);
        }
      }
    }

    return result;
  }

  private parseYAMLValue(valueStr: string): any {
    if (valueStr === "true") return true;
    if (valueStr === "false") return false;
    if (valueStr === "null") return null;
    if (!isNaN(Number(valueStr))) return Number(valueStr);
    if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
      return valueStr.slice(1, -1).replace(/\\"/g, '"');
    }
    if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
      return valueStr.slice(1, -1);
    }
    return valueStr;
  }

  private valueToYAML(v: Value, indent: number = 0): string {
    const indentStr = "  ".repeat(indent);
    const nextIndentStr = "  ".repeat(indent + 1);

    switch (v.tag) {
      case "i32":
      case "f64":
      case "bool":
        return String((v as any).val);
      case "str":
        return `"${(v as any).val.replace(/"/g, '\\"')}"`;
      case "arr": {
        const items = (v as any).val as Value[];
        if (items.length === 0) return "[]";
        return "[\n" + items.map((item) => nextIndentStr + this.valueToYAML(item, indent + 1)).join(",\n") + "\n" + indentStr + "]";
      }
      case "struct": {
        const fields = (v as any).fields as Map<string, Value>;
        const lines: string[] = [];
        for (const [key, val] of fields) {
          lines.push(`${key}: ${this.valueToYAML(val, indent + 1)}`);
        }
        return lines.join("\n" + nextIndentStr);
      }
      case "ok":
        return this.valueToYAML((v as any).val, indent);
      case "err":
        return `error: ${this.valueToYAML((v as any).val, indent)}`;
      case "some":
        return this.valueToYAML((v as any).val, indent);
      case "none":
        return "null";
      default:
        return "null";
    }
  }

  private parseCsvRow(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells;
  }

  // ============================================================
  // HTTP Client Implementation (Phase 2) — fetch based (async)
  // ============================================================

  private async httpGetAsync(url: string): Promise<Value> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const body = await res.text();
      return { tag: "ok", val: { tag: "str", val: body } };
    } catch (e: any) {
      return { tag: "err", val: { tag: "str", val: e.message } };
    }
  }

  private async httpPostAsync(url: string, body: string): Promise<Value> {
    try {
      const res = await fetch(url, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(5000),
      });
      const responseBody = await res.text();
      return { tag: "ok", val: { tag: "str", val: responseBody } };
    } catch (e: any) {
      return { tag: "err", val: { tag: "str", val: e.message } };
    }
  }

  private async httpPostJsonAsync(url: string, jsonBody: string): Promise<Value> {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody,
        signal: AbortSignal.timeout(5000),
      });
      const responseBody = await res.text();
      return { tag: "ok", val: { tag: "str", val: responseBody } };
    } catch (e: any) {
      return { tag: "err", val: { tag: "str", val: e.message } };
    }
  }

  private async fetchAsync(url: string, method: string, headers: Value | null, body: string | null): Promise<Value> {
    try {
      const options: any = { method, signal: AbortSignal.timeout(5000) };

      if (headers && headers.tag === "struct") {
        options.headers = {};
        for (const [k, v] of headers.fields) {
          options.headers[k] = this.valueToString(v);
        }
      }

      if (body) {
        options.body = body;
      }

      const res = await fetch(url, options);
      const responseBody = await res.text();
      return { tag: "ok", val: { tag: "str", val: responseBody } };
    } catch (e: any) {
      return { tag: "err", val: { tag: "str", val: e.message } };
    }
  }

  // ============================================================
  // HTTP Server Builtins
  // ============================================================

  private async httpServerCreateAsync(port: number): Promise<Value> {
    try {
      const express = (await import("express")).default;
      const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));

      const requestQueue: Array<{ reqId: string; method: string; path: string; headers: any; body: any; query: any }> = [];
      const responseMap: Map<string, any> = new Map(); // reqId -> res
      let nextReqId = 0;

      app.all("*", (req: any, res: any) => {
        const reqId = String(nextReqId++);
        const reqObj = {
          reqId,
          method: req.method,
          path: req.path,
          headers: req.headers,
          body: req.body || {},
          query: req.query || {},
        };
        requestQueue.push(reqObj);
        responseMap.set(reqId, res);
      });

      const serverId = this.nextServerId++;
      this.httpServers.set(serverId, {
        app,
        server: null,
        requestQueue,
        responseMap,
        port,
      });

      // Start server
      const server = app.listen(port);
      const serverData = this.httpServers.get(serverId)!;
      serverData.server = server;

      return { tag: "ok", val: { tag: "i32", val: serverId } };
    } catch (e: any) {
      return { tag: "err", val: { tag: "str", val: e.message } };
    }
  }

  private async httpServerAcceptAsync(serverId: number): Promise<Value> {
    const serverData = this.httpServers.get(serverId);
    if (!serverData) {
      return { tag: "err", val: { tag: "str", val: "Server not found" } };
    }

    // Poll for requests
    while (serverData.requestQueue.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const req = serverData.requestQueue.shift()!;

    // Return as JSON string that can be parsed by FreeLang
    const reqJson = JSON.stringify({
      id: req.reqId,
      method: req.method,
      path: req.path,
      query: req.query,
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });

    return { tag: "ok", val: { tag: "str", val: reqJson } };
  }

  private async httpServerRespondAsync(serverId: number, reqId: string, status: number, headersJson: string, body: string): Promise<void> {
    const serverData = this.httpServers.get(serverId);
    if (!serverData) throw new Error("Server not found");

    const res = serverData.responseMap.get(reqId);
    if (!res) throw new Error(`Request ${reqId} not found`);

    try {
      const headers = JSON.parse(headersJson);
      res.status(status);
      Object.entries(headers).forEach(([k, v]: [string, any]) => {
        res.set(k, v);
      });
      res.send(body);
    } finally {
      serverData.responseMap.delete(reqId);
    }
  }

  private async execCommandAsync(cmd: string, args: string[]): Promise<Value> {
    try {
      const { spawn } = await import("child_process");
      const proc = spawn(cmd, args);

      let stdout = "";
      let stderr = "";

      return new Promise((resolve) => {
        proc.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        proc.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        proc.on("close", (code) => {
          if (code === 0) {
            resolve({ tag: "ok", val: { tag: "str", val: stdout } });
          } else {
            resolve({ tag: "err", val: { tag: "str", val: stderr || `Exit code ${code}` } });
          }
        });

        proc.on("error", (err) => {
          resolve({ tag: "err", val: { tag: "str", val: err.message } });
        });
      });
    } catch (e: any) {
      return { tag: "err", val: { tag: "str", val: e.message } };
    }
  }
}
