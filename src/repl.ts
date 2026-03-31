// FreeLang v4.1 — REPL (Read-Eval-Print Loop)
// 대화형 쉘 구현

import * as readline from "readline";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";
import { Compiler } from "./compiler";
import { VM } from "./vm";

export class REPL {
  private rl: readline.Interface;
  private vm: VM;
  private globals: Map<string, any> = new Map();
  private history: string[] = [];
  private multiLineBuffer: string = "";
  private isMultiLine: boolean = false;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: process.stdout.isTTY !== false,
    });

    this.vm = new VM();
  }

  async start(): Promise<void> {
    console.log("🦁 FreeLang v4.1 REPL");
    console.log('입력: "help" (도움말), "exit" (종료), "history" (이력)\n');

    while (true) {
      try {
        const line = await this.readline(this.isMultiLine ? "... " : "> ");

        if (!line) continue;

        // 특수 명령어 처리
        if (this.handleCommand(line)) {
          continue;
        }

        // 멀티 라인 처리
        if (line.endsWith("\\")) {
          this.multiLineBuffer += line.slice(0, -1) + "\n";
          this.isMultiLine = true;
          continue;
        }

        const fullCode = this.multiLineBuffer + line;
        this.multiLineBuffer = "";
        this.isMultiLine = false;

        // 실행
        await this.eval(fullCode);
        this.history.push(fullCode);
      } catch (e: any) {
        console.error(`❌ ${e.message}`);
      }
    }
  }

  private handleCommand(input: string): boolean {
    const trimmed = input.trim();

    switch (trimmed) {
      case "exit":
      case "quit":
        console.log("👋 Bye!");
        process.exit(0);

      case "help":
        this.printHelp();
        return true;

      case "history":
        this.printHistory();
        return true;

      case "clear":
        console.clear();
        return true;

      default:
        return false;
    }
  }

  private async eval(code: string): Promise<void> {
    try {
      // 1. Lexer
      const lexer = new Lexer(code);
      const { tokens, errors: lexErrors } = lexer.tokenize();

      if (lexErrors.length > 0) {
        console.error(`❌ Lex error: ${lexErrors[0].message}`);
        return;
      }

      // 2. Parser
      const parser = new Parser(tokens);
      const { program, errors: parseErrors } = parser.parse();

      if (parseErrors.length > 0) {
        console.error(`❌ Parse error: ${parseErrors[0].message}`);
        return;
      }

      // 3. Type Checker
      const checker = new TypeChecker();
      const checkErrors = checker.check(program);

      if (checkErrors.length > 0) {
        console.error(`❌ Type error: ${checkErrors[0].message}`);
        return;
      }

      // 4. Compiler
      const compiler = new Compiler();
      const chunk = compiler.compile(program);

      // 5. VM Execution
      const { output, error } = await this.vm.run(chunk);

      if (error) {
        console.error(`❌ Runtime error: ${error}`);
        return;
      }

      // 출력
      for (const line of output) {
        console.log(line);
      }
    } catch (e: any) {
      console.error(`❌ ${e.message}`);
    }
  }

  private printHelp(): void {
    console.log(`
📚 FreeLang REPL 명령어:

특수 명령:
  exit, quit          프로그램 종료
  help                이 도움말 표시
  history             명령어 이력 표시
  clear               화면 지우기

멀티라인 입력:
  마지막에 \\ 추가하면 다음 줄에서 계속 입력 가능
  예: var x = 10 \\
      var y = 20 \\
      println(x + y)

예제:
  > var x = 10
  > fn add(a, b) { a + b }
  > add(x, 5)
  15
    `);
  }

  private printHistory(): void {
    if (this.history.length === 0) {
      console.log("이력이 없습니다");
      return;
    }

    console.log("\n📜 명령어 이력:");
    this.history.forEach((cmd, i) => {
      console.log(`${i + 1}. ${cmd}`);
    });
    console.log();
  }

  private readline(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }
}

// REPL 실행
if (require.main === module) {
  const repl = new REPL();
  repl.start().catch(console.error);
}
