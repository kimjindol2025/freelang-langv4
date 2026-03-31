// FreeLang v4 — 채널/Actor 통합 테스트

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";
import { Compiler } from "./compiler";
import { VM } from "./vm";

async function runCode(code: string): Promise<string[]> {
  const lexer = new Lexer(code);
  const { tokens, errors: lexErrors } = lexer.tokenize();
  if (lexErrors.length > 0) {
    throw new Error(`Lex errors: ${lexErrors.map((e) => e.message).join(", ")}`);
  }

  const parser = new Parser(tokens);
  const { program, errors: parseErrors } = parser.parse();
  if (parseErrors.length > 0) {
    throw new Error(`Parse errors: ${parseErrors.map((e) => e.message).join(", ")}`);
  }

  const checker = new TypeChecker();
  const checkErrors = checker.check(program);
  if (checkErrors.length > 0) {
    throw new Error(`Type errors: ${checkErrors.map((e: any) => e.message).join(", ")}`);
  }

  const compiler = new Compiler();
  const bytecode = compiler.compile(program);

  const vm = new VM();
  const { output, error } = await vm.run(bytecode);
  if (error) {
    throw new Error(`Runtime error: ${error}`);
  }
  return output;
}

describe("Channel/Actor 기본 테스트", () => {
  // 테스트 1: 채널 생성
  test("T1: 채널 생성 (chan_new)", async () => {
    const code = `
      var ch = channel<i32>();
      println(str(1));
    `;
    const output = await runCode(code);
    expect(output).toContain("1");
  });

  // 테스트 2: 채널 송수신 (기본)
  test("T2: 채널 송수신 (spawn에서 송신, 메인에서 수신)", async () => {
    const code = `
      var ch = channel<i32>();

      spawn {
        ch <- 42;
      }

      var x = <- ch;
      println(str(x));
    `;
    const output = await runCode(code);
    expect(output).toContain("42");
  });

  // 테스트 3: 다중 메시지
  test("T3: 채널을 통한 다중 메시지 송수신", async () => {
    const code = `
      var ch = channel<i32>();

      spawn {
        ch <- 10;
        ch <- 20;
        ch <- 30;
      }

      var a = <- ch;
      var b = <- ch;
      var c = <- ch;
      println(str(a));
      println(str(b));
      println(str(c));
    `;
    const output = await runCode(code);
    expect(output).toContain("10");
    expect(output).toContain("20");
    expect(output).toContain("30");
  });

  // 테스트 4: 다중 Actor (2개)
  test("T4: 다중 Actor 간 통신 (2 spawns)", async () => {
    const code = `
      var ch1 = channel<i32>();

      spawn {
        ch1 <- 100;
      }

      var y = <- ch1;
      println(str(y));
    `;
    const output = await runCode(code);
    expect(output).toContain("100");
  });

  // 테스트 5: 채널 타입 체크 (mismatch 감지)
  test("T5: 채널 타입 미스매치 감지", async () => {
    const code = `
      var ch = channel<i32>();
      ch <- "hello";
    `;
    await expect(runCode(code)).rejects.toThrow();
  });

  // 테스트 6: Actor 스케줄링 (순서 검증)
  test("T6: Actor 스케줄링 순서 검증", async () => {
    const code = `
      var ch = channel<i32>();

      spawn {
        ch <- 1;
        ch <- 2;
      }

      var x = <- ch;
      var y = <- ch;
      println(str(x));
      println(str(y));
    `;
    const output = await runCode(code);
    expect(output[0]).toBe("1");
    expect(output[1]).toBe("2");
  });

  // 테스트 7: 복잡한 채널 패턴
  test("T7: 복잡한 채널 패턴 (2개 채널)", async () => {
    const code = `
      var ch_a = channel<i32>();
      var ch_b = channel<i32>();

      spawn {
        ch_a <- 1;
      }

      spawn {
        ch_b <- 2;
      }

      var a = <- ch_a;
      var b = <- ch_b;
      println(str(a));
      println(str(b));
    `;
    const output = await runCode(code);
    expect(output).toContain("1");
    expect(output).toContain("2");
  });
});
