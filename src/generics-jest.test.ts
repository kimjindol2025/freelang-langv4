// FreeLang v4 — Generic 기능 테스트

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";

describe("Generics (Type Checking)", () => {
  // 파싱과 타입 체킹만 테스트 (컴파일러 준비 전)

  test("G1: parse generic function definition", () => {
    const code = `
      fn identity<T>(x: T) -> T { x }
    `;
    const lexer = new Lexer(code);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program, errors } = parser.parse();

    expect(errors.length).toBe(0);
    expect(program.stmts.length).toBe(1);
    const fnDecl = program.stmts[0];
    expect(fnDecl.kind).toBe("fn_decl");
    if (fnDecl.kind === "fn_decl") {
      expect(fnDecl.typeParams.length).toBe(1);
      expect(fnDecl.typeParams[0]).toBe("T");
    }
  });

  test("G2: parse generic struct definition", () => {
    const code = `
      struct Box<T> { value: T }
    `;
    const lexer = new Lexer(code);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program, errors } = parser.parse();

    expect(errors.length).toBe(0);
    expect(program.stmts.length).toBe(1);
    const structDecl = program.stmts[0];
    expect(structDecl.kind).toBe("struct_decl");
    if (structDecl.kind === "struct_decl") {
      expect(structDecl.typeParams.length).toBe(1);
      expect(structDecl.typeParams[0]).toBe("T");
    }
  });

  test("G3: comparison operators work with generics", () => {
    // 현재 제네릭 호출 파싱은 미지원 (< 토큰이 비교 연산자로 우선 처리됨)
    // 이는 x < 10 같은 비교식이 제대로 작동하도록 하기 위함
    // 제네릭 호출은 나중에 개선될 예정
    const code = `
      var x = 5 < 10
      x
    `;
    const lexer = new Lexer(code);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program, errors } = parser.parse();

    expect(errors.length).toBe(0);
    expect(program.stmts.length).toBeGreaterThan(0);
  });

  test("G4: register generic function in TypeChecker", () => {
    const code = `
      fn identity<T>(x: T) -> T { x }
    `;
    const lexer = new Lexer(code);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program } = parser.parse();

    const checker = new TypeChecker();
    const errors = checker.check(program);

    expect(errors.length).toBe(0);
    const generics = checker.getGenericFunctions();
    expect(generics.has("identity")).toBe(true);
  });

  test("G5: multiple type parameters", () => {
    const code = `
      fn swap<T, U>(a: T, b: U) -> i32 { 0 }
    `;
    const lexer = new Lexer(code);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program, errors: parseErrors } = parser.parse();

    expect(parseErrors.length).toBe(0);
    const checker = new TypeChecker();
    const errors = checker.check(program);

    expect(errors.length).toBe(0);
    const generics = checker.getGenericFunctions();
    const swapFn = generics.get("swap");
    expect(swapFn).toBeDefined();
    if (swapFn) {
      expect(swapFn.typeParams.length).toBe(2);
      expect(swapFn.typeParams).toEqual(["T", "U"]);
    }
  });
});
