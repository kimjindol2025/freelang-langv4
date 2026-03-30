// FreeLang v4 — AST 노드 정의

// ============================================================
// 타입 표기 (Type Annotations)
// ============================================================

export type TypeAnnotation =
  | { kind: "i32" }
  | { kind: "i64" }
  | { kind: "f64" }
  | { kind: "bool" }
  | { kind: "string" }
  | { kind: "void" }
  | { kind: "array"; element: TypeAnnotation }
  | { kind: "channel"; element: TypeAnnotation }
  | { kind: "option"; element: TypeAnnotation }
  | { kind: "result"; ok: TypeAnnotation; err: TypeAnnotation }
  | { kind: "promise"; element: TypeAnnotation }
  | { kind: "struct_ref"; name: string }
  | { kind: "fn"; params: TypeAnnotation[]; returnType: TypeAnnotation }
  | { kind: "type_param"; name: string }                                  // Generic 타입 파라미터 (T, K, V)
  | { kind: "generic_ref"; name: string; typeArgs: TypeAnnotation[] }   // 제네릭 타입 참조 (List<T>, Map<K,V>)
  | { kind: "trait_ref"; name: string }                                  // Trait 참조 (Drawable)
  | { kind: "self_type" };                                               // Self 타입

// ============================================================
// 패턴 (Match Patterns) — SPEC_05 Q8: 7종
// ============================================================

export type Pattern =
  | { kind: "ident"; name: string }         // x → 바인딩
  | { kind: "literal"; value: Expr }         // 42, "hello", true
  | { kind: "ok"; inner: Pattern }           // Ok(v)
  | { kind: "err"; inner: Pattern }          // Err(e)
  | { kind: "some"; inner: Pattern }         // Some(v)
  | { kind: "none" }                         // None
  | { kind: "wildcard" }                     // _
  | { kind: "struct"; name: string; fields: { name: string; pattern: Pattern; alias?: string }[]; rest: boolean }  // Point { x, y }
  | { kind: "array"; elements: Pattern[]; rest: boolean; restIndex?: number }  // [a, b, c]
  | { kind: "tuple"; elements: Pattern[]; rest: boolean; restIndex?: number }; // (a, b, c)

export type MatchArm = {
  pattern: Pattern;
  guard?: Expr;  // if 조건절
  body: Expr;
};

// ============================================================
// 식 (Expressions) — 값을 만든다
// ============================================================

export type FnParam = {
  name: string;
  type?: TypeAnnotation;
};

export type Expr =
  | { kind: "int_lit"; value: number; line: number; col: number }
  | { kind: "float_lit"; value: number; line: number; col: number }
  | { kind: "string_lit"; value: string; line: number; col: number }
  | { kind: "bool_lit"; value: boolean; line: number; col: number }
  | { kind: "ident"; name: string; line: number; col: number }
  | { kind: "binary"; op: string; left: Expr; right: Expr; line: number; col: number }
  | { kind: "unary"; op: string; operand: Expr; line: number; col: number }
  | { kind: "await"; expr: Expr; line: number; col: number }
  | { kind: "call"; callee: Expr; args: Expr[]; typeArgs?: TypeAnnotation[]; line: number; col: number }
  | { kind: "index"; object: Expr; index: Expr; line: number; col: number }
  | { kind: "field_access"; object: Expr; field: string; line: number; col: number }
  | { kind: "assign"; target: Expr; value: Expr; line: number; col: number }
  | { kind: "try"; operand: Expr; line: number; col: number }
  | { kind: "if_expr"; condition: Expr; then: Expr[]; else_: Expr[]; line: number; col: number }
  | { kind: "match_expr"; subject: Expr; arms: MatchArm[]; line: number; col: number }
  | { kind: "array_lit"; elements: Expr[]; line: number; col: number }
  | { kind: "struct_lit"; structName: string; fields: { name: string; value: Expr }[]; line: number; col: number }
  | { kind: "fn_lit"; params: FnParam[]; returnType?: TypeAnnotation; body: Expr; line: number; col: number }
  | { kind: "block_expr"; stmts: Stmt[]; expr: Expr | null; line: number; col: number }
  | { kind: "chan_new"; element: TypeAnnotation; line: number; col: number }
  | { kind: "chan_send"; chan: Expr; value: Expr; line: number; col: number }
  | { kind: "chan_recv"; chan: Expr; line: number; col: number };

// ============================================================
// 문 (Statements) — 값을 만들지 않는다
// ============================================================

export type Param = {
  name: string;
  type: TypeAnnotation;
};

export type StructField = {
  name: string;
  type: TypeAnnotation;
};

export type TraitMethod = {
  name: string;
  params: Param[];
  returnType: TypeAnnotation;
  line: number;
  col: number;
};

export type ImplMethod = {
  name: string;
  params: Param[];
  returnType: TypeAnnotation;
  body: Stmt[];
  line: number;
  col: number;
};

export type ImportItem = {
  name: string;
  alias?: string;
};

export type ImportDecl = {
  kind: "import_decl";
  source: string;
  items: ImportItem[];
  default?: boolean;
  line: number;
  col: number;
};

export type ExportDecl = {
  kind: "export_decl";
  target: Stmt | string[];
  line: number;
  col: number;
};

export type Stmt =
  | { kind: "var_decl"; name: string; mutable: boolean; type: TypeAnnotation | null; init: Expr; line: number; col: number }
  | { kind: "fn_decl"; name: string; isAsync: boolean; typeParams: string[]; params: Param[]; returnType: TypeAnnotation; body: Stmt[]; line: number; col: number }
  | { kind: "struct_decl"; name: string; typeParams: string[]; fields: StructField[]; line: number; col: number }
  | { kind: "trait_decl"; name: string; typeParams: string[]; methods: TraitMethod[]; line: number; col: number }
  | { kind: "impl_decl"; trait: string | null; forType: TypeAnnotation; typeParams: string[]; methods: ImplMethod[]; line: number; col: number }
  | { kind: "if_stmt"; condition: Expr; then: Stmt[]; else_: Stmt[] | null; line: number; col: number }
  | { kind: "match_stmt"; subject: Expr; arms: MatchArm[]; line: number; col: number }
  | { kind: "for_stmt"; variable: string; iterable: Expr; body: Stmt[]; line: number; col: number }
  | { kind: "for_of_stmt"; variable: string; iterable: Expr; body: Stmt[]; line: number; col: number }
  | { kind: "while_stmt"; condition: Expr; body: Stmt[]; line: number; col: number }
  | { kind: "break_stmt"; line: number; col: number }
  | { kind: "continue_stmt"; line: number; col: number }
  | { kind: "spawn_stmt"; body: Stmt[]; line: number; col: number }
  | { kind: "return_stmt"; value: Expr | null; line: number; col: number }
  | { kind: "expr_stmt"; expr: Expr; line: number; col: number }
  | ImportDecl
  | ExportDecl;

// ============================================================
// 프로그램 (최상위)
// ============================================================

export type Program = {
  stmts: Stmt[];
};
