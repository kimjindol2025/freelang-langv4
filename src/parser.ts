// FreeLang v4 — Parser (SPEC_05 구현)
// RD(문) + Pratt(식) 하이브리드

import { Token, TokenType } from "./lexer";
import {
  Program, Stmt, Expr, TypeAnnotation, Pattern, MatchArm, Param, StructField, FnParam, ImportDecl, ExportDecl, ImportItem,
} from "./ast";

// ============================================================
// ParseError
// ============================================================

export type ParseError = {
  message: string;
  line: number;
  col: number;
};

// ============================================================
// Binding Power (SPEC_05 Q4)
// ============================================================

const BP_ASSIGN = 10;
const BP_OR = 20;
const BP_AND = 30;
const BP_EQUALITY = 40;
const BP_COMPARISON = 50;
const BP_ADDITIVE = 60;
const BP_MULTIPLICATIVE = 70;
const BP_UNARY = 90;
const BP_POSTFIX = 100;

function infixBP(type: TokenType): number {
  switch (type) {
    // EQ는 Pratt에서 처리하지 않음 → ExprStmt에서 할당으로 처리
    case TokenType.OR: return BP_OR;
    case TokenType.AND: return BP_AND;
    case TokenType.EQEQ:
    case TokenType.NEQ: return BP_EQUALITY;
    case TokenType.LT:
    case TokenType.GT:
    case TokenType.LTEQ:
    case TokenType.GTEQ: return BP_COMPARISON;
    case TokenType.PLUS:
    case TokenType.MINUS: return BP_ADDITIVE;
    case TokenType.STAR:
    case TokenType.SLASH:
    case TokenType.PERCENT: return BP_MULTIPLICATIVE;
    case TokenType.LARROW: return BP_ASSIGN;  // 채널 송신
    case TokenType.LPAREN:
    case TokenType.LBRACKET:
    case TokenType.DOT:
    case TokenType.QUESTION: return BP_POSTFIX;
    default: return 0;
  }
}

// ============================================================
// Parser
// ============================================================

export class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): { program: Program; errors: ParseError[] } {
    const stmts: Stmt[] = [];
    while (!this.isAtEnd()) {
      try {
        stmts.push(this.parseStmt());
      } catch (e) {
        // 에러 복구: 다음 문 시작까지 건너뜀
        this.synchronize();
      }
    }
    return { program: { stmts }, errors: this.errors };
  }

  // ============================================================
  // 문 파싱 — Recursive Descent (SPEC_05 Q1)
  // ============================================================

  private parseStmt(): Stmt {
    const tok = this.peek();

    switch (tok.type) {
      case TokenType.IMPORT:
        return this.parseImportStmt();
      case TokenType.EXPORT:
        return this.parseExportStmt();
      case TokenType.VAR:
      case TokenType.LET:
      case TokenType.CONST:
        return this.parseVarDecl();
      case TokenType.ASYNC:
      case TokenType.FN:
        return this.parseFnDecl();
      case TokenType.STRUCT:
        return this.parseStructDecl();
      case TokenType.TRAIT:
        return this.parseTraitDecl();
      case TokenType.IMPL:
        return this.parseImplDecl();
      case TokenType.IF:
        return this.parseIfStmt();
      case TokenType.MATCH:
        return this.parseMatchStmt();
      case TokenType.FOR:
        return this.parseForStmt();
      case TokenType.WHILE:
        return this.parseWhileStmt();
      case TokenType.BREAK:
        return this.parseBreakStmt();
      case TokenType.CONTINUE:
        return this.parseContinueStmt();
      case TokenType.SPAWN:
        return this.parseSpawnStmt();
      case TokenType.RETURN:
        return this.parseReturnStmt();
      default:
        return this.parseExprStmt();
    }
  }

  // var/let/const 선언
  private parseVarDecl(): Stmt {
    const kw = this.advance(); // var/let/const
    const mutable = kw.type === TokenType.VAR;
    const name = this.expectIdent("variable name");
    let type: TypeAnnotation | null = null;

    if (this.check(TokenType.COLON)) {
      this.advance(); // :
      type = this.parseType();
    }

    this.expect(TokenType.EQ, "expected '=' in variable declaration");
    const init = this.parseExpr(0);
    this.match(TokenType.SEMICOLON); // optional semicolon

    return { kind: "var_decl", name, mutable, type, init, line: kw.line, col: kw.col };
  }

  // fn 선언 (async fn 지원)
  private parseFnDecl(): Stmt {
    let isAsync = false;
    let kw = this.peek();

    // async 키워드 확인
    if (this.match(TokenType.ASYNC)) {
      isAsync = true;
    }

    kw = this.advance(); // fn
    const name = this.expectIdent("function name");

    // Generic 타입 파라미터: fn foo<T, K>(...) [STEP B-1]
    const typeParams: string[] = [];
    if (this.match(TokenType.LT)) {
      do {
        typeParams.push(this.expectIdent("type parameter"));
      } while (this.match(TokenType.COMMA));
      this.expect(TokenType.GT, "expected '>' after type parameters");
    }

    this.expect(TokenType.LPAREN, "expected '(' after function name");

    const params: Param[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const pName = this.expectIdent("parameter name");
        this.expect(TokenType.COLON, "expected ':' after parameter name");
        const pType = this.parseType();
        params.push({ name: pName, type: pType });
      } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RPAREN, "expected ')' after parameters");

    // 반환 타입 (필수 — SPEC_06: 함수 시그니처 명시)
    this.expect(TokenType.RARROW, "expected '->' for return type");
    const returnType = this.parseType();

    this.expect(TokenType.LBRACE, "expected '{' for function body");
    const body = this.parseBlock();

    return { kind: "fn_decl", name, isAsync, typeParams, params, returnType, body, line: kw.line, col: kw.col };
  }

  // struct 선언
  private parseStructDecl(): Stmt {
    const kw = this.advance(); // struct
    const name = this.expectIdent("struct name");

    // Generic 타입 파라미터: struct Box<T> [STEP B-2]
    const typeParams: string[] = [];
    if (this.match(TokenType.LT)) {
      do {
        typeParams.push(this.expectIdent("type parameter"));
      } while (this.match(TokenType.COMMA));
      this.expect(TokenType.GT, "expected '>' after type parameters");
    }

    this.expect(TokenType.LBRACE, "expected '{' after struct name");

    const fields: StructField[] = [];
    if (!this.check(TokenType.RBRACE)) {
      do {
        const fieldName = this.expectIdent("field name");
        this.expect(TokenType.COLON, "expected ':' after field name");
        const fieldType = this.parseType();
        fields.push({ name: fieldName, type: fieldType });
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RBRACE, "expected '}' to close struct");

    return { kind: "struct_decl", name, typeParams, fields, line: kw.line, col: kw.col };
  }

  // trait 선언
  private parseTraitDecl(): Stmt {
    const kw = this.advance(); // trait
    const name = this.expectIdent("trait name");

    // Generic 타입 파라미터
    const typeParams: string[] = [];
    if (this.match(TokenType.LT)) {
      do {
        typeParams.push(this.expectIdent("type parameter"));
      } while (this.match(TokenType.COMMA));
      this.expect(TokenType.GT, "expected '>' after type parameters");
    }

    this.expect(TokenType.LBRACE, "expected '{' after trait name");

    const methods: any[] = [];
    if (!this.check(TokenType.RBRACE)) {
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        const mLine = this.peek().line;
        const mCol = this.peek().col;
        this.expect(TokenType.FN, "expected 'fn' in trait method");
        const methodName = this.expectIdent("method name");

        this.expect(TokenType.LPAREN, "expected '(' after method name");
        const params: Param[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            const pName = this.expectIdent("parameter name");
            // self는 타입 명시 없음
            if (pName === "self") {
              if (this.check(TokenType.COMMA)) {
                this.advance(); // consume comma
                params.push({ name: pName, type: { kind: "self_type" } });
                continue;
              } else if (this.check(TokenType.RPAREN)) {
                params.push({ name: pName, type: { kind: "self_type" } });
                break;
              }
            }
            // 일반 파라미터
            this.expect(TokenType.COLON, "expected ':' after parameter name");
            const pType = this.parseType();
            params.push({ name: pName, type: pType });
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, "expected ')' after method parameters");

        this.expect(TokenType.RARROW, "expected '->' for return type");
        const returnType = this.parseType();
        this.match(TokenType.SEMICOLON);

        methods.push({ name: methodName, params, returnType, line: mLine, col: mCol });
      }
    }

    this.expect(TokenType.RBRACE, "expected '}' to close trait");

    return { kind: "trait_decl", name, typeParams, methods, line: kw.line, col: kw.col };
  }

  // impl 선언
  private parseImplDecl(): Stmt {
    const kw = this.advance(); // impl

    // Generic 타입 파라미터
    const typeParams: string[] = [];
    if (this.match(TokenType.LT)) {
      do {
        typeParams.push(this.expectIdent("type parameter"));
      } while (this.match(TokenType.COMMA));
      this.expect(TokenType.GT, "expected '>' after type parameters");
    }

    // Trait name: impl [Drawable] for Circle
    let trait: string | null = null;
    let forType: TypeAnnotation;

    // Check if it's "impl Trait for Type" or just "impl Type"
    const savedPos = this.pos;
    if (this.peek().type === TokenType.IDENT) {
      const firstIdent = this.peek().lexeme;
      this.advance(); // consume identifier

      if (this.match(TokenType.FOR)) {
        // It was "impl Trait for Type"
        trait = firstIdent;
        forType = this.parseType();
      } else {
        // It was "impl Type" (inherent impl) — reset and parse as type
        this.pos = savedPos;
        forType = this.parseType();
      }
    } else {
      forType = this.parseType();
    }

    this.expect(TokenType.LBRACE, "expected '{' for impl body");

    const methods: any[] = [];
    if (!this.check(TokenType.RBRACE)) {
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        const mLine = this.peek().line;
        const mCol = this.peek().col;
        this.expect(TokenType.FN, "expected 'fn' in impl method");
        const methodName = this.expectIdent("method name");

        this.expect(TokenType.LPAREN, "expected '(' after method name");
        const params: Param[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            const pName = this.expectIdent("parameter name");
            // self는 타입 명시 없음
            if (pName === "self") {
              if (this.check(TokenType.COMMA)) {
                this.advance(); // consume comma
                params.push({ name: pName, type: { kind: "self_type" } });
                continue;
              } else if (this.check(TokenType.RPAREN)) {
                params.push({ name: pName, type: { kind: "self_type" } });
                break;
              }
            }
            // 일반 파라미터
            this.expect(TokenType.COLON, "expected ':' after parameter name");
            const pType = this.parseType();
            params.push({ name: pName, type: pType });
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, "expected ')' after method parameters");

        this.expect(TokenType.RARROW, "expected '->' for return type");
        const returnType = this.parseType();

        this.expect(TokenType.LBRACE, "expected '{' for method body");
        const body = this.parseBlock();

        methods.push({ name: methodName, params, returnType, body, line: mLine, col: mCol });
      }
    }

    this.expect(TokenType.RBRACE, "expected '}' to close impl");

    return { kind: "impl_decl", trait, forType, typeParams, methods, line: kw.line, col: kw.col };
  }

  // if 문 (문 위치)
  private parseIfStmt(): Stmt {
    const kw = this.advance(); // if
    const condition = this.parseExpr(0);
    this.expect(TokenType.LBRACE, "expected '{' after if condition");
    const then = this.parseBlock();

    let else_: Stmt[] | null = null;
    if (this.match(TokenType.ELSE)) {
      if (this.check(TokenType.IF)) {
        // else if 체인
        else_ = [this.parseIfStmt()];
      } else {
        this.expect(TokenType.LBRACE, "expected '{' after else");
        else_ = this.parseBlock();
      }
    }

    return { kind: "if_stmt", condition, then, else_, line: kw.line, col: kw.col };
  }

  // match 문
  private parseMatchStmt(): Stmt {
    const kw = this.advance(); // match
    const subject = this.parseExpr(0);
    this.expect(TokenType.LBRACE, "expected '{' after match expression");
    const arms = this.parseMatchArms();
    this.expect(TokenType.RBRACE, "expected '}' to close match");

    return { kind: "match_stmt", subject, arms, line: kw.line, col: kw.col };
  }

  // for 문
  private parseForStmt(): Stmt {
    const kw = this.advance(); // for
    const variable = this.expectIdent("loop variable");

    // for...in or for...of
    const loopType = this.peek().type;
    if (loopType === TokenType.IN) {
      this.advance(); // in
      const iterable = this.parseExpr(0);
      this.expect(TokenType.LBRACE, "expected '{' after for...in");
      const body = this.parseBlock();
      return { kind: "for_stmt", variable, iterable, body, line: kw.line, col: kw.col };
    } else if (loopType === TokenType.OF) {
      this.advance(); // of
      const iterable = this.parseExpr(0);
      this.expect(TokenType.LBRACE, "expected '{' after for...of");
      const body = this.parseBlock();
      return { kind: "for_of_stmt", variable, iterable, body, line: kw.line, col: kw.col };
    } else {
      this.error("expected 'in' or 'of' after loop variable", this.peek());
      return { kind: "for_stmt", variable, iterable: { kind: "ident", name: "", line: kw.line, col: kw.col }, body: [], line: kw.line, col: kw.col };
    }
  }

  // while 문
  private parseWhileStmt(): Stmt {
    const kw = this.advance(); // while
    const condition = this.parseExpr(0);
    this.expect(TokenType.LBRACE, "expected '{' after while condition");
    const body = this.parseBlock();

    return { kind: "while_stmt", condition, body, line: kw.line, col: kw.col };
  }

  // break 문
  private parseBreakStmt(): Stmt {
    const kw = this.advance(); // break
    this.match(TokenType.SEMICOLON); // optional semicolon
    return { kind: "break_stmt", line: kw.line, col: kw.col };
  }

  // continue 문
  private parseContinueStmt(): Stmt {
    const kw = this.advance(); // continue
    this.match(TokenType.SEMICOLON); // optional semicolon
    return { kind: "continue_stmt", line: kw.line, col: kw.col };
  }

  // spawn 문
  private parseSpawnStmt(): Stmt {
    const kw = this.advance(); // spawn
    this.expect(TokenType.LBRACE, "expected '{' after spawn");
    const body = this.parseBlock();

    return { kind: "spawn_stmt", body, line: kw.line, col: kw.col };
  }

  // import 문 파싱
  private parseImportStmt(): ImportDecl {
    const kw = this.advance(); // import
    const items: ImportItem[] = [];
    let default_ = false;

    if (this.check(TokenType.LBRACE)) {
      this.advance(); // {
      if (!this.check(TokenType.RBRACE)) {
        do {
          const name = this.expectIdent("imported name");
          let alias: string | undefined;
          if (this.match(TokenType.AS)) {
            alias = this.expectIdent("alias");
          }
          items.push({ name, alias });
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RBRACE, "expected '}' after import items");
    } else {
      const name = this.expectIdent("module name");
      items.push({ name });
      default_ = true;
    }

    this.expect(TokenType.FROM, "expected 'from' in import statement");
    const sourceToken = this.peek();
    if (sourceToken.type !== TokenType.STRING_LIT) {
      this.error("expected string literal for module source", sourceToken);
      throw new Error("expected module path");
    }
    const source = this.advance().lexeme;
    this.match(TokenType.SEMICOLON);

    return { kind: "import_decl", source, items, default: default_, line: kw.line, col: kw.col };
  }

  // export 문 파싱
  private parseExportStmt(): ExportDecl {
    const kw = this.advance(); // export

    if (this.check(TokenType.FN) || this.check(TokenType.STRUCT)) {
      const target = this.parseStmt();
      return { kind: "export_decl", target, line: kw.line, col: kw.col };
    }

    if (this.check(TokenType.LBRACE)) {
      this.advance(); // {
      const names: string[] = [];
      if (!this.check(TokenType.RBRACE)) {
        do {
          names.push(this.expectIdent("export name"));
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RBRACE, "expected '}' after export names");
      this.match(TokenType.SEMICOLON);
      return { kind: "export_decl", target: names, line: kw.line, col: kw.col };
    }

    this.error("expected 'fn', 'struct', or '{' after 'export'", kw);
    throw new Error("invalid export syntax");
  }

  // return 문
  private parseReturnStmt(): Stmt {
    const kw = this.advance(); // return

    // return 뒤에 식이 있는지 확인
    let value: Expr | null = null;
    if (!this.check(TokenType.RBRACE) && !this.isAtEnd() && !this.isStmtStart()) {
      value = this.parseExpr(0);
    }
    this.match(TokenType.SEMICOLON); // optional semicolon

    return { kind: "return_stmt", value, line: kw.line, col: kw.col };
  }

  // 식 문 (ExprStmt)
  private parseExprStmt(): Stmt {
    const tok = this.peek();
    const expr = this.parseExpr(0);

    // 할당 처리: expr = value
    if (this.check(TokenType.EQ)) {
      const eq = this.advance();
      const value = this.parseExpr(0);
      this.match(TokenType.SEMICOLON); // optional semicolon
      return {
        kind: "expr_stmt",
        expr: { kind: "assign", target: expr, value, line: eq.line, col: eq.col },
        line: tok.line,
        col: tok.col,
      };
    }

    this.match(TokenType.SEMICOLON); // optional semicolon
    return { kind: "expr_stmt", expr, line: tok.line, col: tok.col };
  }

  // ============================================================
  // 블록 파싱 ({ 이미 소비됨, } 소비함 )
  // ============================================================

  private parseBlock(): Stmt[] {
    const stmts: Stmt[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      try {
        stmts.push(this.parseStmt());
      } catch {
        this.synchronize();
      }
    }
    this.expect(TokenType.RBRACE, "expected '}'");
    return stmts;
  }

  // ============================================================
  // 식 파싱 — Pratt Parser (SPEC_05 Q3, Q4)
  // ============================================================

  private parseExpr(minBP: number): Expr {
    let left = this.nud();

    while (!this.isAtEnd()) {
      const tok = this.peek();

      // 구조체 리터럴: ident { field: value, ... }
      // Lookahead: { 다음이 ident: 패턴인지 확인 (while/if 블록과 구분)
      if (tok.type === TokenType.LBRACE && left.kind === "ident") {
        // Lookahead: 다음 토큰이 ident이고, 그 다음이 :인지 확인
        if (this.pos + 1 < this.tokens.length &&
            this.tokens[this.pos + 1].type === TokenType.IDENT &&
            this.pos + 2 < this.tokens.length &&
            this.tokens[this.pos + 2].type === TokenType.COLON) {
          this.advance(); // {
          const fields: { name: string; value: Expr }[] = [];
          if (!this.check(TokenType.RBRACE)) {
            do {
              const name = this.expectIdent("field name");
              this.expect(TokenType.COLON, "expected ':' after field name");
              const value = this.parseExpr(0);
              fields.push({ name, value });
            } while (this.match(TokenType.COMMA));
          }
          this.expect(TokenType.RBRACE, "expected '}'");
          left = { kind: "struct_lit", structName: left.name, fields, line: left.line, col: left.col };
          continue;
        }
      }

      const bp = infixBP(tok.type);
      if (bp <= minBP) break;

      left = this.led(left, bp);
    }

    return left;
  }

  // nud — prefix 위치
  private nud(): Expr {
    const tok = this.peek();

    // 정수 리터럴
    if (tok.type === TokenType.INT_LIT) {
      this.advance();
      const raw = tok.lexeme.replace(/_/g, "");
      return { kind: "int_lit", value: parseInt(raw, 10), line: tok.line, col: tok.col };
    }

    // 부동소수점 리터럴
    if (tok.type === TokenType.FLOAT_LIT) {
      this.advance();
      const raw = tok.lexeme.replace(/_/g, "");
      return { kind: "float_lit", value: parseFloat(raw), line: tok.line, col: tok.col };
    }

    // 문자열 리터럴
    if (tok.type === TokenType.STRING_LIT) {
      this.advance();
      return { kind: "string_lit", value: tok.lexeme, line: tok.line, col: tok.col };
    }

    // 불리언 리터럴
    if (tok.type === TokenType.TRUE) {
      this.advance();
      return { kind: "bool_lit", value: true, line: tok.line, col: tok.col };
    }
    if (tok.type === TokenType.FALSE) {
      this.advance();
      return { kind: "bool_lit", value: false, line: tok.line, col: tok.col };
    }

    // 식별자 또는 channel<T>
    if (tok.type === TokenType.IDENT || tok.type === TokenType.TYPE_CHANNEL) {
      const identTok = this.advance();
      const name = identTok.lexeme;

      // channel<T> 특별 처리
      if (name === "channel" && this.check(TokenType.LT)) {
        this.advance(); // <
        const element = this.parseType();
        this.expect(TokenType.GT, "expected '>' after channel type");
        this.expect(TokenType.LPAREN, "expected '()' after channel<T>");
        this.expect(TokenType.RPAREN, "expected ')'");
        return { kind: "chan_new", element, line: identTok.line, col: identTok.col };
      }

      return { kind: "ident", name, line: identTok.line, col: identTok.col };
    }

    // 단항 연산자: - !
    if (tok.type === TokenType.MINUS || tok.type === TokenType.NOT) {
      this.advance();
      const operand = this.parseExpr(BP_UNARY);
      return { kind: "unary", op: tok.lexeme, operand, line: tok.line, col: tok.col };
    }

    // await 연산자
    if (tok.type === TokenType.AWAIT) {
      this.advance();
      const expr = this.parseExpr(BP_UNARY);
      return { kind: "await", expr, line: tok.line, col: tok.col };
    }

    // 괄호 그룹: ( expr )
    if (tok.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpr(0);
      this.expect(TokenType.RPAREN, "expected ')'");
      return expr;
    }

    // 배열 리터럴: [ elem, ... ]
    if (tok.type === TokenType.LBRACKET) {
      return this.parseArrayLit();
    }

    // if 식 (식 위치)
    if (tok.type === TokenType.IF) {
      return this.parseIfExpr();
    }

    // match 식 (식 위치)
    if (tok.type === TokenType.MATCH) {
      return this.parseMatchExpr();
    }

    // 함수 리터럴 (람다): fn(x: i32) -> i32 { x + 1 }
    if (tok.type === TokenType.FN) {
      return this.parseFnLit();
    }

    // 채널 수신: <- chan
    if (tok.type === TokenType.LARROW) {
      this.advance();
      const chan = this.parseExpr(BP_UNARY);
      return { kind: "chan_recv", chan, line: tok.line, col: tok.col };
    }

    this.error(`unexpected token: ${tok.lexeme}`, tok);
    this.advance();
    return { kind: "ident", name: "__error__", line: tok.line, col: tok.col };
  }

  // led — infix/postfix 위치
  private led(left: Expr, bp: number): Expr {
    const tok = this.peek();

    // 함수 호출: expr(args) 형태만 지원 (generic call은 제한)
    // 제네릭 호출은 <T> 타입 인자를 파싱하기 위해 복잡한 lookahead가 필요하므로,
    // 여기서는 skip하고 나중에 추가 개선

    // 이항 연산자
    if (
      tok.type === TokenType.PLUS || tok.type === TokenType.MINUS ||
      tok.type === TokenType.STAR || tok.type === TokenType.SLASH ||
      tok.type === TokenType.PERCENT ||
      tok.type === TokenType.EQEQ || tok.type === TokenType.NEQ ||
      tok.type === TokenType.LT || tok.type === TokenType.GT ||
      tok.type === TokenType.LTEQ || tok.type === TokenType.GTEQ ||
      tok.type === TokenType.AND || tok.type === TokenType.OR
    ) {
      this.advance();
      const right = this.parseExpr(bp); // left-associative
      return { kind: "binary", op: tok.lexeme, left, right, line: tok.line, col: tok.col };
    }

    if (tok.type === TokenType.LPAREN) {
      this.advance();
      const args: Expr[] = [];
      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.parseExpr(0));
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RPAREN, "expected ')' after arguments");
      return { kind: "call", callee: left, args, line: tok.line, col: tok.col };
    }

    // 인덱스: expr[index]
    if (tok.type === TokenType.LBRACKET) {
      this.advance();
      const index = this.parseExpr(0);
      this.expect(TokenType.RBRACKET, "expected ']'");
      return { kind: "index", object: left, index, line: tok.line, col: tok.col };
    }

    // 필드 접근: expr.field
    if (tok.type === TokenType.DOT) {
      this.advance();
      const field = this.expectIdent("field name");
      return { kind: "field_access", object: left, field, line: tok.line, col: tok.col };
    }

    // try 연산자: expr?
    if (tok.type === TokenType.QUESTION) {
      this.advance();
      return { kind: "try", operand: left, line: tok.line, col: tok.col };
    }

    // 채널 송신: chan <- value
    if (tok.type === TokenType.LARROW) {
      this.advance();
      const value = this.parseExpr(BP_ASSIGN);
      return { kind: "chan_send", chan: left, value, line: tok.line, col: tok.col };
    }

    // 할당은 ExprStmt에서 처리하므로 여기선 패스
    // EQ가 여기 오면 식 끝으로 처리
    this.error(`unexpected operator: ${tok.lexeme}`, tok);
    this.advance();
    return left;
  }

  // ============================================================
  // 복합 식 파싱
  // ============================================================

  // 배열 리터럴: [a, b, c]
  private parseArrayLit(): Expr {
    const tok = this.advance(); // [
    const elements: Expr[] = [];
    if (!this.check(TokenType.RBRACKET)) {
      do {
        elements.push(this.parseExpr(0));
      } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RBRACKET, "expected ']'");
    return { kind: "array_lit", elements, line: tok.line, col: tok.col };
  }

  // 구조체 리터럴: { name: expr, ... }
  // if 식 (식 위치, else 필수 — SPEC_06)
  private parseIfExpr(): Expr {
    const tok = this.advance(); // if
    const condition = this.parseExpr(0);
    this.expect(TokenType.LBRACE, "expected '{' after if condition");
    const then = this.parseBlockExprs();
    this.expect(TokenType.ELSE, "if expression requires else branch");
    this.expect(TokenType.LBRACE, "expected '{' after else");
    const else_ = this.parseBlockExprs();
    return { kind: "if_expr", condition, then, else_, line: tok.line, col: tok.col };
  }

  // match 식 (식 위치)
  private parseMatchExpr(): Expr {
    const tok = this.advance(); // match
    const subject = this.parseExpr(0);
    this.expect(TokenType.LBRACE, "expected '{' after match expression");
    const arms = this.parseMatchArms();
    this.expect(TokenType.RBRACE, "expected '}' to close match");
    return { kind: "match_expr", subject, arms, line: tok.line, col: tok.col };
  }

  // 블록 내 식 목록 (if/match 식의 body) → } 소비
  private parseBlockExprs(): Expr[] {
    const exprs: Expr[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      exprs.push(this.parseExpr(0));
    }
    this.expect(TokenType.RBRACE, "expected '}'");
    return exprs;
  }

  // ============================================================
  // match arms
  // ============================================================

  private parseMatchArms(): MatchArm[] {
    const arms: MatchArm[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const pattern = this.parsePattern();

      // Guard 절 파싱: if 조건
      let guard: Expr | undefined = undefined;
      if (this.match(TokenType.IF)) {
        guard = this.parseExpr(0);
      }

      this.expect(TokenType.ARROW, "expected '=>' after pattern");

      let body: Expr;
      if (this.check(TokenType.LBRACE)) {
        // 블록 body
        const bTok = this.advance(); // {
        const stmts: Stmt[] = [];
        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
          stmts.push(this.parseStmt());
        }
        this.expect(TokenType.RBRACE, "expected '}'");
        // 블록의 마지막 문이 ExprStmt면 그 식이 반환값
        const lastExpr = stmts.length > 0 && stmts[stmts.length - 1].kind === "expr_stmt"
          ? (stmts[stmts.length - 1] as any).expr
          : null;
        body = { kind: "block_expr", stmts: stmts.slice(0, lastExpr ? -1 : stmts.length), expr: lastExpr, line: bTok.line, col: bTok.col };
      } else {
        body = this.parseExpr(0);
      }

      this.match(TokenType.COMMA); // trailing comma optional
      arms.push({ pattern, guard, body });
    }
    return arms;
  }

  // 함수 리터럴: fn(x: i32, y: i32) -> i32 { x + y }
  private parseFnLit(): Expr {
    const kw = this.advance(); // fn
    this.expect(TokenType.LPAREN, "expected '(' after fn");

    const params: FnParam[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const name = this.expectIdent("parameter name");
        let type: TypeAnnotation | undefined = undefined;
        if (this.match(TokenType.COLON)) {
          type = this.parseType();
        }
        params.push({ name, type });
      } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RPAREN, "expected ')' after parameters");

    let returnType: TypeAnnotation | undefined = undefined;
    if (this.match(TokenType.RARROW)) {
      returnType = this.parseType();
    }

    // body
    let body: Expr;
    if (this.check(TokenType.LBRACE)) {
      const bTok = this.advance(); // {
      const stmts: Stmt[] = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        stmts.push(this.parseStmt());
      }
      this.expect(TokenType.RBRACE, "expected '}'");
      const lastExpr = stmts.length > 0 && stmts[stmts.length - 1].kind === "expr_stmt"
        ? (stmts[stmts.length - 1] as any).expr
        : null;
      body = { kind: "block_expr", stmts: stmts.slice(0, lastExpr ? -1 : stmts.length), expr: lastExpr, line: bTok.line, col: bTok.col };
    } else {
      body = this.parseExpr(0);
    }

    return { kind: "fn_lit", params, returnType, body, line: kw.line, col: kw.col };
  }

  // ============================================================
  // 패턴 파싱 (SPEC_05 Q8)
  // ============================================================

  private parsePattern(): Pattern {
    const tok = this.peek();

    // _ (wildcard)
    if (tok.type === TokenType.IDENT && tok.lexeme === "_") {
      this.advance();
      return { kind: "wildcard" };
    }

    // Ok(p), Err(p), Some(p), None
    if (tok.type === TokenType.IDENT) {
      if (tok.lexeme === "Ok" || tok.lexeme === "Err" || tok.lexeme === "Some") {
        this.advance();
        this.expect(TokenType.LPAREN, `expected '(' after ${tok.lexeme}`);
        const inner = this.parsePattern();
        this.expect(TokenType.RPAREN, "expected ')'");
        if (tok.lexeme === "Ok") return { kind: "ok", inner };
        if (tok.lexeme === "Err") return { kind: "err", inner };
        return { kind: "some", inner };
      }
      if (tok.lexeme === "None") {
        this.advance();
        return { kind: "none" };
      }

      // 구조 분해: Point { x, y }, Point { x as px, y as py }, Point { name, .. }
      const ident = tok.lexeme;
      this.advance();

      if (this.check(TokenType.LBRACE)) {
        this.advance(); // {
        const fields: { name: string; pattern: Pattern; alias?: string }[] = [];
        let rest = false;

        // 구조체 필드 파싱 (빈 중괄호도 허용)
        if (!this.check(TokenType.RBRACE)) {
          while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            if (this.match(TokenType.DOTDOT)) {
              rest = true;
              break;
            }

            const fieldName = this.expectIdent("field name");
            let fieldPattern: Pattern;
            let alias: string | undefined = undefined;

            if (this.match(TokenType.AS)) {
              alias = this.expectIdent("alias name");
              fieldPattern = { kind: "ident", name: alias };
            } else {
              fieldPattern = { kind: "ident", name: fieldName };
            }

            fields.push({ name: fieldName, pattern: fieldPattern, alias });

            if (!this.match(TokenType.COMMA)) break;
          }
        }

        this.expect(TokenType.RBRACE, "expected '}'");
        return { kind: "struct", name: ident, fields, rest };
      }

      // 일반 식별자 바인딩
      return { kind: "ident", name: ident };
    }

    // 배열 분해: [a, b, c], [x, .., y]
    if (tok.type === TokenType.LBRACKET) {
      this.advance(); // [
      const elements: Pattern[] = [];
      let rest = false;
      let restIndex: number | undefined = undefined;

      while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
        if (this.check(TokenType.DOTDOT)) {
          this.advance(); // ..
          rest = true;
          restIndex = elements.length;
          if (this.match(TokenType.COMMA)) {
            // [x, .., y] 형태: 나머지 후 계속
            while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
              elements.push(this.parsePattern());
              if (!this.match(TokenType.COMMA)) break;
            }
          }
          break;
        }

        elements.push(this.parsePattern());

        if (!this.match(TokenType.COMMA)) break;
      }

      this.expect(TokenType.RBRACKET, "expected ']'");
      return { kind: "array", elements, rest, restIndex };
    }

    // 리터럴 패턴
    if (tok.type === TokenType.INT_LIT || tok.type === TokenType.FLOAT_LIT ||
        tok.type === TokenType.STRING_LIT || tok.type === TokenType.TRUE ||
        tok.type === TokenType.FALSE) {
      const expr = this.nud();
      return { kind: "literal", value: expr };
    }

    // 단항 마이너스 (음수 리터럴 패턴)
    if (tok.type === TokenType.MINUS) {
      const expr = this.nud(); // unary minus
      return { kind: "literal", value: expr };
    }

    this.error("expected pattern", tok);
    this.advance();
    return { kind: "wildcard" };
  }

  // ============================================================
  // 타입 파싱
  // ============================================================

  private parseType(): TypeAnnotation {
    const tok = this.peek();

    // fn(T1, T2) -> R 함수 타입
    if (tok.type === TokenType.FN) {
      this.advance(); // fn
      this.expect(TokenType.LPAREN, "expected '(' after fn");

      const params: TypeAnnotation[] = [];
      if (!this.check(TokenType.RPAREN)) {
        do {
          params.push(this.parseType());
        } while (this.match(TokenType.COMMA));
      }

      this.expect(TokenType.RPAREN, "expected ')' after fn params");
      this.expect(TokenType.RARROW, "expected '->' in fn type");
      const returnType = this.parseType();

      return { kind: "fn", params, returnType };
    }

    switch (tok.type) {
      case TokenType.TYPE_I32: this.advance(); return { kind: "i32" };
      case TokenType.TYPE_I64: this.advance(); return { kind: "i64" };
      case TokenType.TYPE_F64: this.advance(); return { kind: "f64" };
      case TokenType.TYPE_BOOL: this.advance(); return { kind: "bool" };
      case TokenType.TYPE_STRING: this.advance(); return { kind: "string" };
      case TokenType.TYPE_VOID: this.advance(); return { kind: "void" };
      default:
        break;
    }

    // [T] → 배열
    if (tok.type === TokenType.LBRACKET) {
      this.advance();
      const element = this.parseType();
      this.expect(TokenType.RBRACKET, "expected ']' for array type");
      return { kind: "array", element };
    }

    // channel<T>
    if (tok.type === TokenType.TYPE_CHANNEL) {
      this.advance();
      this.expect(TokenType.LT, "expected '<' after channel");
      const element = this.parseType();
      this.expect(TokenType.GT, "expected '>' for channel type");
      return { kind: "channel", element };
    }

    // IDENT: 타입 파라미터(T, K, V) 또는 Generic/Struct 타입 [STEP B-3]
    if (tok.type === TokenType.IDENT) {
      const name = tok.lexeme;
      this.advance();

      // 단일 대문자 → type_param (T, K, V)
      if (name.length === 1 && name >= 'A' && name <= 'Z') {
        return { kind: "type_param", name };
      }

      // Option<T>, Result<T,E>, Generic 타입, 커스텀 struct
      if (this.check(TokenType.LT)) {
        this.advance(); // LT 소비
        const typeArgs: TypeAnnotation[] = [];
        do {
          typeArgs.push(this.parseType());
        } while (this.match(TokenType.COMMA));
        this.expect(TokenType.GT, "expected '>' after type arguments");

        // 내장 제네릭 타입 매핑
        if (name === "Option") return { kind: "option", element: typeArgs[0] };
        if (name === "Result") return { kind: "result", ok: typeArgs[0], err: typeArgs[1] };
        if (name === "Promise") return { kind: "promise", element: typeArgs[0] };
        return { kind: "generic_ref", name, typeArgs };
      }

      return { kind: "struct_ref", name };
    }

    this.error(`expected type, got ${tok.lexeme}`, tok);
    this.advance();
    return { kind: "i32" }; // fallback
  }

  // ============================================================
  // 유틸리티
  // ============================================================

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    if (!this.isAtEnd()) this.pos++;
    return tok;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    const tok = this.peek();
    this.error(`${message} (got ${tok.type}: "${tok.lexeme}")`, tok);
    throw new Error(message);
  }

  private expectIdent(context: string): string {
    const tok = this.peek();
    if (tok.type === TokenType.IDENT) {
      this.advance();
      return tok.lexeme;
    }
    this.error(`expected ${context} (got ${tok.type}: "${tok.lexeme}")`, tok);
    throw new Error(`expected ${context}`);
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private isStmtStart(): boolean {
    const t = this.peek().type;
    return t === TokenType.VAR || t === TokenType.LET || t === TokenType.CONST ||
           t === TokenType.FN || t === TokenType.STRUCT || t === TokenType.IF || t === TokenType.MATCH ||
           t === TokenType.FOR || t === TokenType.WHILE || t === TokenType.BREAK || t === TokenType.CONTINUE ||
           t === TokenType.SPAWN || t === TokenType.RETURN || t === TokenType.IMPORT || t === TokenType.EXPORT;
  }

  private error(message: string, tok: Token): void {
    this.errors.push({ message, line: tok.line, col: tok.col });
  }

  private synchronize(): void {
    while (!this.isAtEnd()) {
      if (this.isStmtStart()) return;
      if (this.check(TokenType.RBRACE)) {
        this.advance();
        return;
      }
      this.advance();
    }
  }
}
