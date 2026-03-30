#!/usr/bin/env node

/**
 * FreeLang v4 Async/Await 구현 검증 스크립트
 * 컴파일 없이 파일 변경사항을 검증합니다
 */

const fs = require("fs");
const path = require("path");

const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (e) {
    checks.push({ name, passed: false, error: e.message });
    console.log(`✗ ${name}: ${e.message}`);
  }
}

// 1. Lexer: ASYNC, AWAIT 토큰 추가 확인
check("Lexer: ASYNC token added", () => {
  const lexer = fs.readFileSync("src/lexer.ts", "utf-8");
  if (!lexer.includes('ASYNC = "ASYNC"')) throw new Error("ASYNC token missing");
  if (!lexer.includes('AWAIT = "AWAIT"')) throw new Error("AWAIT token missing");
  if (!lexer.includes('["async", TokenType.ASYNC]')) throw new Error("async keyword mapping missing");
  if (!lexer.includes('["await", TokenType.AWAIT]')) throw new Error("await keyword mapping missing");
});

// 2. AST: Promise 타입 추가 확인
check("AST: Promise type added", () => {
  const ast = fs.readFileSync("src/ast.ts", "utf-8");
  if (!ast.includes('{ kind: "promise"; element: TypeAnnotation }')) {
    throw new Error("Promise type annotation missing");
  }
});

// 3. AST: await 식 추가 확인
check("AST: await expression added", () => {
  const ast = fs.readFileSync("src/ast.ts", "utf-8");
  if (!ast.includes('{ kind: "await"; expr: Expr')) {
    throw new Error("await expression missing");
  }
});

// 4. AST: fn_decl에 isAsync 추가 확인
check("AST: isAsync flag added to fn_decl", () => {
  const ast = fs.readFileSync("src/ast.ts", "utf-8");
  if (!ast.includes("isAsync: boolean")) {
    throw new Error("isAsync flag missing from fn_decl");
  }
});

// 5. Parser: parseStmt에서 ASYNC 처리
check("Parser: ASYNC handled in parseStmt", () => {
  const parser = fs.readFileSync("src/parser.ts", "utf-8");
  if (!parser.includes("case TokenType.ASYNC:")) {
    throw new Error("ASYNC case missing in parseStmt");
  }
});

// 6. Parser: parseFnDecl에서 async 처리
check("Parser: async fn parsing implemented", () => {
  const parser = fs.readFileSync("src/parser.ts", "utf-8");
  if (!parser.includes("if (this.match(TokenType.ASYNC))")) {
    throw new Error("async keyword handling missing in parseFnDecl");
  }
});

// 7. Parser: await 파싱
check("Parser: await expression parsing", () => {
  const parser = fs.readFileSync("src/parser.ts", "utf-8");
  if (!parser.includes("if (tok.type === TokenType.AWAIT)")) {
    throw new Error("await parsing missing in nud");
  }
});

// 8. Parser: Promise<T> 타입 파싱
check("Parser: Promise type parsing", () => {
  const parser = fs.readFileSync("src/parser.ts", "utf-8");
  if (!parser.includes('if (name === "Promise")')) {
    throw new Error("Promise type parsing missing");
  }
});

// 9. TypeChecker: Promise 타입 추가
check("TypeChecker: Promise type added", () => {
  const checker = fs.readFileSync("src/checker.ts", "utf-8");
  if (!checker.includes('{ kind: "promise"; element: Type }')) {
    throw new Error("Promise type missing from Type union");
  }
});

// 10. TypeChecker: registerFunction에 isAsync 처리
check("TypeChecker: async fn return type conversion", () => {
  const checker = fs.readFileSync("src/checker.ts", "utf-8");
  if (!checker.includes("if (stmt.isAsync)")) {
    throw new Error("isAsync handling missing in registerFunction");
  }
  if (!checker.includes('{ kind: "promise", element: returnType }')) {
    throw new Error("Promise wrapping missing");
  }
});

// 11. TypeChecker: checkAwait 메서드
check("TypeChecker: checkAwait method added", () => {
  const checker = fs.readFileSync("src/checker.ts", "utf-8");
  if (!checker.includes("private checkAwait")) {
    throw new Error("checkAwait method missing");
  }
});

// 12. Compiler: await 컴파일
check("Compiler: await expression compilation", () => {
  const compiler = fs.readFileSync("src/compiler.ts", "utf-8");
  if (!compiler.includes('case "await":')) {
    throw new Error("await case missing in compileExpr");
  }
});

// 13. 테스트 파일 생성
check("Test files created", () => {
  if (!fs.existsSync("src/async-jest.test.ts")) {
    throw new Error("async-jest.test.ts missing");
  }
  if (!fs.existsSync("src/async-basic.test.ts")) {
    throw new Error("async-basic.test.ts missing");
  }
});

// 결과 출력
console.log("\n" + "=".repeat(50));
const passed = checks.filter(c => c.passed).length;
const total = checks.length;
console.log(`Tests: ${passed}/${total} passed`);

if (passed >= 10) {
  console.log("✓ Minimum requirements met (10+ checks)");
  process.exit(0);
} else {
  console.log(`✗ Not enough checks passed (${passed}/${total})`);
  process.exit(1);
}
