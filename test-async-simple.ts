// 간단한 async/await 테스트 스크립트
import { Lexer } from "./src/lexer";
import { Parser } from "./src/parser";

const source = `
async fn getValue(): Promise<i32> {
  return 42
}
`;

const lexer = new Lexer(source);
const { tokens, errors: lexErrors } = lexer.tokenize();

console.log("Tokens:");
tokens.forEach(t => {
  if (t.type !== "EOF") {
    console.log(`  ${t.type}: ${t.lexeme}`);
  }
});

if (lexErrors.length > 0) {
  console.log("Lex Errors:", lexErrors);
  process.exit(1);
}

const parser = new Parser(tokens);
const { program, errors: parseErrors } = parser.parse();

console.log("\nParsed Program:");
console.log(JSON.stringify(program, null, 2));

if (parseErrors.length > 0) {
  console.log("Parse Errors:", parseErrors);
  process.exit(1);
}

console.log("\nSuccess!");
