#!/usr/bin/env node
// FreeLang v4 — CLI Entry Point

import * as fs from "fs";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";
import { Compiler } from "./compiler";
import { VM } from "./vm";
import { IRGen } from "./ir-gen";
import { REPL } from "./repl";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 버전 확인
  if (args[0] === "--version" || args[0] === "-v") {
    console.log("FreeLang 4.1.0");
    process.exit(0);
  }

  // REPL 모드
  if (args[0] === "--repl" || args[0] === "-i") {
    const repl = new REPL();
    await repl.start();
    return;
  }

  // 도움말
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("🦁 FreeLang v4.1 — AI-First Programming Language");
    console.log("");
    console.log("Usage:");
    console.log("  freelang <file.fl> [options]  파일 실행");
    console.log("  freelang --repl               대화형 쉘 시작");
    console.log("");
    console.log("Options:");
    console.log("  --no-check   타입 체크 건너뛰기");
    console.log("  --dump-bc    바이트코드 덤프");
    console.log("  --dump-ir    IR(중간 표현) 덤프");
    console.log("  --use-ir     IR 경로로 컴파일");
    console.log("  --help, -h   도움말 표시");
    console.log("  --version    버전 표시");
    process.exit(0);
  }

  const file = args[0];
  const noCheck = args.includes("--no-check");
  const dumpBc = args.includes("--dump-bc");
  const dumpIr = args.includes("--dump-ir");
  const useIr = args.includes("--use-ir") || dumpIr;

  // 파일 읽기
  let source: string;
  try {
    source = fs.readFileSync(file, "utf-8");
  } catch {
    console.error(`error: cannot read file '${file}'`);
    process.exit(1);
  }

  // 1. Lexer
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) {
    for (const e of lexErrors) {
      console.error(`${file}:${e.line}: lex error: ${e.message}`);
    }
    process.exit(1);
  }

  // 2. Parser
  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) {
    for (const e of parseErrors) {
      console.error(`${file}:${e.line}: parse error: ${e.message}`);
    }
    process.exit(1);
  }

  // 3. TypeChecker (optional)
  if (!noCheck) {
    const checkErrors = new TypeChecker().check(program);
    if (checkErrors.length > 0) {
      for (const e of checkErrors) {
        console.error(`${file}:${e.line}: type error: ${e.message}`);
      }
      process.exit(1);
    }
  }

  // 4. Compiler (IR 경로 vs 기존 경로)
  let chunk;
  if (useIr) {
    const irProg = new IRGen().generate(program);  // AST → IR
    if (dumpIr) {
      console.log(JSON.stringify(irProg, null, 2));
      process.exit(0);
    }
    chunk = new Compiler().compileIR(irProg);      // IR → Chunk
  } else {
    chunk = new Compiler().compile(program);       // 기존 경로 유지
  }

  if (dumpBc) {
    console.log(`--- bytecode (${chunk.code.length} bytes, ${chunk.functions.length} functions) ---`);
    console.log(`constants: ${JSON.stringify(chunk.constants)}`);
    for (const fn of chunk.functions) {
      console.log(`fn ${fn.name}(arity=${fn.arity}) @ offset ${fn.offset}`);
    }
    process.exit(0);
  }

  // 5. VM 실행
  const { output, error } = await new VM().run(chunk);

  for (const line of output) {
    console.log(line);
  }

  if (error) {
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
