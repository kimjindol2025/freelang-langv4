// FreeLang v4 — Compiler 테스트 - Jest Format

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Compiler, Chunk, Op } from "./compiler";

function compile(source: string): Chunk {
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) throw new Error(`Lex: ${lexErrors[0].message}`);
  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) throw new Error(`Parse: ${parseErrors[0].message}`);
  return new Compiler().compile(program);
}

function findOp(chunk: Chunk, op: Op): boolean {
  return chunk.code.includes(op);
}

function countOp(chunk: Chunk, op: Op): number {
  return chunk.code.filter((b) => b === op).length;
}

// ============================================================
// Jest Tests
// ============================================================

describe("Compiler Tests", () => {
  describe("상수 로드", () => {
    it("정수 리터럴", () => {
      const c = compile("42");
      expect(findOp(c, Op.PUSH_I32)).toBe(true);
      expect(findOp(c, Op.HALT)).toBe(true);
    });

    it("부동소수점 리터럴", () => {
      const c = compile("3.14");
      expect(findOp(c, Op.PUSH_F64)).toBe(true);
    });

    it("문자열 리터럴", () => {
      const c = compile('"hello"');
      expect(findOp(c, Op.PUSH_STR)).toBe(true);
      expect(c.constants.includes("hello")).toBe(true);
    });

    it("true 리터럴", () => {
      const c = compile("true");
      expect(findOp(c, Op.PUSH_TRUE)).toBe(true);
    });

    it("false 리터럴", () => {
      const c = compile("false");
      expect(findOp(c, Op.PUSH_FALSE)).toBe(true);
    });
  });

  describe("산술 연산", () => {
    it("1 + 2", () => {
      const c = compile("1 + 2");
      expect(findOp(c, Op.ADD_I32)).toBe(true);
    });

    it("3 - 1", () => {
      const c = compile("3 - 1");
      expect(findOp(c, Op.SUB_I32)).toBe(true);
    });

    it("2 * 3", () => {
      const c = compile("2 * 3");
      expect(findOp(c, Op.MUL_I32)).toBe(true);
    });

    it("6 / 2", () => {
      const c = compile("6 / 2");
      expect(findOp(c, Op.DIV_I32)).toBe(true);
    });

    it("7 % 3", () => {
      const c = compile("7 % 3");
      expect(findOp(c, Op.MOD_I32)).toBe(true);
    });
  });

  describe("비교 + 논리", () => {
    it("==", () => {
      const c = compile("1 == 2");
      expect(findOp(c, Op.EQ)).toBe(true);
    });

    it("!=", () => {
      const c = compile("1 != 2");
      expect(findOp(c, Op.NEQ)).toBe(true);
    });

    it("<", () => {
      const c = compile("1 < 2");
      expect(findOp(c, Op.LT)).toBe(true);
    });

    it("&&", () => {
      const c = compile("true && false");
      expect(findOp(c, Op.AND)).toBe(true);
    });

    it("||", () => {
      const c = compile("true || false");
      expect(findOp(c, Op.OR)).toBe(true);
    });
  });

  describe("단항 연산", () => {
    it("-42", () => {
      const c = compile("-42");
      expect(findOp(c, Op.NEG_I32)).toBe(true);
    });

    it("!true", () => {
      const c = compile("!true");
      expect(findOp(c, Op.NOT)).toBe(true);
    });
  });

  describe("변수", () => {
    it("var x = 42", () => {
      const c = compile("var x = 42");
      expect(findOp(c, Op.STORE_LOCAL)).toBe(true);
    });

    it("var x = 42; x + 1", () => {
      const c = compile("var x = 42\nx + 1");
      expect(findOp(c, Op.STORE_LOCAL)).toBe(true);
      expect(findOp(c, Op.LOAD_LOCAL)).toBe(true);
      expect(findOp(c, Op.ADD_I32)).toBe(true);
    });
  });

  describe("함수 호출", () => {
    it("println은 builtin 함수", () => {
      const c = compile('println("hello")');
      const hasCall = findOp(c, Op.CALL_BUILTIN) || findOp(c, Op.CALL);
      expect(hasCall).toBe(true);
    });
  });

  describe("제어흐름", () => {
    it("if 문", () => {
      const c = compile("if true { var x = 1 }");
      expect(findOp(c, Op.JUMP_IF_FALSE)).toBe(true);
    });

    it("while 문", () => {
      const c = compile("while true { var x = 1 }");
      expect(findOp(c, Op.JUMP)).toBe(true);
    });
  });

  describe("배열", () => {
    it("배열 리터럴", () => {
      const c = compile("[1, 2, 3]");
      expect(findOp(c, Op.ARRAY_NEW)).toBe(true);
    });

    it("배열 인덱싱", () => {
      const c = compile("var arr = [1, 2, 3]\narr[0]");
      expect(findOp(c, Op.ARRAY_GET)).toBe(true);
    });

    it("배열 요소 수정", () => {
      const c = compile("var arr = [1, 2, 3]\narr[0] = 99");
      expect(findOp(c, Op.ARRAY_SET)).toBe(true);
    });
  });

  describe("리터럴 타입", () => {
    it("f64 리터럴", () => {
      const c = compile("3.14");
      expect(findOp(c, Op.PUSH_F64)).toBe(true);
    });
  });

  describe("구조체", () => {
    it("구조체 생성", () => {
      const c = compile("struct Point { x: i32 }\nvar p = Point { x: 10 }");
      expect(findOp(c, Op.STRUCT_NEW)).toBe(true);
    });

    it("구조체 필드 접근", () => {
      const c = compile("struct Point { x: i32 }\nvar p = Point { x: 10 }\np.x");
      expect(findOp(c, Op.STRUCT_GET)).toBe(true);
    });
  });

  describe("함수 정의 & 호출", () => {
    it("함수 정의", () => {
      const c = compile("fn add(a: i32, b: i32) -> i32 { a + b }");
      expect(findOp(c, Op.CALL) || findOp(c, Op.CALL_BUILTIN) || findOp(c, Op.PUSH_I32)).toBe(true);
    });

    it("함수 호출", () => {
      const c = compile("fn add(a: i32, b: i32) -> i32 { a + b }\nadd(1, 2)");
      expect(findOp(c, Op.CALL)).toBe(true);
    });

    it("반환값", () => {
      const c = compile("fn getNum() -> i32 { return 42 }");
      expect(findOp(c, Op.RETURN)).toBe(true);
    });
  });

  describe("변수 스코핑", () => {
    it("로컬 변수 스토어", () => {
      const c = compile("var x = 100");
      expect(findOp(c, Op.STORE_LOCAL)).toBe(true);
    });
  });

  describe("제어흐름 확장", () => {
    it("if-else", () => {
      const c = compile("if true { 1 } else { 2 }");
      expect(findOp(c, Op.JUMP_IF_FALSE)).toBe(true);
      expect(findOp(c, Op.JUMP)).toBe(true);
    });

    it("break 문", () => {
      const c = compile("while true { break }");
      expect(findOp(c, Op.JUMP)).toBe(true);
    });

    it("continue 문", () => {
      const c = compile("while true { continue }");
      expect(findOp(c, Op.JUMP)).toBe(true);
    });

    it("for...in 루프", () => {
      const c = compile("for x in [1, 2] { var y = x }");
      expect(findOp(c, Op.ARRAY_GET) || findOp(c, Op.JUMP)).toBe(true);
    });
  });

  describe("비교 연산자 확장", () => {
    it(">", () => {
      const c = compile("1 > 2");
      expect(findOp(c, Op.GT)).toBe(true);
    });

    it("<=", () => {
      const c = compile("1 <= 2");
      expect(findOp(c, Op.LTEQ)).toBe(true);
    });

    it(">=", () => {
      const c = compile("1 >= 2");
      expect(findOp(c, Op.GTEQ)).toBe(true);
    });
  });

  describe("복잡한 표현식", () => {
    it("연산자 우선순위", () => {
      const c = compile("2 + 3 * 4");
      expect(findOp(c, Op.MUL_I32)).toBe(true);
      expect(findOp(c, Op.ADD_I32)).toBe(true);
      expect(countOp(c, Op.PUSH_I32)).toBeGreaterThanOrEqual(3);
    });

    it("중첩 함수 호출", () => {
      const c = compile('println(str(42))');
      expect(findOp(c, Op.CALL_BUILTIN) || findOp(c, Op.CALL)).toBe(true);
    });

    it("배열 요소 함수 호출", () => {
      const c = compile('var arr = [1, 2, 3]\nlength(arr)');
      expect(findOp(c, Op.ARRAY_GET) || findOp(c, Op.CALL_BUILTIN)).toBe(true);
    });
  });
});
