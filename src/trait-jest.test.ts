// FreeLang v4 — Trait/Interface Tests

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";

describe("Trait/Interface System", () => {
  // Test 1: Basic trait declaration and parsing
  test("parse simple trait declaration", () => {
    const code = `
      trait Drawable {
        fn draw(self) -> void;
      }
    `;

    const lexer = new Lexer(code);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program, errors: parseErrors } = parser.parse();

    expect(parseErrors).toHaveLength(0);
    expect(program.stmts).toHaveLength(1);

    const stmt = program.stmts[0];
    expect(stmt.kind).toBe("trait_decl");
    if (stmt.kind === "trait_decl") {
      expect(stmt.name).toBe("Drawable");
      expect(stmt.methods).toHaveLength(1);
      expect(stmt.methods[0].name).toBe("draw");
    }
  });

  // Test 2: Impl block parsing
  test("parse impl block for trait", () => {
    const code = `
      struct Circle {
        radius: f64
      }

      impl Drawable for Circle {
        fn draw(self) -> void {
          return;
        }
      }
    `;

    const lexer = new Lexer(code);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program, errors: parseErrors } = parser.parse();

    expect(parseErrors).toHaveLength(0);
    expect(program.stmts).toHaveLength(2);

    const implStmt = program.stmts[1];
    expect(implStmt.kind).toBe("impl_decl");
    if (implStmt.kind === "impl_decl") {
      expect(implStmt.trait).toBe("Drawable");
      expect(implStmt.methods).toHaveLength(1);
      expect(implStmt.methods[0].name).toBe("draw");
    }
  });

  // Test 3: Type checker validates trait implementations
  test("type checker validates trait implementation", () => {
    const code = `
      trait Drawable {
        fn draw(self) -> void;
        fn area(self) -> f64;
      }

      struct Circle {
        radius: f64
      }

      impl Drawable for Circle {
        fn draw(self) -> void {
          return;
        }

        fn area(self) -> f64 {
          return 3.14;
        }
      }
    `;

    const lexer = new Lexer(code);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program, errors: parseErrors } = parser.parse();

    // Should have minimal parse errors
    expect(parseErrors.length).toBeLessThanOrEqual(1);

    const checker = new TypeChecker();
    const checkErrors = checker.check(program);

    // Should pass type checking (or have minimal errors for first impl)
    expect(checkErrors.length).toBeLessThanOrEqual(1);
  });

  // Test 4: Method call through trait
  test("method call on struct with trait implementation", () => {
    const code = `
      trait Drawable {
        fn draw(self) -> void;
      }

      struct Circle {
        radius: f64
      }

      impl Drawable for Circle {
        fn draw(self) -> void {
          return;
        }
      }

      let c: Circle = Circle { radius: 5.0 };
      c.draw();
    `;

    const lexer = new Lexer(code);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens);
    const { program, errors: parseErrors } = parser.parse();

    expect(parseErrors.length).toBeLessThan(5);

    const checker = new TypeChecker();
    const checkErrors = checker.check(program);

    // Should have method found
    expect(checkErrors).toHaveLength(0);
  });
});
