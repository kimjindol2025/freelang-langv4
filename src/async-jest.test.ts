// FreeLang v4 — Async/Await 기본 테스트
// Promise 기반 구현

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";
import { Compiler } from "./compiler";

describe("Async/Await Basic Support", () => {
  function compile(source: string) {
    const lexer = new Lexer(source);
    const { tokens, errors: lexErrors } = lexer.tokenize();
    if (lexErrors.length > 0) {
      throw new Error(`Lex errors: ${lexErrors.map(e => e.message).join(", ")}`);
    }

    const parser = new Parser(tokens);
    const { program, errors: parseErrors } = parser.parse();
    if (parseErrors.length > 0) {
      throw new Error(`Parse errors: ${parseErrors.map(e => e.message).join(", ")}`);
    }

    const checker = new TypeChecker();
    const checkErrors = checker.check(program);
    if (checkErrors.length > 0) {
      throw new Error(`Type errors: ${checkErrors.map(e => e.message).join(", ")}`);
    }

    const compiler = new Compiler();
    const chunk = compiler.compile(program);
    return chunk;
  }

  // T1: 기본 async 함수 선언
  test("T1: Basic async function declaration", () => {
    const source = `
      async fn simple(): Promise<i32> {
        return 42
      }
    `;
    expect(() => compile(source)).not.toThrow();
  });

  // T2: async 함수에서 값 반환
  test("T2: Async function with return value", () => {
    const source = `
      async fn getValue(): Promise<string> {
        return "hello"
      }
    `;
    expect(() => compile(source)).not.toThrow();
  });

  // T3: await 식 파싱
  test("T3: Await expression parsing", () => {
    const source = `
      async fn delayed(): Promise<i32> {
        let x = await getValue()
        return x
      }

      fn getValue(): i32 {
        return 42
      }
    `;
    // 이 테스트는 타입 체크 에러가 발생할 것으로 예상
    // getValue는 Promise를 반환하지 않으므로
    const lexer = new Lexer(source);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program } = parser.parse();

    const checker = new TypeChecker();
    const errors = checker.check(program);
    // await는 Promise 타입을 요구하므로 에러가 나야 함
    expect(errors.length).toBeGreaterThan(0);
  });

  // T4: Promise 타입 호환성
  test("T4: Promise type compatibility", () => {
    const source = `
      async fn asyncFunc(): Promise<i32> {
        return 42
      }

      fn caller(): Promise<i32> {
        return asyncFunc()
      }
    `;
    expect(() => compile(source)).not.toThrow();
  });

  // T5: await로 Promise 언래핑
  test("T5: Await unwraps Promise type", () => {
    const source = `
      async fn getValue(): Promise<i32> {
        return 42
      }

      async fn caller(): Promise<i32> {
        let result = await getValue()
        return result
      }
    `;
    expect(() => compile(source)).not.toThrow();
  });
});
