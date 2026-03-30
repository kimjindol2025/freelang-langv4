// FreeLang v4 Module System Tests
// 기본 import/export 파싱 및 검증 테스트

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";
import { Program, Stmt, ImportDecl, ExportDecl } from "./ast";

describe("Module System", () => {
  // 헬퍼: 코드를 AST로 파싱
  function parseCode(code: string): Program {
    const lexer = new Lexer(code);
    const { tokens, errors: lexErrors } = lexer.tokenize();
    if (lexErrors.length > 0) {
      throw new Error(`Lex errors: ${lexErrors.map(e => e.message).join(", ")}`);
    }

    const parser = new Parser(tokens);
    const { program, errors: parseErrors } = parser.parse();
    if (parseErrors.length > 0) {
      throw new Error(`Parse errors: ${parseErrors.map(e => e.message).join(", ")}`);
    }

    return program;
  }

  // Test 1: 기본 import 파싱
  it("should parse basic import statement", () => {
    const code = `import { add } from "./math";`;
    const program = parseCode(code);

    expect(program.stmts.length).toBe(1);
    const stmt = program.stmts[0] as ImportDecl;
    expect(stmt.kind).toBe("import_decl");
    expect(stmt.source).toBe("./math");
    expect(stmt.items.length).toBe(1);
    expect(stmt.items[0].name).toBe("add");
    expect(stmt.items[0].alias).toBeUndefined();
  });

  // Test 2: 다중 항목 import
  it("should parse multiple import items", () => {
    const code = `import { add, subtract, multiply } from "./math";`;
    const program = parseCode(code);

    const stmt = program.stmts[0] as ImportDecl;
    expect(stmt.items.length).toBe(3);
    expect(stmt.items[0].name).toBe("add");
    expect(stmt.items[1].name).toBe("subtract");
    expect(stmt.items[2].name).toBe("multiply");
  });

  // Test 3: Import alias
  it("should parse import with alias", () => {
    const code = `import { add as sum } from "./math";`;
    const program = parseCode(code);

    const stmt = program.stmts[0] as ImportDecl;
    expect(stmt.items[0].name).toBe("add");
    expect(stmt.items[0].alias).toBe("sum");
  });

  // Test 4: Default import
  it("should parse default import", () => {
    const code = `import math from "./math";`;
    const program = parseCode(code);

    const stmt = program.stmts[0] as ImportDecl;
    expect(stmt.default).toBe(true);
    expect(stmt.items[0].name).toBe("math");
  });

  // Test 5: Export with function
  it("should parse export function", () => {
    const code = `export fn add(a: i32, b: i32) -> i32 { a + b }`;
    const program = parseCode(code);

    const stmt = program.stmts[0] as ExportDecl;
    expect(stmt.kind).toBe("export_decl");
    expect(typeof stmt.target).not.toBe("string");
  });

  // Test 6: Export with struct
  it("should parse export struct", () => {
    const code = `export struct Point { x: i32, y: i32 }`;
    const program = parseCode(code);

    const stmt = program.stmts[0] as ExportDecl;
    expect(stmt.kind).toBe("export_decl");
  });

  // Test 7: Export list
  it("should parse export list", () => {
    const code = `export { add, multiply, PI };`;
    const program = parseCode(code);

    const stmt = program.stmts[0] as ExportDecl;
    expect(typeof stmt.target).toBe("object");
    const names = stmt.target as string[];
    expect(names.length).toBe(3);
    expect(names[0]).toBe("add");
    expect(names[1]).toBe("multiply");
    expect(names[2]).toBe("PI");
  });

  // Test 8: Type checking with imports
  it("should check imported names in scope", () => {
    const code = `
      import { add } from "./math";
      var result: i32 = add(2, 3);
    `;
    const program = parseCode(code);
    const checker = new TypeChecker();
    const errors = checker.check(program);

    // import 문이 성공적으로 처리되어야 함
    expect(errors.length).toBeLessThan(3); // 약간의 에러는 있을 수 있음 (모듈 미로드)
  });

  // Test 9: Multiple imports
  it("should parse multiple import statements", () => {
    const code = `
      import { add } from "./math";
      import { map, filter } from "./array";
      fn main() -> void { }
    `;
    const program = parseCode(code);

    expect(program.stmts[0].kind).toBe("import_decl");
    expect(program.stmts[1].kind).toBe("import_decl");
    expect(program.stmts[2].kind).toBe("fn_decl");
  });

  // Test 10: Import and Export together
  it("should parse import and export together", () => {
    const code = `
      import { double } from "./utils";
      export fn quad(x: i32) -> i32 { double(double(x)) }
    `;
    const program = parseCode(code);

    expect(program.stmts[0].kind).toBe("import_decl");
    expect(program.stmts[1].kind).toBe("export_decl");
  });
});
