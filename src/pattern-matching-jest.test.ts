import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Compiler } from "./compiler";
import { VM } from "./vm";

async function exec(source: string): Promise<{ output: string[]; error: string | null }> {
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) throw new Error(`Lex: ${lexErrors[0].message}`);
  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) throw new Error(`Parse: ${parseErrors[0].message}`);
  const chunk = new Compiler().compile(program);
  return await new VM().run(chunk);
}

describe("Pattern Matching Features - Guard & Destructuring", () => {
  // T1: Guard 절 기본
  it("T1: should support guard clause", async () => {
    const code = `
      fn test() -> i32 {
        var x = 10
        match x {
          y if y > 5 => 100,
          y if y < 5 => 50,
          _ => 0,
        }
      }
      println(str(test()))
    `;

    const { output } = await exec(code);
    expect(output).toEqual(["100"]);
  });

  // T2: Guard 절에서 패턴 바인딩 사용
  it("T2: should use bindings in guard clause", async () => {
    const code = `
      fn test() -> i32 {
        match 42 {
          x if x > 40 => x + 1,
          _ => 0,
        }
      }
      println(str(test()))
    `;

    const { output } = await exec(code);
    expect(output).toEqual(["43"]);
  });

  // T3: 구조체 분해 패턴 (기본)
  it("T3: should support struct destructuring", async () => {
    const code = `
      struct Point {
        x: i32,
        y: i32,
      }

      fn test() -> i32 {
        var p = Point { x: 10, y: 20 }
        match p {
          Point { x, y } => x + y,
          _ => 0,
        }
      }
      println(str(test()))
    `;

    const { output } = await exec(code);
    expect(output).toEqual(["30"]);
  });

  // T4: 구조체 분해 + Guard 절
  it("T4: should combine struct destructuring with guard", async () => {
    const code = `
      struct Point {
        x: i32,
        y: i32,
      }

      fn test() -> i32 {
        var p = Point { x: 10, y: 20 }
        match p {
          Point { x, y } if x > 5 => x + y,
          Point { x, y } if x <= 5 => y - x,
          _ => 0,
        }
      }
      println(str(test()))
    `;

    const { output } = await exec(code);
    expect(output).toEqual(["30"]);
  });

  // T5: 배열 분해 패턴 (기본)
  it("T5: should support array destructuring", async () => {
    const code = `
      fn test() -> i32 {
        var arr = [10, 20, 30]
        match arr {
          [a, b, c] => a + b + c,
          _ => 0,
        }
      }
      println(str(test()))
    `;

    const { output } = await exec(code);
    expect(output).toEqual(["60"]);
  });

  // T6: 배열 분해 + 나머지 패턴
  it("T6: should support rest pattern in array", async () => {
    const code = `
      fn test() -> i32 {
        var arr = [10, 20, 30, 40]
        match arr {
          [a, .., b] => a + b,
          _ => 0,
        }
      }
      println(str(test()))
    `;

    const { output } = await exec(code);
    expect(output).toEqual(["50"]);
  });

  // T7: 다중 조건 가드
  it("T7: should support multiple guard conditions", async () => {
    const code = `
      fn categorize(x: i32) -> i32 {
        match x {
          y if y < 0 => -1,
          0 => 0,
          y if y > 0 => 1,
          _ => 999,
        }
      }
      println(str(categorize(42)))
    `;

    const { output } = await exec(code);
    expect(output).toEqual(["1"]);
  });

  // T8: 복잡한 중첩 패턴
  it("T8: should support complex nested patterns", async () => {
    const code = `
      struct Point {
        x: i32,
        y: i32,
      }

      fn test() -> i32 {
        var p = Some(Point { x: 5, y: 10 })
        match p {
          Some(Point { x, y }) if x > 0 => x + y,
          Some(Point { x, y }) if x <= 0 => y - x,
          None => -999,
          _ => 0,
        }
      }
      println(str(test()))
    `;

    const { output } = await exec(code);
    expect(output).toEqual(["15"]);
  });
});
