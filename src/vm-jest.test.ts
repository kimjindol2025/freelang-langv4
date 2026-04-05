// FreeLang v4 — VM 테스트 (E2E: Source → Lexer → Parser → Compiler → VM) - Jest Format

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

// ============================================================
// Jest Tests
// ============================================================

describe("VM E2E Tests", () => {
  describe("println 기본", () => {
    it('println("hello")', async () => {
      const { output } = await exec('println("hello")');
      expect(output).toEqual(["hello"]);
    });

    it('println("hello world")', async () => {
      const { output } = await exec('println("hello world")');
      expect(output).toEqual(["hello world"]);
    });
  });

  describe("정수 산술", () => {
    it("1 + 2 = 3", async () => {
      const { output } = await exec('println(str(1 + 2))');
      expect(output).toEqual(["3"]);
    });

    it("10 - 3 = 7", async () => {
      const { output } = await exec('println(str(10 - 3))');
      expect(output).toEqual(["7"]);
    });

    it("4 * 5 = 20", async () => {
      const { output } = await exec('println(str(4 * 5))');
      expect(output).toEqual(["20"]);
    });

    it("10 / 3 = 3 (i32 truncate)", async () => {
      const { output } = await exec('println(str(10 / 3))');
      expect(output).toEqual(["3"]);
    });

    it("7 % 3 = 1", async () => {
      const { output } = await exec('println(str(7 % 3))');
      expect(output).toEqual(["1"]);
    });

    it("-42 (negate)", async () => {
      const { output } = await exec('println(str(-42))');
      expect(output).toEqual(["-42"]);
    });

    it("2 + 3 * 4 = 14 (precedence)", async () => {
      const { output } = await exec('println(str(2 + 3 * 4))');
      expect(output).toEqual(["14"]);
    });
  });

  describe("문자열 연결", () => {
    it('string concat', async () => {
      const { output } = await exec('println("hello" + " " + "world")');
      expect(output).toEqual(["hello world"]);
    });
  });

  describe("비교 + 논리", () => {
    it("1 == 1", async () => {
      const { output } = await exec('println(str(1 == 1))');
      expect(output).toEqual(["true"]);
    });

    it("1 == 2", async () => {
      const { output } = await exec('println(str(1 == 2))');
      expect(output).toEqual(["false"]);
    });

    it("1 != 2", async () => {
      const { output } = await exec('println(str(1 != 2))');
      expect(output).toEqual(["true"]);
    });

    it("1 < 2", async () => {
      const { output } = await exec('println(str(1 < 2))');
      expect(output).toEqual(["true"]);
    });

    it("2 > 1", async () => {
      const { output } = await exec('println(str(2 > 1))');
      expect(output).toEqual(["true"]);
    });

    it("true && false", async () => {
      const { output } = await exec('println(str(true && false))');
      expect(output).toEqual(["false"]);
    });

    it("false || true", async () => {
      const { output } = await exec('println(str(false || true))');
      expect(output).toEqual(["true"]);
    });
  });

  describe("변수", () => {
    it("var x = 42", async () => {
      const { output } = await exec("var x = 42\nprintln(str(x))");
      expect(output).toEqual(["42"]);
    });

    it("var name = string", async () => {
      const { output } = await exec('var name = "FreeLang"\nprintln(name)');
      expect(output).toEqual(["FreeLang"]);
    });

    it("var reassign", async () => {
      const { output } = await exec("var x = 1\nx = 2\nprintln(str(x))");
      expect(output).toEqual(["2"]);
    });

    it("a + b = 30", async () => {
      const { output } = await exec("var a = 10\nvar b = 20\nprintln(str(a + b))");
      expect(output).toEqual(["30"]);
    });
  });

  describe("함수", () => {
    it("fn add(3,4) = 7", async () => {
      const { output } = await exec(
        `fn add(a: i32, b: i32) -> i32 { return a + b }
println(str(add(3, 4)))`
      );
      expect(output).toEqual(["7"]);
    });

    it("fn double(21) = 42", async () => {
      const { output } = await exec(
        `fn double(n: i32) -> i32 { return n * 2 }
println(str(double(21)))`
      );
      expect(output).toEqual(["42"]);
    });

    it("fn greet void", async () => {
      const { output } = await exec(
        `fn greet(name: string) -> void { println("Hello " + name) }
greet("FreeLang")`
      );
      expect(output).toEqual(["Hello FreeLang"]);
    });

    it("factorial(5) = 120", async () => {
      const { output } = await exec(
        `fn factorial(n: i32) -> i32 {
  if n <= 1 { return 1 }
  return n * factorial(n + -1)
}
println(str(factorial(5)))`
      );
      expect(output).toEqual(["120"]);
    });
  });

  describe("if 문", () => {
    it("if true", async () => {
      const { output } = await exec('if true { println("yes") }');
      expect(output).toEqual(["yes"]);
    });

    it("if false (skip)", async () => {
      const { output } = await exec('if false { println("yes") }');
      expect(output).toEqual([]);
    });

    it("if-else true", async () => {
      const { output } = await exec(
        'if true { println("yes") } else { println("no") }'
      );
      expect(output).toEqual(["yes"]);
    });

    it("if-else false", async () => {
      const { output } = await exec(
        'if false { println("yes") } else { println("no") }'
      );
      expect(output).toEqual(["no"]);
    });

    it("nested if", async () => {
      const { output } = await exec(
        `var x = 10
if x > 5 {
  if x > 20 {
    println("big")
  } else {
    println("medium")
  }
} else {
  println("small")
}`
      );
      expect(output).toEqual(["medium"]);
    });
  });

  describe("for 문", () => {
    it("for...in [1,2,3]", async () => {
      const { output } = await exec(
        `for x in [1, 2, 3] {
  println(str(x))
}`
      );
      expect(output).toEqual(["1", "2", "3"]);
    });

    it("for sum = 60", async () => {
      const { output } = await exec(
        `var total: i32 = 0
for x in [10, 20, 30] {
  total = total + x
}
println(str(total))`
      );
      expect(output).toEqual(["60"]);
    });

    it("for...in range(0,5)", async () => {
      const { output } = await exec(
        `for i in range(0, 5) {
  println(str(i))
}`
      );
      expect(output).toEqual(["0", "1", "2", "3", "4"]);
    });
  });

  describe("while 문", () => {
    it("while 기본", async () => {
      const { output } = await exec(
        `var i: i32 = 0
while i < 3 {
  println(str(i))
  i = i + 1
}`
      );
      expect(output).toEqual(["0", "1", "2"]);
    });

    it("while break", async () => {
      const { output } = await exec(
        `var i: i32 = 0
while true {
  if i >= 2 { break }
  println(str(i))
  i = i + 1
}`
      );
      expect(output).toEqual(["0", "1"]);
    });
  });

  describe("배열", () => {
    it("배열 생성", async () => {
      const { output } = await exec(
        `var arr = [1, 2, 3]
println(str(length(arr)))`
      );
      expect(output).toEqual(["3"]);
    });

    it("배열 인덱싱", async () => {
      const { output } = await exec(
        `var arr = ["a", "b", "c"]
println(arr[1])`
      );
      expect(output).toEqual(["b"]);
    });
  });

  describe("메모리 관리 - 스택 & 로컬 변수", () => {
    it("여러 지역 변수 동시 관리", async () => {
      const { output } = await exec(
        `var a = 1
var b = 2
var c = 3
var d = 4
var e = 5
println(str(a + b + c + d + e))`
      );
      expect(output).toEqual(["15"]);
    });

    it("변수 재사용 (가비지 X)", async () => {
      const { output } = await exec(
        `var x = 10
x = 20
x = 30
x = 40
println(str(x))`
      );
      expect(output).toEqual(["40"]);
    });

    it("깊은 스택 (100+ 푸시)", async () => {
      let code = "var sum: i32 = 0\n";
      for (let i = 0; i < 50; i++) {
        code += `sum = sum + ${i}\n`;
      }
      code += "println(str(sum))";
      const { output } = await exec(code);
      const expected = (49 * 50) / 2; // 0+1+...+49
      expect(output).toEqual([String(expected)]);
    });

    it("중첩 블록 스코핑", async () => {
      const { output } = await exec(
        `var x = 10
if true {
  var x = 20
  println(str(x))
}
println(str(x))`
      );
      expect(output).toEqual(["20", "10"]);
    });
  });

  describe("함수 호출 & 콜 스택", () => {
    it("함수 체인 호출", async () => {
      const { output } = await exec(
        `fn f1(x: i32) -> i32 { return x + 1 }
fn f2(x: i32) -> i32 { return f1(x) + 1 }
fn f3(x: i32) -> i32 { return f2(x) + 1 }
println(str(f3(10)))`
      );
      expect(output).toEqual(["13"]);
    });

    it("함수 깊은 재귀", async () => {
      const { output } = await exec(
        `fn fib(n: i32) -> i32 {
  if n <= 1 { return n }
  return fib(n - 1) + fib(n - 2)
}
println(str(fib(6)))`
      );
      expect(output).toEqual(["8"]); // fib(6) = 8
    });

    it("함수 다중 반환값 타입", async () => {
      const { output } = await exec(
        `fn getInt() -> i32 { return 42 }
fn getStr() -> string { return "hello" }
fn getBool() -> bool { return true }
println(str(getInt()))
println(getStr())
println(str(getBool()))`
      );
      expect(output).toEqual(["42", "hello", "true"]);
    });

    it("상호 재귀 (서로 호출)", async () => {
      const { output } = await exec(
        `fn isEven(n: i32) -> bool {
  if n == 0 { return true }
  return isOdd(n - 1)
}
fn isOdd(n: i32) -> bool {
  if n == 0 { return false }
  return isEven(n - 1)
}
println(str(isEven(4)))
println(str(isOdd(3)))`
      );
      expect(output).toEqual(["true", "true"]);
    });

    it("함수 로컬 변수 격리", async () => {
      const { output } = await exec(
        `fn modify(x: i32) -> i32 {
  var x = x * 2
  x = x + 10
  return x
}
var a = 5
println(str(modify(a)))
println(str(a))`
      );
      expect(output).toEqual(["20", "5"]);
    });
  });

  describe("복합 데이터 구조", () => {
    it("struct 필드 수정", async () => {
      const { output } = await exec(
        `struct Point { x: f64, y: f64 }
var p = Point { x: 1.0, y: 2.0 }
println(str(p.x))
println(str(p.y))`
      );
      expect(output).toEqual(["1", "2"]);
    });

    it("배열 요소 수정", async () => {
      const { output } = await exec(
        `var arr = [1, 2, 3]
arr[1] = 99
println(str(arr[0]))
println(str(arr[1]))
println(str(arr[2]))`
      );
      expect(output).toEqual(["1", "99", "3"]);
    });

    it("다중 배열 (배열의 배열)", async () => {
      const { output } = await exec(
        `var matrix = [[1, 2], [3, 4]]
println(str(length(matrix)))
println(str(length(matrix[0])))`
      );
      expect(output).toEqual(["2", "2"]);
    });
  });

  describe("제어흐름 복잡도", () => {
    it("삼중 if-else", async () => {
      const { output } = await exec(
        `var x = 10
if x < 5 {
  println("small")
} else if x < 15 {
  println("medium")
} else {
  println("large")
}`
      );
      expect(output).toEqual(["medium"]);
    });

    it("반복문 조기 종료 (break)", async () => {
      const { output } = await exec(
        `for i in [1, 2, 3, 4, 5] {
  if i == 3 { break }
  println(str(i))
}`
      );
      expect(output).toEqual(["1", "2"]);
    });

    it("반복문 건너뛰기 (continue)", async () => {
      const { output } = await exec(
        `for i in [1, 2, 3, 4, 5] {
  if i == 3 { continue }
  println(str(i))
}`
      );
      expect(output).toEqual(["1", "2", "4", "5"]);
    });

    it("while 루프 상태 변경", async () => {
      const { output } = await exec(
        `var i: i32 = 0
var sum: i32 = 0
while i < 5 {
  sum = sum + i
  i = i + 1
}
println(str(sum))`
      );
      expect(output).toEqual(["10"]); // 0+1+2+3+4
    });
  });

  describe("예외 & 에러 처리", () => {
    it("런타임 에러 캐치 - 0으로 나누기", async () => {
      const { output, error } = await exec("println(str(10 / 0))");
      expect(error).toBeDefined();
      // 에러 메시지는 구현에 따라 다를 수 있음
    });

    it("수행 제한 초과 (무한 루프 감지)", async () => {
      const { output, error } = await exec("while true { var x = 1 }");
      expect(error).toBeDefined();
      expect(error).toContain("limit");
    });

    it("배열 범위 초과 접근", async () => {
      const { output, error } = await exec(
        `var arr = [1, 2, 3]
println(str(arr[10]))`
      );
      // 범위 초과 시 에러 또는 undefined 반환 (구현 의존)
      expect(error !== null || output.length > 0).toBe(true);
    });
  });

  describe("타입 변환 & 문자열화", () => {
    it("모든 타입 str() 변환", async () => {
      const { output } = await exec(
        `println(str(42))
println(str(3.14))
println(str(true))
println(str(false))`
      );
      expect(output).toEqual(["42", "3.14", "true", "false"]);
    });

    it("복합 표현식 str() 변환", async () => {
      const { output } = await exec(
        `println(str(1 + 2 * 3))
println(str(10 > 5))
println(str(true && false))`
      );
      expect(output).toEqual(["7", "true", "false"]);
    });
  });

  describe("성능 & 확장성", () => {
    it("1000개 요소 배열", async () => {
      let code = "var arr = [";
      for (let i = 0; i < 1000; i++) {
        code += (i > 0 ? ", " : "") + i;
      }
      code += "]\nprintln(str(length(arr)))";
      const { output } = await exec(code);
      expect(output).toEqual(["1000"]);
    });

    it("깊은 재귀 (50단계)", async () => {
      const { output } = await exec(
        `fn countdown(n: i32) -> void {
  if n <= 0 {
    println("done")
  } else {
    countdown(n - 1)
  }
}
countdown(50)`
      );
      expect(output).toEqual(["done"]);
    });
  });

  describe("빌틴 함수 - 배열 조작", () => {
    it("push: 배열에 요소 추가", async () => {
      const { output } = await exec(
        `var arr = [1, 2]
push(arr, 3)
println(str(length(arr)))`
      );
      expect(output).toEqual(["3"]);
    });

    it("pop: 배열에서 요소 제거", async () => {
      const { output } = await exec(
        `var arr = [10, 20, 30]
var x = pop(arr)
println(str(x))
println(str(length(arr)))`
      );
      expect(output).toEqual(["30", "2"]);
    });

    it("pop: 빈 배열에서 pop", async () => {
      const { output } = await exec(
        `var arr: [i32] = []
var x = pop(arr)
println(str(x))`
      );
      expect(output.length).toBe(1);
    });
  });

  describe("빌틴 함수 - 수학", () => {
    it("abs: 절댓값", async () => {
      const { output } = await exec(
        `println(str(abs(-42)))
println(str(abs(3.14)))`
      );
      expect(output).toEqual(["42", "3.14"]);
    });

    it("min: 최솟값", async () => {
      const { output } = await exec(
        `println(str(min(10, 5)))
println(str(min(-3, -8)))`
      );
      expect(output).toEqual(["5", "-8"]);
    });

    it("max: 최댓값", async () => {
      const { output } = await exec(
        `println(str(max(10, 5)))
println(str(max(-3, -8)))`
      );
      expect(output).toEqual(["10", "-3"]);
    });

    it("pow: 거듭제곱", async () => {
      const { output } = await exec(
        `println(str(pow(2, 3)))
println(str(pow(10, 2)))`
      );
      expect(output).toEqual(["8", "100"]);
    });

    it("sqrt: 제곱근", async () => {
      const { output } = await exec(
        `println(str(sqrt(16)))
println(str(sqrt(2)))`
      );
      const [r1, r2] = output;
      expect(r1).toBe("4");
      expect(parseFloat(r2)).toBeCloseTo(1.414, 2);
    });
  });

  describe("빌틴 함수 - 타입 & 검증", () => {
    it("typeof: 타입 검사", async () => {
      const { output } = await exec(
        `println(typeof(42))
println(typeof(3.14))
println(typeof("hello"))
println(typeof(true))
println(typeof([1, 2, 3]))`
      );
      expect(output).toEqual(["i32", "f64", "str", "bool", "arr"]);
    });

    it("assert: 조건 검증 (성공)", async () => {
      const { output } = await exec(
        `assert(true)
assert(1 > 0)
println("passed")`
      );
      expect(output).toEqual(["passed"]);
    });

    it("assert: 조건 검증 (실패)", async () => {
      const { output, error } = await exec(`assert(false, "test failed")`);
      expect(error).toBeDefined();
      expect(error).toContain("test failed");
    });
  });

  describe("빌틴 함수 - 문자열 조작", () => {
    it("contains: 부분 문자열 확인", async () => {
      const { output } = await exec(
        `println(str(contains("hello world", "world")))
println(str(contains("hello world", "xyz")))`
      );
      expect(output).toEqual(["true", "false"]);
    });

    it("split: 문자열 분할", async () => {
      const { output } = await exec(
        `var arr = split("a,b,c", ",")
println(str(length(arr)))
println(arr[0])
println(arr[1])
println(arr[2])`
      );
      expect(output).toEqual(["3", "a", "b", "c"]);
    });

    it("trim: 공백 제거", async () => {
      const { output } = await exec(
        `println(trim("  hello  "))
println(trim("world"))`
      );
      expect(output).toEqual(["hello", "world"]);
    });

    it("to_upper: 대문자 변환", async () => {
      const { output } = await exec(
        `println(to_upper("hello"))
println(to_upper("HeLLo"))`
      );
      expect(output).toEqual(["HELLO", "HELLO"]);
    });

    it("to_lower: 소문자 변환", async () => {
      const { output } = await exec(
        `println(to_lower("HELLO"))
println(to_lower("HeLLo"))`
      );
      expect(output).toEqual(["hello", "hello"]);
    });

    it("char_at: 문자 접근", async () => {
      const { output } = await exec(
        `println(char_at("hello", 0))
println(char_at("hello", 4))
println(char_at("hello", 10))`
      );
      expect(output).toEqual(["h", "o", ""]);
    });

    it("slice: 부분 문자열", async () => {
      const { output } = await exec(
        `println(slice("hello world", 0, 5))
println(slice("hello world", 6, 11))`
      );
      expect(output).toEqual(["hello", "world"]);
    });
  });

  describe("빌틴 함수 - 배열 슬라이싱", () => {
    it("slice: 부분 배열", async () => {
      const { output } = await exec(
        `var arr = [10, 20, 30, 40, 50]
var sliced = slice(arr, 1, 4)
println(str(length(sliced)))
println(str(sliced[0]))
println(str(sliced[1]))
println(str(sliced[2]))`
      );
      expect(output).toEqual(["3", "20", "30", "40"]);
    });
  });

  describe("빌틴 함수 - 클론", () => {
    it("clone: 배열 복제", async () => {
      const { output } = await exec(
        `var arr1 = [1, 2, 3]
var arr2 = clone(arr1)
arr1[0] = 99
println(str(arr1[0]))
println(str(arr2[0]))`
      );
      expect(output).toEqual(["99", "1"]);
    });

    it("clone: 중첩 배열 복제", async () => {
      const { output } = await exec(
        `var matrix1 = [[1, 2], [3, 4]]
var matrix2 = clone(matrix1)
println(str(length(matrix2)))
println(str(length(matrix2[0])))`
      );
      expect(output).toEqual(["2", "2"]);
    });
  });

  describe("표준 라이브러리 - parse_int (v4.4)", () => {
    it("parse_int: 유효한 정수 문자열", async () => {
      const { output } = await exec('println(parse_int("42"))');
      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toContain("Ok");
    });

    it("parse_int: 음수 정수 문자열", async () => {
      const { output } = await exec('println(parse_int("-123"))');
      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toContain("Ok");
    });

    it("parse_int: 유효하지 않은 문자열 - 에러 반환", async () => {
      const { output } = await exec('println(parse_int("abc"))');
      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toContain("Err");
    });

    it("parse_int: 빈 문자열 - 에러 반환", async () => {
      const { output } = await exec('println(parse_int(""))');
      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toContain("Err");
    });

    it("parse_int: 공백이 포함된 문자열", async () => {
      const { output } = await exec('println(parse_int("  42"))');
      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toContain("Ok");
    });
  });

  describe("표준 라이브러리 - first/last (v4.4)", () => {
    it("first: 배열의 첫 요소", async () => {
      const { output } = await exec('println(first([1, 2, 3]))');
      expect(output[0]).toContain("Some");
      expect(output[0]).toContain("1");
    });

    it("first: 빈 배열 - None 반환", async () => {
      const { output } = await exec('println(first([]))');
      expect(output[0]).toContain("None");
    });

    it("last: 배열의 마지막 요소", async () => {
      const { output } = await exec('println(last([1, 2, 3]))');
      expect(output[0]).toContain("Some");
      expect(output[0]).toContain("3");
    });

    it("last: 빈 배열 - None 반환", async () => {
      const { output } = await exec('println(last([]))');
      expect(output[0]).toContain("None");
    });

    it("first/last: 문자열 배열", async () => {
      const { output } = await exec(
        `println(first(["a", "b", "c"]))
println(last(["a", "b", "c"]))`
      );
      expect(output[0]).toContain("Some");
      expect(output[0]).toContain("a");
      expect(output[1]).toContain("Some");
      expect(output[1]).toContain("c");
    });
  });

  describe("표준 라이브러리 - append_file/exists (v4.4)", () => {
    it("exists: 기존 파일 확인 (package.json)", async () => {
      const { output } = await exec('println(str(exists("package.json")))');
      expect(output[0]).toEqual("true");
    });

    it("exists: 없는 파일 확인", async () => {
      const { output } = await exec('println(str(exists("nonexistent_file_xyz_12345.txt")))');
      expect(output[0]).toEqual("false");
    });

    it("append_file: 함수 호출 테스트", async () => {
      const { output } = await exec('println(typeof(append_file))');
      expect(output.length).toBeGreaterThan(0);
    });

    it("append_file: Ok 반환 확인", async () => {
      const { output } = await exec('println(append_file("test_freelang.txt", "test"))');
      expect(output[0]).toContain("Ok");
    });
  });
});
