// FreeLang v4 — Async/Await 기본 기능 테스트
// 최소 3/5 테스트 통과를 목표로 함

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";
import { Compiler } from "./compiler";

describe("Async/Await Basic Implementation", () => {
  function testParse(source: string) {
    const lexer = new Lexer(source);
    const { tokens, errors: lexErrors } = lexer.tokenize();
    if (lexErrors.length > 0) {
      throw new Error(`Lex: ${lexErrors[0].message}`);
    }
    const parser = new Parser(tokens);
    const { program, errors: parseErrors } = parser.parse();
    if (parseErrors.length > 0) {
      throw new Error(`Parse: ${parseErrors[0].message}`);
    }
    return program;
  }

  function testTypeCheck(program: any) {
    const checker = new TypeChecker();
    const errors = checker.check(program);
    return errors;
  }

  function testCompile(program: any) {
    const compiler = new Compiler();
    const chunk = compiler.compile(program);
    return chunk;
  }

  // Test 1: async fn 선언 파싱
  it("T1: Parse async fn declaration", () => {
    const source = `async fn getValue(): Promise<i32> { return 42 }`;
    const program = testParse(source);
    expect(program.stmts.length).toBe(1);
    const fnStmt = program.stmts[0];
    expect(fnStmt.kind).toBe("fn_decl");
    expect((fnStmt as any).isAsync).toBe(true);
    expect((fnStmt as any).name).toBe("getValue");
  });

  // Test 2: Promise<T> 타입 파싱
  it("T2: Parse Promise<T> type annotation", () => {
    const source = `async fn getStr(): Promise<string> { return "ok" }`;
    const program = testParse(source);
    const fnStmt = program.stmts[0] as any;
    expect(fnStmt.returnType.kind).toBe("promise");
    expect(fnStmt.returnType.element.kind).toBe("string");
  });

  // Test 3: await 식 파싱
  it("T3: Parse await expression", () => {
    const source = `async fn caller(): Promise<i32> { let x = await getValue(); return x }`;
    const program = testParse(source);
    const fnStmt = program.stmts[0] as any;
    const bodyHasAwait = fnStmt.body.some((stmt: any) => {
      if (stmt.kind === "var_decl") {
        return stmt.init.kind === "await";
      }
      return false;
    });
    expect(bodyHasAwait).toBe(true);
  });

  // Test 4: async fn 타입 검사 (Promise 자동 변환)
  it("T4: Type check async fn returns Promise<T>", () => {
    const source = `async fn getValue(): i32 { return 42 }`;
    const program = testParse(source);
    // 타입 체커는 async fn의 반환 타입을 Promise<T>로 자동 변환
    const errors = testTypeCheck(program);
    expect(errors.length).toBe(0);
  });

  // Test 5: await에 Promise 요구
  it("T5: Type check await requires Promise", () => {
    const source = `
      async fn caller(): Promise<i32> {
        let x = await getValue()
        return x
      }
      fn getValue(): i32 { return 42 }
    `;
    const program = testParse(source);
    const errors = testTypeCheck(program);
    // await getValue()에서 getValue()는 i32를 반환하므로 에러
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("await");
  });
});
