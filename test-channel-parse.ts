// Quick test for channel parsing

import { Lexer } from "./src/lexer";
import { Parser } from "./src/parser";

const code = `
var ch = channel<i32>();
spawn {
  ch <- 42;
}
var x = <- ch;
println(str(x));
`;

const lexer = new Lexer(code);
const { tokens, errors: lexErrors } = lexer.tokenize();
if (lexErrors.length > 0) {
  console.log("Lex errors:", lexErrors);
  process.exit(1);
}

console.log("Tokens:");
tokens.slice(0, 20).forEach(t => console.log(`  ${t.type}: ${t.lexeme}`));

const parser = new Parser(tokens);
const { program, errors: parseErrors } = parser.parse();
if (parseErrors.length > 0) {
  console.log("Parse errors:", parseErrors);
  process.exit(1);
}

console.log("\nAST:");
console.log(JSON.stringify(program.stmts[0], null, 2));
console.log("\nSuccess!");
