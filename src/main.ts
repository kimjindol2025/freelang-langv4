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
import { SQLiteDB, MigrationManager } from "./db";

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

  // 마이그레이션 CLI
  if (args[0] === "migrate") {
    const cmd = args[1];
    const dbPath = args[2] || "./app.db";
    const migrationsDir = args[3] || "./migrations";

    const db = new SQLiteDB(dbPath);
    const manager = new MigrationManager(db, migrationsDir);

    try {
      if (cmd === "up") {
        await db.init();
        await manager.up();
        await db.close();
      } else if (cmd === "down") {
        await db.init();
        await manager.down();
        await db.close();
      } else if (cmd === "status") {
        await db.init();
        const rows = await manager.status();
        if (rows.length === 0) {
          console.log("적용된 마이그레이션이 없습니다.");
        } else {
          console.log("적용된 마이그레이션:");
          for (const row of rows) {
            console.log(`  - ${row.name} (${row.applied_at})`);
          }
        }
        await db.close();
      } else {
        console.error(`unknown migrate command: ${cmd}`);
        console.log("Usage:");
        console.log("  freelang migrate up [db_path] [migrations_dir]");
        console.log("  freelang migrate down [db_path] [migrations_dir]");
        console.log("  freelang migrate status [db_path] [migrations_dir]");
        process.exit(1);
      }
    } catch (e: any) {
      console.error(`migrate error: ${e.message}`);
      process.exit(1);
    }
    return;
  }

  // 패키지 매니저 CLI
  if (args[0] === "init") {
    const { initProject } = await import("./pkg/init");
    await initProject(args[1] || "my-app");
    return;
  }

  if (args[0] === "install") {
    const { installPackage } = await import("./pkg/install");
    await installPackage(args[1], process.cwd());
    return;
  }

  if (args[0] === "run") {
    const { runScript } = await import("./pkg/run");
    await runScript(args[1], process.cwd());
    return;
  }

  if (args[0] === "list-packages") {
    const { listPackages } = await import("./pkg/registry");
    listPackages();
    return;
  }

  if (args[0] === "search-packages") {
    const { searchPackages } = await import("./pkg/registry");
    searchPackages(args[1] || "");
    return;
  }

  // 웹 REPL
  if (args[0] === "--web-repl") {
    const portIdx = args.indexOf("--port");
    const port = portIdx >= 0 ? parseInt(args[portIdx + 1]) : 3000;
    const { startWebRepl } = await import("./web-repl/server");
    await startWebRepl(port);
    return;
  }

  // 도움말
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("🦁 FreeLang v4.3 — AI-First Programming Language");
    console.log("");
    console.log("Usage:");
    console.log("  freelang <file.fl> [options]      파일 실행");
    console.log("  freelang --repl                    대화형 쉘 시작");
    console.log("  freelang --web-repl [--port PORT]  웹 REPL 시작");
    console.log("");
    console.log("Project Management:");
    console.log("  freelang init [name]               새 프로젝트 생성");
    console.log("  freelang install <pkg>             패키지 설치");
    console.log("  freelang run <script>              freelang.toml 스크립트 실행");
    console.log("  freelang list-packages             전체 패키지 목록");
    console.log("  freelang search-packages <query>   패키지 검색");
    console.log("");
    console.log("Database:");
    console.log("  freelang migrate <cmd> [args]      마이그레이션 관리");
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
