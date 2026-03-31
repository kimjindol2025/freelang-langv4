// SandboxedREPL — Secure execution with restrictions

import { Lexer } from "../lexer";
import { Parser } from "../parser";
import { TypeChecker } from "../checker";
import { Compiler } from "../compiler";
import { VM } from "../vm";
import { Chunk } from "../compiler";

// Forbidden builtins in sandboxed environment
const FORBIDDEN_BUILTINS = new Set([
  "read_file",
  "write_file",
  "sqlite_open",
  "pg_connect",
  "mysql_connect",
]);

export class SandboxedREPL {
  private output: string[] = [];
  private history: string[] = [];
  private vm: VM;

  constructor() {
    this.vm = new VM();
  }

  async eval(code: string): Promise<void> {
    this.output = [];

    // Parse and compile
    try {
      const lexer = new Lexer(code);
      const lexResult = lexer.tokenize();
      const tokens = lexResult.tokens;

      const parser = new Parser(tokens);
      const parseResult = parser.parse();
      const ast = parseResult.program;

      // Check for forbidden builtins
      this.checkForbiddenBuiltins(ast);

      // Type check
      const checker = new TypeChecker();
      checker.check(ast);

      // Compile
      const compiler = new Compiler();
      const chunk: Chunk = compiler.compile(ast);

      // Execute with timeout
      const result = await this.vm.run(chunk);

      if (result.error) {
        this.output.push(`Error: ${result.error}`);
      } else {
        this.output.push(...result.output);
      }

      this.history.push(code);
    } catch (err: any) {
      this.output.push(`Error: ${err.message || String(err)}`);
    }
  }

  private checkForbiddenBuiltins(ast: any): void {
    const code = JSON.stringify(ast);
    for (const builtin of FORBIDDEN_BUILTINS) {
      if (code.includes(`"${builtin}"`)) {
        throw new Error(`Forbidden builtin: ${builtin}`);
      }
    }
  }

  getOutput(): string {
    return this.output.join("\n");
  }

  getHistory(): string[] {
    return this.history;
  }

  clear(): void {
    this.output = [];
    this.history = [];
  }
}
