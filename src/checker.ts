// FreeLang v4 — TypeChecker (SPEC_06, 07, 08 구현)
// 정적 타입 검사 + Move/Copy 추적 + 스코프 관리

import { Program, Stmt, Expr, TypeAnnotation, Pattern, MatchArm, Param, ImportDecl, ExportDecl } from "./ast";

// ============================================================
// 내부 타입 표현
// ============================================================

export type Type =
  | { kind: "i32" }
  | { kind: "i64" }
  | { kind: "f64" }
  | { kind: "bool" }
  | { kind: "string" }
  | { kind: "void" }
  | { kind: "array"; element: Type }
  | { kind: "channel"; element: Type }
  | { kind: "option"; element: Type }
  | { kind: "result"; ok: Type; err: Type }
  | { kind: "promise"; element: Type }
  | { kind: "struct"; fields: Map<string, Type> }
  | { kind: "fn"; params: Type[]; returnType: Type }
  | { kind: "type_param"; name: string }                            // 제네릭 타입 파라미터 (T, K, V)
  | { kind: "generic_ref"; name: string; typeArgs: Type[] }         // 제네릭 타입 참조 (List<T>)
  | { kind: "trait"; name: string; methods: Map<string, { params: Type[]; returnType: Type }> }  // Trait
  | { kind: "unknown" };

// ============================================================
// CheckError — SPEC_06 Q9: 14종 에러
// ============================================================

export type CheckError = {
  message: string;
  line: number;
  col: number;
};

// ============================================================
// 변수 정보
// ============================================================

type VarInfo = {
  type: Type;
  mutable: boolean;
  moved: boolean;     // Move 타입이 이동됐는지 (SPEC_07)
  line: number;
  col: number;
};

// ============================================================
// 함수 정보
// ============================================================

type FnInfo = {
  params: { name: string; type: Type }[];
  returnType: Type;
};

// Generic 함수 정의 저장
type GenericFnDef = {
  typeParams: string[];
  params: { name: string; type: Type }[];
  returnType: Type;
};

// Generic 구조체 정의 저장
type GenericStructDef = {
  typeParams: string[];
  fields: Map<string, Type>;
};

// ============================================================
// 스코프 (SPEC_08: 3종 — global, function, block)
// ============================================================

class Scope {
  vars: Map<string, VarInfo> = new Map();
  parent: Scope | null;

  constructor(parent: Scope | null) {
    this.parent = parent;
  }

  define(name: string, info: VarInfo): void {
    this.vars.set(name, info);
  }

  lookup(name: string): VarInfo | null {
    const v = this.vars.get(name);
    if (v) return v;
    if (this.parent) return this.parent.lookup(name);
    return null;
  }
}

// ============================================================
// Copy vs Move (SPEC_07 Q2)
// ============================================================

function isCopyType(t: Type): boolean {
  switch (t.kind) {
    case "i32":
    case "i64":
    case "f64":
    case "bool":
    case "string":  // string은 immutable이므로 Copy (SPEC_06 Q8)
    case "array":   // array는 자동 복사본 전달 (SPEC_09: Copy-on-Pass)
      return true;
    case "option":
      return isCopyType(t.element);
    case "result":
      return isCopyType(t.ok) && isCopyType(t.err);
    case "promise":
      return false; // Promise는 Move 타입
    case "struct":
      return true;  // struct도 자동 복사본 전달 (SPEC_09: Copy-on-Pass)
    case "channel":
    case "fn":
      return false; // Move 타입 (채널, 함수는 Move)
    case "type_param":
      return true;  // Generic 타입 파라미터는 Copy로 취급 (Type Erasure)
    case "generic_ref":
      return true;  // Generic 타입도 기본적으로 Copy
    case "trait":
      return true;  // Trait은 기본적으로 Copy
    default:
      return true;
  }
}

// ============================================================
// 타입 동등 비교 (구조적 — SPEC_06 Q7)
// ============================================================

function typesEqual(a: Type, b: Type): boolean {
  // type_param은 항상 compatible (Type Erasure 전략)
  if (a.kind === "type_param" || b.kind === "type_param") return true;

  if (a.kind !== b.kind) return false;

  switch (a.kind) {
    case "i32": case "i64": case "f64": case "bool": case "string": case "void": case "unknown":
      return true;
    case "array":
      return typesEqual(a.element, (b as any).element);
    case "channel":
      return typesEqual(a.element, (b as any).element);
    case "option":
      return typesEqual(a.element, (b as any).element);
    case "result":
      return typesEqual(a.ok, (b as any).ok) && typesEqual(a.err, (b as any).err);
    case "promise":
      return typesEqual(a.element, (b as any).element);
    case "struct": {
      const bStruct = b as { kind: "struct"; fields: Map<string, Type> };
      if (a.fields.size !== bStruct.fields.size) return false;
      for (const [k, v] of a.fields) {
        const bv = bStruct.fields.get(k);
        if (!bv || !typesEqual(v, bv)) return false;
      }
      return true;
    }
    case "fn": {
      const bFn = b as { kind: "fn"; params: Type[]; returnType: Type };
      if (a.params.length !== bFn.params.length) return false;
      for (let i = 0; i < a.params.length; i++) {
        if (!typesEqual(a.params[i], bFn.params[i])) return false;
      }
      return typesEqual(a.returnType, bFn.returnType);
    }
    case "generic_ref": {
      const bGen = b as { kind: "generic_ref"; name: string; typeArgs: Type[] };
      if (a.name !== bGen.name) return false;
      if (a.typeArgs.length !== bGen.typeArgs.length) return false;
      for (let i = 0; i < a.typeArgs.length; i++) {
        if (!typesEqual(a.typeArgs[i], bGen.typeArgs[i])) return false;
      }
      return true;
    }
    case "trait": {
      const bTrait = b as { kind: "trait"; name: string };
      return a.name === bTrait.name;
    }
    default:
      return false;
  }
}

function typeToString(t: Type): string {
  switch (t.kind) {
    case "i32": case "i64": case "f64": case "bool": case "string": case "void":
      return t.kind;
    case "array": return `[${typeToString(t.element)}]`;
    case "channel": return `channel<${typeToString(t.element)}>`;
    case "option": return `Option<${typeToString(t.element)}>`;
    case "result": return `Result<${typeToString(t.ok)}, ${typeToString(t.err)}>`;
    case "promise": return `Promise<${typeToString(t.element)}>`;
    case "struct": {
      const fields = [...t.fields.entries()].map(([k, v]) => `${k}: ${typeToString(v)}`).join(", ");
      return `{ ${fields} }`;
    }
    case "fn": {
      const paramStr = t.params.map(typeToString).join(", ");
      return `fn(${paramStr}) -> ${typeToString(t.returnType)}`;
    }
    case "type_param":
      return t.name;
    case "generic_ref": {
      const typeArgStr = t.typeArgs.map(typeToString).join(", ");
      return `${t.name}<${typeArgStr}>`;
    }
    case "trait":
      return `trait ${t.name}`;
    case "unknown": return "unknown";
  }
}

// ============================================================
// 제네릭 타입 치환 — substituteType
// ============================================================

function substituteType(t: Type, bindings: Map<string, Type>): Type {
  switch (t.kind) {
    case "type_param": {
      return bindings.get(t.name) ?? t;
    }
    case "array": {
      return { kind: "array", element: substituteType(t.element, bindings) };
    }
    case "channel": {
      return { kind: "channel", element: substituteType(t.element, bindings) };
    }
    case "option": {
      return { kind: "option", element: substituteType(t.element, bindings) };
    }
    case "result": {
      return { kind: "result", ok: substituteType(t.ok, bindings), err: substituteType(t.err, bindings) };
    }
    case "promise": {
      return { kind: "promise", element: substituteType(t.element, bindings) };
    }
    case "struct": {
      const fields = new Map<string, Type>();
      for (const [k, v] of t.fields) {
        fields.set(k, substituteType(v, bindings));
      }
      return { kind: "struct", fields };
    }
    case "fn": {
      return {
        kind: "fn",
        params: t.params.map(p => substituteType(p, bindings)),
        returnType: substituteType(t.returnType, bindings),
      };
    }
    case "generic_ref": {
      const typeArgs = t.typeArgs.map(ta => substituteType(ta, bindings));
      return { kind: "generic_ref", name: t.name, typeArgs };
    }
    case "trait":
      return t; // Trait types don't have substitutable parts yet
    default:
      return t;
  }
}

function annotationToType(
  a: TypeAnnotation,
  structDefs: Map<string, Type> = new Map(),
  typeEnv: Map<string, Type> = new Map(),
): Type {
  switch (a.kind) {
    case "i32": return { kind: "i32" };
    case "i64": return { kind: "i64" };
    case "f64": return { kind: "f64" };
    case "bool": return { kind: "bool" };
    case "string": return { kind: "string" };
    case "void": return { kind: "void" };
    case "array": return { kind: "array", element: annotationToType(a.element, structDefs, typeEnv) };
    case "channel": return { kind: "channel", element: annotationToType(a.element, structDefs, typeEnv) };
    case "option": return { kind: "option", element: annotationToType(a.element, structDefs, typeEnv) };
    case "result": return { kind: "result", ok: annotationToType(a.ok, structDefs, typeEnv), err: annotationToType(a.err, structDefs, typeEnv) };
    case "promise": return { kind: "promise", element: annotationToType(a.element, structDefs, typeEnv) };
    case "struct_ref": {
      const structType = structDefs.get(a.name);
      return structType || { kind: "unknown" };
    }
    case "fn": {
      const params = a.params.map(p => annotationToType(p, structDefs, typeEnv));
      const returnType = annotationToType(a.returnType, structDefs, typeEnv);
      return { kind: "fn", params, returnType };
    }
    case "type_param": {
      // typeEnv에서 치환된 타입 찾기, 없으면 type_param 유지
      return typeEnv.get(a.name) ?? { kind: "type_param", name: a.name };
    }
    case "generic_ref": {
      const typeArgs = a.typeArgs.map(arg => annotationToType(arg, structDefs, typeEnv));
      return { kind: "generic_ref", name: a.name, typeArgs };
    }
    case "trait_ref":
      return { kind: "unknown" }; // Trait reference not yet fully supported
    case "self_type":
      return { kind: "unknown" }; // Self type not yet fully supported
  }
}

// ============================================================
// TypeChecker
// ============================================================

export class TypeChecker {
  private errors: CheckError[] = [];
  private functions: Map<string, FnInfo> = new Map();
  private structs: Map<string, Type> = new Map(); // struct 정의 저장소
  private traits: Map<string, Type> = new Map(); // trait 정의 저장소 (trait_decl)
  private impls: Array<{ trait: string | null; forType: string; methods: Map<string, { params: Type[]; returnType: Type }> }> = []; // impl 정의 저장소
  private genericFunctions: Map<string, GenericFnDef> = new Map();
  private genericStructs: Map<string, GenericStructDef> = new Map();
  private instantiatedFunctions: Map<string, FnInfo> = new Map(); // 인스턴스화된 함수
  private instantiatedStructs: Map<string, Type> = new Map(); // 인스턴스화된 구조체
  private scope: Scope;
  private currentReturnType: Type | null = null;

  constructor() {
    this.scope = new Scope(null); // global scope
  }

  check(program: Program): CheckError[] {
    // Builtin 함수 등록
    this.registerBuiltinFunctions();

    // Pass 1: trait과 struct 정의 등록
    for (const stmt of program.stmts) {
      if (stmt.kind === "struct_decl") {
        this.registerStruct(stmt);
      }
      if (stmt.kind === "trait_decl") {
        this.registerTrait(stmt);
      }
    }

    // Pass 2: impl 정의 등록
    for (const stmt of program.stmts) {
      if (stmt.kind === "impl_decl") {
        this.registerImpl(stmt);
      }
    }

    // Pass 3: 함수 전방참조 등록 (SPEC_08 Q5)
    for (const stmt of program.stmts) {
      if (stmt.kind === "fn_decl") {
        this.registerFunction(stmt);
      }
    }

    // Pass 4: 본문 검사
    for (const stmt of program.stmts) {
      this.checkStmt(stmt);
    }

    return this.errors;
  }

  private registerFunction(stmt: Stmt & { kind: "fn_decl" }): void {
    const params = stmt.params.map((p) => ({
      name: p.name,
      type: annotationToType(p.type, this.structs),
    }));
    let returnType = annotationToType(stmt.returnType, this.structs);

    // async fn인 경우 반환 타입을 Promise<T>로 자동 변환
    if (stmt.isAsync) {
      returnType = { kind: "promise", element: returnType };
    }

    if (this.functions.has(stmt.name)) {
      this.error(`function '${stmt.name}' already declared`, stmt.line, stmt.col);
      return;
    }

    // Generic 함수인 경우 genericFunctions에 등록
    if (stmt.typeParams.length > 0) {
      this.genericFunctions.set(stmt.name, { typeParams: stmt.typeParams, params, returnType });
    } else {
      this.functions.set(stmt.name, { params, returnType });
    }
  }

  private registerBuiltinFunctions(): void {
    // Some<T>(value: T) -> Option<T>
    // 실제로는 제네릭 함수이지만, 여기서는 unknown 파라미터로 처리
    this.functions.set("Some", {
      params: [{ name: "value", type: { kind: "unknown" } }],
      returnType: { kind: "option", element: { kind: "unknown" } }
    });

    // None는 값이므로 함수로 등록하지 않음 (상수처럼 취급)
    // Ok<T>(value: T) -> Result<T, E>
    this.functions.set("Ok", {
      params: [{ name: "value", type: { kind: "unknown" } }],
      returnType: { kind: "result", ok: { kind: "unknown" }, err: { kind: "unknown" } }
    });

    // Err<E>(error: E) -> Result<T, E>
    this.functions.set("Err", {
      params: [{ name: "error", type: { kind: "unknown" } }],
      returnType: { kind: "result", ok: { kind: "unknown" }, err: { kind: "unknown" } }
    });
  }

  private registerStruct(stmt: Stmt & { kind: "struct_decl" }): void {
    const fields = new Map<string, Type>();
    for (const field of stmt.fields) {
      const fieldType = annotationToType(field.type, this.structs);
      fields.set(field.name, fieldType);
    }

    if (this.structs.has(stmt.name)) {
      this.error(`struct '${stmt.name}' already declared`, stmt.line, stmt.col);
      return;
    }

    // Generic 구조체인 경우 genericStructs에 등록
    if (stmt.typeParams.length > 0) {
      this.genericStructs.set(stmt.name, { typeParams: stmt.typeParams, fields });
    } else {
      this.structs.set(stmt.name, { kind: "struct", fields });
    }
  }

  private registerTrait(stmt: Stmt & { kind: "trait_decl" }): void {
    const methods = new Map<string, { params: Type[]; returnType: Type }>();

    for (const method of stmt.methods) {
      const params = method.params.map(p => annotationToType(p.type, this.structs));
      const returnType = annotationToType(method.returnType, this.structs);
      methods.set(method.name, { params, returnType });
    }

    if (this.traits.has(stmt.name)) {
      this.error(`trait '${stmt.name}' already declared`, stmt.line, stmt.col);
      return;
    }

    this.traits.set(stmt.name, {
      kind: "trait",
      name: stmt.name,
      methods,
    });
  }

  private registerImpl(stmt: Stmt & { kind: "impl_decl" }): void {
    // forType을 문자열로 간단히 저장 (간소화)
    let forTypeName = "unknown";
    if (stmt.forType.kind === "struct_ref") {
      forTypeName = stmt.forType.name;
    }

    const methods = new Map<string, { params: Type[]; returnType: Type }>();

    for (const method of stmt.methods) {
      const params = method.params.map(p => annotationToType(p.type, this.structs));
      const returnType = annotationToType(method.returnType, this.structs);
      methods.set(method.name, { params, returnType });
    }

    // impl 저장
    this.impls.push({
      trait: stmt.trait,
      forType: forTypeName,
      methods,
    });
  }

  // ============================================================
  // 문 검사
  // ============================================================

  private checkStmt(stmt: Stmt): void {
    switch (stmt.kind) {
      case "var_decl":
        return this.checkVarDecl(stmt);
      case "fn_decl":
        return this.checkFnDecl(stmt);
      case "struct_decl":
        return; // struct는 Pass 1에서 이미 등록됨
      case "trait_decl":
        return; // trait은 Pass 1에서 이미 등록됨
      case "impl_decl":
        return; // impl은 Pass 2에서 이미 등록됨
      case "if_stmt":
        return this.checkIfStmt(stmt);
      case "match_stmt":
        return this.checkMatchStmt(stmt);
      case "for_stmt":
        return this.checkForStmt(stmt);
      case "for_of_stmt":
        return this.checkForOfStmt(stmt);
      case "while_stmt":
        return this.checkWhileStmt(stmt);
      case "break_stmt":
        return this.checkBreakStmt(stmt);
      case "continue_stmt":
        return this.checkContinueStmt(stmt);
      case "spawn_stmt":
        return this.checkSpawnStmt(stmt);
      case "return_stmt":
        return this.checkReturnStmt(stmt);
      case "expr_stmt":
        return this.checkExprStmt(stmt);
      case "import_decl":
        return this.checkImportDecl(stmt as ImportDecl);
      case "export_decl":
        return this.checkExportDecl(stmt as ExportDecl);
    }
  }

  private checkVarDecl(stmt: Stmt & { kind: "var_decl" }): void {
    const initType = this.checkExpr(stmt.init);

    let declType: Type;
    if (stmt.type) {
      declType = annotationToType(stmt.type, this.structs);
      if (!typesEqual(declType, initType) && initType.kind !== "unknown") {
        this.error(
          `type mismatch: declared ${typeToString(declType)}, got ${typeToString(initType)}`,
          stmt.line, stmt.col,
        );
      }
    } else {
      // 타입 추론 (SPEC_06 Q3)
      declType = initType;
    }

    // void 변수 금지 (SPEC_06 Q9)
    if (declType.kind === "void") {
      this.error("cannot declare variable of type void", stmt.line, stmt.col);
      return;
    }

    // 스코프에 등록
    if (this.scope.vars.has(stmt.name)) {
      // 섀도잉 허용 (SPEC_08 Q4) — 같은 스코프에서도 재선언 가능
    }

    this.scope.define(stmt.name, {
      type: declType,
      mutable: stmt.mutable,
      moved: false,
      line: stmt.line,
      col: stmt.col,
    });
  }

  private checkFnDecl(stmt: Stmt & { kind: "fn_decl" }): void {
    const fnInfo = this.functions.get(stmt.name);
    if (!fnInfo) return;

    // 새 스코프
    const prevScope = this.scope;
    this.scope = new Scope(prevScope);

    const prevReturn = this.currentReturnType;
    this.currentReturnType = fnInfo.returnType;

    // 매개변수 등록
    for (const p of fnInfo.params) {
      this.scope.define(p.name, {
        type: p.type,
        mutable: false, // 매개변수는 immutable (SPEC_08)
        moved: false,
        line: stmt.line,
        col: stmt.col,
      });
    }

    // 본문 검사
    for (const s of stmt.body) {
      this.checkStmt(s);
    }

    this.currentReturnType = prevReturn;
    this.scope = prevScope;
  }

  private checkIfStmt(stmt: Stmt & { kind: "if_stmt" }): void {
    const condType = this.checkExpr(stmt.condition);
    if (condType.kind !== "bool" && condType.kind !== "unknown") {
      this.error(
        `if condition must be bool, got ${typeToString(condType)}`,
        stmt.line, stmt.col,
      );
    }

    // then 블록
    const prevScope = this.scope;
    this.scope = new Scope(prevScope);
    for (const s of stmt.then) this.checkStmt(s);
    this.scope = prevScope;

    // else 블록
    if (stmt.else_) {
      const prevScope2 = this.scope;
      this.scope = new Scope(prevScope2);
      for (const s of stmt.else_) this.checkStmt(s);
      this.scope = prevScope2;
    }
  }

  private checkMatchStmt(stmt: Stmt & { kind: "match_stmt" }): void {
    const subjectType = this.checkExpr(stmt.subject);
    for (const arm of stmt.arms) {
      this.checkMatchArm(arm, subjectType);
    }
  }

  private checkMatchArm(arm: MatchArm, subjectType: Type): void {
    const prevScope = this.scope;
    this.scope = new Scope(prevScope);

    this.checkPattern(arm.pattern, subjectType);

    // Guard 절 검증: bool 타입이어야 함
    if (arm.guard) {
      const guardType = this.checkExpr(arm.guard);
      if (guardType.kind !== "bool" && guardType.kind !== "unknown") {
        this.error(`guard condition must be bool, got ${typeToString(guardType)}`, 0, 0);
      }
    }

    this.checkExpr(arm.body);

    this.scope = prevScope;
  }

  private checkPattern(pattern: Pattern, expectedType: Type): void {
    switch (pattern.kind) {
      case "ident":
        // 바인딩 — 새 변수 생성
        this.scope.define(pattern.name, {
          type: expectedType,
          mutable: false,
          moved: false,
          line: 0, col: 0,
        });
        break;
      case "wildcard":
        break;
      case "none":
        if (expectedType.kind !== "option" && expectedType.kind !== "unknown") {
          this.error(`None pattern on non-Option type ${typeToString(expectedType)}`, 0, 0);
        }
        break;
      case "some":
        if (expectedType.kind === "option") {
          this.checkPattern(pattern.inner, expectedType.element);
        } else if (expectedType.kind !== "unknown") {
          this.error(`Some pattern on non-Option type ${typeToString(expectedType)}`, 0, 0);
        }
        break;
      case "ok":
        if (expectedType.kind === "result") {
          this.checkPattern(pattern.inner, expectedType.ok);
        } else if (expectedType.kind !== "unknown") {
          this.error(`Ok pattern on non-Result type ${typeToString(expectedType)}`, 0, 0);
        }
        break;
      case "err":
        if (expectedType.kind === "result") {
          this.checkPattern(pattern.inner, expectedType.err);
        } else if (expectedType.kind !== "unknown") {
          this.error(`Err pattern on non-Result type ${typeToString(expectedType)}`, 0, 0);
        }
        break;
      case "literal":
        // 리터럴 타입은 checkExpr에서 확인
        this.checkExpr(pattern.value);
        break;

      case "struct":
        // 구조체 분해 패턴: Point { x, y }
        if (expectedType.kind !== "struct" && expectedType.kind !== "unknown") {
          this.error(
            `struct pattern on non-struct type ${typeToString(expectedType)}`,
            0,
            0
          );
        }

        if (expectedType.kind === "struct") {
          for (const field of pattern.fields) {
            const fieldType = expectedType.fields.get(field.name);
            if (!fieldType) {
              this.error(`struct ${pattern.name} has no field ${field.name}`, 0, 0);
            } else {
              this.checkPattern(field.pattern, fieldType);
            }
          }
        }
        break;

      case "array":
        // 배열 분해 패턴: [a, b, c], [x, .., y]
        if (expectedType.kind !== "array" && expectedType.kind !== "unknown") {
          this.error(
            `array pattern on non-array type ${typeToString(expectedType)}`,
            0,
            0
          );
        }

        if (expectedType.kind === "array") {
          const elementType = expectedType.element;
          for (const element of pattern.elements) {
            this.checkPattern(element, elementType);
          }
        }
        break;

      case "tuple":
        // 튜플 분해 패턴: (a, b, c)
        if (expectedType.kind !== "unknown") {
          this.error(`tuple patterns not yet supported`, 0, 0);
        }
        break;
    }
  }

  private checkForStmt(stmt: Stmt & { kind: "for_stmt" }): void {
    const iterType = this.checkExpr(stmt.iterable);

    // iterable은 array여야 함
    let elemType: Type = { kind: "unknown" };
    if (iterType.kind === "array") {
      elemType = iterType.element;
    } else if (iterType.kind !== "unknown") {
      this.error(`for...in requires array, got ${typeToString(iterType)}`, stmt.line, stmt.col);
    }

    // 루프 스코프
    const prevScope = this.scope;
    this.scope = new Scope(prevScope);

    // 루프 변수 (immutable — SPEC_08 Q6)
    this.scope.define(stmt.variable, {
      type: elemType,
      mutable: false,
      moved: false,
      line: stmt.line,
      col: stmt.col,
    });

    for (const s of stmt.body) this.checkStmt(s);
    this.scope = prevScope;
  }

  private checkForOfStmt(stmt: Stmt & { kind: "for_of_stmt" }): void {
    const iterType = this.checkExpr(stmt.iterable);

    // iterable은 array 또는 string이어야 함
    let elemType: Type = { kind: "unknown" };
    if (iterType.kind === "array") {
      elemType = iterType.element;
    } else if (iterType.kind === "string") {
      // 문자열을 순회하면 각 요소는 string (한 글자)
      elemType = { kind: "string" };
    } else if (iterType.kind !== "unknown") {
      this.error(`for...of requires array or string, got ${typeToString(iterType)}`, stmt.line, stmt.col);
    }

    // 루프 스코프
    const prevScope = this.scope;
    this.scope = new Scope(prevScope);

    // 루프 변수 (immutable — SPEC_08 Q6)
    this.scope.define(stmt.variable, {
      type: elemType,
      mutable: false,
      moved: false,
      line: stmt.line,
      col: stmt.col,
    });

    for (const s of stmt.body) this.checkStmt(s);
    this.scope = prevScope;
  }

  private checkWhileStmt(stmt: Stmt & { kind: "while_stmt" }): void {
    const condType = this.checkExpr(stmt.condition);

    // while 조건은 bool이어야 함
    if (condType.kind !== "bool" && condType.kind !== "unknown") {
      this.error(`while condition must be bool, got ${typeToString(condType)}`, stmt.line, stmt.col);
    }

    // 루프 스코프
    const prevScope = this.scope;
    this.scope = new Scope(prevScope);

    for (const s of stmt.body) this.checkStmt(s);
    this.scope = prevScope;
  }

  private checkBreakStmt(stmt: Stmt & { kind: "break_stmt" }): void {
    // break는 루프 내에서만 사용 가능 (현재는 미지원)
    // 나중에 구현할 수 있음
  }

  private checkContinueStmt(stmt: Stmt & { kind: "continue_stmt" }): void {
    // continue는 루프 내에서만 사용 가능 (현재는 미지원)
    // 나중에 구현할 수 있음
  }

  private checkSpawnStmt(stmt: Stmt & { kind: "spawn_stmt" }): void {
    // spawn은 새로운 스코프 (외부 변수 접근 가능)
    const prevScope = this.scope;
    this.scope = new Scope(prevScope); // 부모 스코프 유지

    for (const s of stmt.body) this.checkStmt(s);
    this.scope = prevScope;
  }

  private checkReturnStmt(stmt: Stmt & { kind: "return_stmt" }): void {
    if (!this.currentReturnType) {
      this.error("return outside function", stmt.line, stmt.col);
      return;
    }

    if (stmt.value) {
      const valType = this.checkExpr(stmt.value);
      if (!typesEqual(this.currentReturnType, valType) && valType.kind !== "unknown") {
        this.error(
          `return type mismatch: expected ${typeToString(this.currentReturnType)}, got ${typeToString(valType)}`,
          stmt.line, stmt.col,
        );
      }
    } else {
      // return; (void)
      if (this.currentReturnType.kind !== "void") {
        this.error(
          `return without value in non-void function (expected ${typeToString(this.currentReturnType)})`,
          stmt.line, stmt.col,
        );
      }
    }
  }

  private checkExprStmt(stmt: Stmt & { kind: "expr_stmt" }): void {
    this.checkExpr(stmt.expr);
  }

  private checkImportDecl(decl: ImportDecl): void {
    // 기본 import 검증: 현재는 모듈 로드 없이 항목만 추적
    for (const item of decl.items) {
      const name = item.alias || item.name;
      // import된 항목을 스코프에 등록 (타입은 unknown)
      this.scope.define(name, {
        type: { kind: "unknown" },
        mutable: false,
        moved: false,
        line: decl.line,
        col: decl.col,
      });
    }
  }

  private checkExportDecl(decl: ExportDecl): void {
    // 기본 export 검증: 현재는 항목 추적만 수행
    if (typeof decl.target !== "string") {
      // export fn/struct: 이미 checkStmt에서 처리됨
      return;
    }
    // export { ... }의 경우 항목 이름들이 실제로 정의되어 있는지는
    // 향후 더 정교한 검증이 필요
  }

  // ============================================================
  // 식 검사 — 타입 반환
  // ============================================================

  checkExpr(expr: Expr): Type {
    switch (expr.kind) {
      case "int_lit": return { kind: "i32" };
      case "float_lit": return { kind: "f64" };
      case "string_lit": return { kind: "string" };
      case "bool_lit": return { kind: "bool" };

      case "ident":
        return this.checkIdent(expr);

      case "binary":
        return this.checkBinary(expr);

      case "unary":
        return this.checkUnary(expr);

      case "await":
        return this.checkAwait(expr);

      case "call":
        return this.checkCall(expr);

      case "index":
        return this.checkIndex(expr);

      case "field_access":
        return this.checkFieldAccess(expr);

      case "assign":
        return this.checkAssign(expr);

      case "try":
        return this.checkTry(expr);

      case "if_expr":
        return this.checkIfExpr(expr);

      case "match_expr":
        return this.checkMatchExpr(expr);

      case "array_lit":
        return this.checkArrayLit(expr);

      case "struct_lit":
        return this.checkStructLit(expr);

      case "fn_lit":
        return this.checkFnLit(expr);

      case "block_expr":
        return this.checkBlockExpr(expr);

      case "chan_new":
        return this.checkChanNew(expr);

      case "chan_send":
        return this.checkChanSend(expr);

      case "chan_recv":
        return this.checkChanRecv(expr);

      default:
        return { kind: "unknown" };
    }
  }

  private checkIdent(expr: Expr & { kind: "ident" }): Type {
    const info = this.scope.lookup(expr.name);
    if (!info) {
      // 내장 함수 확인
      if (this.isBuiltin(expr.name)) return { kind: "unknown" };
      // 함수 이름 확인
      if (this.functions.has(expr.name)) return { kind: "unknown" };

      this.error(`undefined variable: '${expr.name}'`, expr.line, expr.col);
      return { kind: "unknown" };
    }

    // Move 검사 (SPEC_07 Q4)
    if (info.moved) {
      this.error(`use of moved value: '${expr.name}'`, expr.line, expr.col);
      return info.type;
    }

    return info.type;
  }

  private checkBinary(expr: Expr & { kind: "binary" }): Type {
    const left = this.checkExpr(expr.left);
    const right = this.checkExpr(expr.right);

    // 비교 연산자 → bool (타입 강제 변환 지원)
    if (["==", "!=", "<", ">", "<=", ">="].includes(expr.op)) {
      if (!typesEqual(left, right) && left.kind !== "unknown" && right.kind !== "unknown") {
        // numeric 타입은 강제 변환 허용
        const coerced = this.coerceNumeric(left, right);
        if (!coerced) {
          this.error(
            `cannot compare ${typeToString(left)} and ${typeToString(right)}`,
            expr.line, expr.col,
          );
        }
      }
      return { kind: "bool" };
    }

    // 논리 연산자 → bool
    if (expr.op === "&&" || expr.op === "||") {
      if (left.kind !== "bool" && left.kind !== "unknown") {
        this.error(`'${expr.op}' requires bool, got ${typeToString(left)}`, expr.line, expr.col);
      }
      if (right.kind !== "bool" && right.kind !== "unknown") {
        this.error(`'${expr.op}' requires bool, got ${typeToString(right)}`, expr.line, expr.col);
      }
      return { kind: "bool" };
    }

    // 산술 연산자: + 는 문자열 연결도 가능
    if (expr.op === "+") {
      if (left.kind === "string" && right.kind === "string") return { kind: "string" };
    }

    // 산술: i32, i64, f64 (타입 강제 변환 지원)
    if (["+", "-", "*", "/", "%"].includes(expr.op)) {
      const numericTypes = ["i32", "i64", "f64"];

      // 타입이 같거나 numeric 타입 강제 변환 가능
      if (!typesEqual(left, right) && left.kind !== "unknown" && right.kind !== "unknown") {
        const coerced = this.coerceNumeric(left, right);
        if (!coerced) {
          this.error(
            `type mismatch in '${expr.op}': ${typeToString(left)} and ${typeToString(right)}`,
            expr.line, expr.col,
          );
          return { kind: "unknown" };
        }
        return coerced;  // 강제 변환된 타입 반환
      }

      // 한쪽이 unknown이면 다른 쪽 반환
      if (left.kind === "unknown") return right;
      if (right.kind === "unknown") return left;

      return left;
    }

    return { kind: "unknown" };
  }

  private checkUnary(expr: Expr & { kind: "unary" }): Type {
    const operand = this.checkExpr(expr.operand);

    if (expr.op === "-") {
      if (!["i32", "i64", "f64", "unknown"].includes(operand.kind)) {
        this.error(`unary '-' requires numeric type, got ${typeToString(operand)}`, expr.line, expr.col);
      }
      return operand;
    }

    if (expr.op === "!") {
      if (operand.kind !== "bool" && operand.kind !== "unknown") {
        this.error(`unary '!' requires bool, got ${typeToString(operand)}`, expr.line, expr.col);
      }
      return { kind: "bool" };
    }

    return { kind: "unknown" };
  }

  private checkAwait(expr: Expr & { kind: "await" }): Type {
    const operandType = this.checkExpr(expr.expr);

    // await는 Promise 타입에만 사용 가능
    if (operandType.kind !== "promise" && operandType.kind !== "unknown") {
      this.error(
        `await requires Promise type, got ${typeToString(operandType)}`,
        expr.line, expr.col,
      );
      return { kind: "unknown" };
    }

    // Promise<T>이면 T를 반환
    if (operandType.kind === "promise") {
      return operandType.element;
    }

    return { kind: "unknown" };
  }

  private checkCall(expr: Expr & { kind: "call" }): Type {
    // 내장 함수 처리
    if (expr.callee.kind === "ident") {
      const name = expr.callee.name;

      // 내장 함수 타입 (SPEC_10)
      const builtinType = this.getBuiltinReturnType(name, expr.args);
      if (builtinType) {
        for (const arg of expr.args) this.checkExpr(arg);
        return builtinType;
      }

      // 사용자 함수
      const fn = this.functions.get(name);
      if (fn) {
        if (expr.args.length !== fn.params.length) {
          this.error(
            `'${name}' expects ${fn.params.length} arguments, got ${expr.args.length}`,
            expr.line, expr.col,
          );
        }

        for (let i = 0; i < expr.args.length; i++) {
          const argType = this.checkExpr(expr.args[i]);
          if (i < fn.params.length) {
            if (!typesEqual(argType, fn.params[i].type) && argType.kind !== "unknown") {
              this.error(
                `argument ${i + 1} type mismatch: expected ${typeToString(fn.params[i].type)}, got ${typeToString(argType)}`,
                expr.line, expr.col,
              );
            }

            // Move semantics: 인자 전달 시 Move (SPEC_07 Q4)
            if (!isCopyType(argType) && expr.args[i].kind === "ident") {
              const varInfo = this.scope.lookup((expr.args[i] as any).name);
              if (varInfo) varInfo.moved = true;
            }
          }
        }

        return fn.returnType;
      }
    }

    // 함수 타입 변수 호출 (fn 타입 값)
    const calleeType = this.checkExpr(expr.callee);
    if (calleeType.kind === "fn") {
      // 함수 타입 인자 개수 검사
      if (expr.args.length !== calleeType.params.length) {
        this.error(
          `function expects ${calleeType.params.length} arguments, got ${expr.args.length}`,
          expr.line, expr.col,
        );
      }

      // 각 인자의 타입 검사
      for (let i = 0; i < expr.args.length; i++) {
        const argType = this.checkExpr(expr.args[i]);
        if (i < calleeType.params.length) {
          if (!typesEqual(argType, calleeType.params[i]) && argType.kind !== "unknown") {
            this.error(
              `argument ${i + 1} type mismatch: expected ${typeToString(calleeType.params[i])}, got ${typeToString(argType)}`,
              expr.line, expr.col,
            );
          }

          // Move semantics for function arguments
          if (!isCopyType(argType) && expr.args[i].kind === "ident") {
            const varInfo = this.scope.lookup((expr.args[i] as any).name);
            if (varInfo) varInfo.moved = true;
          }
        }
      }

      return calleeType.returnType;
    }

    // 메서드 호출 (field_access + call)
    if (expr.callee.kind === "field_access") {
      for (const arg of expr.args) this.checkExpr(arg);
      return { kind: "unknown" }; // 메서드 반환 타입은 정적으로 모름
    }

    // 알 수 없는 함수
    for (const arg of expr.args) this.checkExpr(arg);
    return { kind: "unknown" };
  }

  private checkIndex(expr: Expr & { kind: "index" }): Type {
    const objType = this.checkExpr(expr.object);
    const idxType = this.checkExpr(expr.index);

    if (idxType.kind !== "i32" && idxType.kind !== "unknown") {
      this.error(`array index must be i32, got ${typeToString(idxType)}`, expr.line, expr.col);
    }

    if (objType.kind === "array") return objType.element;
    if (objType.kind === "string") return { kind: "string" }; // char_at 대체
    if (objType.kind !== "unknown") {
      this.error(`cannot index into ${typeToString(objType)}`, expr.line, expr.col);
    }

    return { kind: "unknown" };
  }

  private checkFieldAccess(expr: Expr & { kind: "field_access" }): Type {
    const objType = this.checkExpr(expr.object);

    if (objType.kind === "struct") {
      // 필드 접근
      const fieldType = objType.fields.get(expr.field);
      if (fieldType) {
        return fieldType;
      }

      // 메서드 호출인지 확인
      const structName = this.findStructName(objType);
      if (structName) {
        const impl = this.findImplMethod(structName, expr.field);
        if (impl) {
          // 메서드를 함수 타입으로 반환
          return { kind: "fn", params: impl.params, returnType: impl.returnType };
        }
      }

      this.error(`struct has no field or method '${expr.field}'`, expr.line, expr.col);
      return { kind: "unknown" };
    }

    // 메서드 스타일 호출 (ch.recv 등) — unknown 반환
    if (objType.kind !== "unknown") {
      // 채널 메서드
      if (objType.kind === "channel") {
        if (expr.field === "recv" || expr.field === "send") return { kind: "unknown" };
      }
    }

    return { kind: "unknown" };
  }

  private findStructName(objType: Type): string | null {
    // 구조체 이름 찾기 (간소화)
    for (const [name, sType] of this.structs) {
      if (typesEqual(sType, objType)) {
        return name;
      }
    }
    return null;
  }

  private findImplMethod(structName: string, methodName: string): { params: Type[]; returnType: Type } | null {
    // impl에서 메서드 찾기
    for (const impl of this.impls) {
      if (impl.forType === structName) {
        const method = impl.methods.get(methodName);
        if (method) {
          return method;
        }
      }
    }
    return null;
  }

  private checkAssign(expr: Expr & { kind: "assign" }): Type {
    const valType = this.checkExpr(expr.value);

    if (expr.target.kind === "ident") {
      const info = this.scope.lookup(expr.target.name);
      if (!info) {
        this.error(`undefined variable: '${expr.target.name}'`, expr.line, expr.col);
        return { kind: "void" };
      }
      if (!info.mutable) {
        this.error(`cannot assign to immutable variable '${expr.target.name}'`, expr.line, expr.col);
        return { kind: "void" };
      }
      if (!typesEqual(info.type, valType) && valType.kind !== "unknown") {
        this.error(
          `assignment type mismatch: ${typeToString(info.type)} = ${typeToString(valType)}`,
          expr.line, expr.col,
        );
      }

      // 재할당으로 Move 복구 (SPEC_07 Q7)
      info.moved = false;
    }

    if (expr.target.kind === "index") {
      this.checkExpr(expr.target);
    }

    if (expr.target.kind === "field_access") {
      const objType = this.checkExpr(expr.target.object);

      if (objType.kind === "struct") {
        const fieldType = objType.fields.get(expr.target.field);
        if (!fieldType) {
          this.error(`struct has no field '${expr.target.field}'`, expr.line, expr.col);
          return { kind: "void" };
        }

        if (!typesEqual(fieldType, valType) && valType.kind !== "unknown") {
          this.error(
            `field assignment type mismatch: expected ${typeToString(fieldType)}, got ${typeToString(valType)}`,
            expr.line, expr.col,
          );
        }
      } else if (objType.kind !== "unknown") {
        this.error(`cannot assign to field of ${typeToString(objType)}`, expr.line, expr.col);
      }
    }

    return { kind: "void" };
  }

  private checkTry(expr: Expr & { kind: "try" }): Type {
    const operandType = this.checkExpr(expr.operand);

    // ? 는 Result 또는 Option에만 사용 (SPEC_09 Q6)
    if (operandType.kind === "result") return operandType.ok;
    if (operandType.kind === "option") return operandType.element;
    if (operandType.kind !== "unknown") {
      this.error(`'?' requires Result or Option, got ${typeToString(operandType)}`, expr.line, expr.col);
    }

    return { kind: "unknown" };
  }

  private checkIfExpr(expr: Expr & { kind: "if_expr" }): Type {
    const condType = this.checkExpr(expr.condition);
    if (condType.kind !== "bool" && condType.kind !== "unknown") {
      this.error(`if condition must be bool, got ${typeToString(condType)}`, expr.line, expr.col);
    }

    // then/else 마지막 식의 타입이 일치해야 함 (SPEC_06)
    let thenType: Type = { kind: "void" };
    for (const e of expr.then) thenType = this.checkExpr(e);

    let elseType: Type = { kind: "void" };
    for (const e of expr.else_) elseType = this.checkExpr(e);

    if (!typesEqual(thenType, elseType) && thenType.kind !== "unknown" && elseType.kind !== "unknown") {
      this.error(
        `if expression branches have different types: ${typeToString(thenType)} vs ${typeToString(elseType)}`,
        expr.line, expr.col,
      );
    }

    return thenType;
  }

  private checkMatchExpr(expr: Expr & { kind: "match_expr" }): Type {
    const subjectType = this.checkExpr(expr.subject);
    let resultType: Type = { kind: "unknown" };

    for (const arm of expr.arms) {
      const prevScope = this.scope;
      this.scope = new Scope(prevScope);
      this.checkPattern(arm.pattern, subjectType);
      const armType = this.checkExpr(arm.body);
      this.scope = prevScope;

      if (resultType.kind === "unknown") {
        resultType = armType;
      } else if (!typesEqual(resultType, armType) && armType.kind !== "unknown") {
        this.error(
          `match arms have different types: ${typeToString(resultType)} vs ${typeToString(armType)}`,
          expr.line, expr.col,
        );
      }
    }

    return resultType;
  }

  private checkArrayLit(expr: Expr & { kind: "array_lit" }): Type {
    if (expr.elements.length === 0) return { kind: "array", element: { kind: "unknown" } };

    const firstType = this.checkExpr(expr.elements[0]);
    for (let i = 1; i < expr.elements.length; i++) {
      const elemType = this.checkExpr(expr.elements[i]);
      if (!typesEqual(firstType, elemType) && elemType.kind !== "unknown") {
        this.error(
          `array element type mismatch: expected ${typeToString(firstType)}, got ${typeToString(elemType)}`,
          expr.line, expr.col,
        );
      }
    }

    return { kind: "array", element: firstType };
  }

  private checkStructLit(expr: Expr & { kind: "struct_lit" }): Type {
    // struct 정의 확인
    const structDef = this.structs.get(expr.structName);
    if (!structDef || structDef.kind !== "struct") {
      this.error(`undefined struct: '${expr.structName}'`, expr.line, expr.col);
      return { kind: "unknown" };
    }

    // 필드 타입 확인
    const fields = new Map<string, Type>();
    for (const f of expr.fields) {
      const fType = this.checkExpr(f.value);
      const expectedType = structDef.fields.get(f.name);

      if (!expectedType) {
        this.error(`struct '${expr.structName}' has no field '${f.name}'`, expr.line, expr.col);
        fields.set(f.name, fType);
        continue;
      }

      if (!typesEqual(fType, expectedType) && fType.kind !== "unknown") {
        this.error(
          `struct field '${f.name}' type mismatch: expected ${typeToString(expectedType)}, got ${typeToString(fType)}`,
          expr.line, expr.col,
        );
      }
      fields.set(f.name, expectedType);
    }

    // 모든 필드가 제공되었는지 확인
    for (const [fieldName, fieldType] of structDef.fields.entries()) {
      if (!fields.has(fieldName)) {
        this.error(`struct '${expr.structName}' is missing field '${fieldName}'`, expr.line, expr.col);
      }
    }

    return structDef;
  }

  private checkFnLit(expr: Expr & { kind: "fn_lit" }): Type {
    // 함수 리터럴의 매개변수 타입 확인
    const paramTypes: Type[] = [];
    for (const param of expr.params) {
      if (param.type) {
        const paramType = annotationToType(param.type, this.structs);
        paramTypes.push(paramType);
      } else {
        // 타입 어노테이션 없으면 unknown (타입 추론 미지원)
        paramTypes.push({ kind: "unknown" });
      }
    }

    // 반환 타입 확인
    let returnType: Type;
    if (expr.returnType) {
      returnType = annotationToType(expr.returnType, this.structs);
    } else {
      // 함수 본체에서 반환 타입 추론
      const bodyType = this.checkExpr(expr.body);
      returnType = bodyType;
    }

    // 함수 본체 타입 검사 (새로운 스코프에서)
    const prevScope = this.scope;
    this.scope = new Scope(prevScope);

    // 매개변수를 스코프에 등록
    for (let i = 0; i < expr.params.length; i++) {
      const param = expr.params[i];
      const paramType = paramTypes[i];
      this.scope.define(param.name, {
        type: paramType,
        mutable: false,
        moved: false,
        line: expr.line,
        col: expr.col,
      });
    }

    // 함수 본체 타입 검사
    const actualBodyType = this.checkExpr(expr.body);

    // 반환 타입과 일치 검사
    if (expr.returnType && !typesEqual(actualBodyType, returnType) && actualBodyType.kind !== "unknown") {
      this.error(
        `function body type mismatch: expected ${typeToString(returnType)}, got ${typeToString(actualBodyType)}`,
        expr.line, expr.col,
      );
    }

    this.scope = prevScope;

    // 함수 타입 반환
    return { kind: "fn", params: paramTypes, returnType };
  }

  private checkBlockExpr(expr: Expr & { kind: "block_expr" }): Type {
    const prevScope = this.scope;
    this.scope = new Scope(prevScope);

    for (const s of expr.stmts) this.checkStmt(s);
    let result: Type = { kind: "void" };
    if (expr.expr) result = this.checkExpr(expr.expr);

    this.scope = prevScope;
    return result;
  }

  // ============================================================
  // 타입 강제 변환 (Type Coercion)
  // ============================================================

  private coerceNumeric(left: Type, right: Type): Type | null {
    // 양쪽이 numeric 타입이면 강제 변환 가능
    const numericTypes = ["i32", "i64", "f64"];
    if (!numericTypes.includes(left.kind) || !numericTypes.includes(right.kind)) {
      return null;
    }

    // 타입 승격 규칙: f64 > i64 > i32
    const hierarchy = { i32: 0, i64: 1, f64: 2 };
    const leftRank = hierarchy[left.kind as keyof typeof hierarchy];
    const rightRank = hierarchy[right.kind as keyof typeof hierarchy];

    if (leftRank >= rightRank) return left;
    else return right;
  }

  // ============================================================
  // 내장 함수 (SPEC_10)
  // ============================================================

  private isBuiltin(name: string): boolean {
    return [
      "println", "print", "read_line", "read_file", "write_file",
      "i32", "i64", "f64", "str",
      "push", "pop", "slice", "clone", "length",
      "char_at", "contains", "split", "trim", "to_upper", "to_lower",
      "abs", "min", "max", "pow", "sqrt",
      "range", "channel", "panic", "typeof", "assert",
      // Phase 7: 20 Core Libraries
      "md5", "sha256", "sha512", "base64_encode", "base64_decode", "hmac",
      "json_parse", "json_stringify", "json_validate", "json_pretty",
      "starts_with", "ends_with", "replace",
      "reverse", "sort", "unique",
      "gcd", "lcm",
      "uuid", "timestamp",
      "send", "recv",
      // Environment (1)
      "env",
      // Phase 2: HTTP Client
      "http_get", "http_post", "http_post_json", "fetch",
    ].includes(name);
  }

  private getBuiltinReturnType(name: string, args: Expr[]): Type | null {
    switch (name) {
      // Basic I/O
      case "println": case "print": return { kind: "void" };
      case "read_line": return { kind: "string" };
      case "read_file": return { kind: "result", ok: { kind: "string" }, err: { kind: "string" } };
      case "write_file": return { kind: "result", ok: { kind: "void" }, err: { kind: "string" } };

      // Type conversions
      case "i32": return { kind: "result", ok: { kind: "i32" }, err: { kind: "string" } };
      case "i64": return { kind: "result", ok: { kind: "i64" }, err: { kind: "string" } };
      case "f64": return { kind: "result", ok: { kind: "f64" }, err: { kind: "string" } };
      case "str": return { kind: "string" };

      // Array operations
      case "length": return { kind: "i32" };
      case "push": return { kind: "void" };
      case "pop": return { kind: "unknown" };
      case "clone": return { kind: "unknown" };
      case "slice": return { kind: "unknown" };
      case "reverse": case "sort": case "unique":
        return { kind: "unknown" }; // 배열 타입 복제

      // String operations
      case "char_at": case "trim": case "to_upper": case "to_lower":
        return { kind: "string" };
      case "contains": case "starts_with": case "ends_with":
        return { kind: "bool" };
      case "split": return { kind: "array", element: { kind: "string" } };
      case "replace": return { kind: "string" };

      // Range & channel
      case "range": return { kind: "array", element: { kind: "i32" } };
      case "channel": return { kind: "unknown" };
      case "send": case "recv": return { kind: "unknown" };

      // Control
      case "panic": return { kind: "void" };
      case "typeof": return { kind: "string" };
      case "assert": return { kind: "void" };

      // Math
      case "abs": case "min": case "max": case "pow": case "sqrt":
        return null; // 인자 타입에 의존
      case "gcd": case "lcm": return { kind: "i32" };

      // Cryptography & Encoding (Phase 7)
      case "md5": case "sha256": case "sha512": case "hmac":
        return { kind: "string" };
      case "base64_encode": return { kind: "string" };
      case "base64_decode":
        return { kind: "result", ok: { kind: "string" }, err: { kind: "string" } };

      // JSON (Phase 7)
      case "json_parse":
        return { kind: "result", ok: { kind: "unknown" }, err: { kind: "string" } };
      case "json_stringify": return { kind: "string" };
      case "json_validate": return { kind: "bool" };
      case "json_pretty": return { kind: "string" };

      // Utils (Phase 7)
      case "uuid": return { kind: "string" };
      case "timestamp": return { kind: "f64" };

      // Environment
      case "env": return { kind: "string" };

      // HTTP Client (Phase 2)
      case "http_get": case "http_post": case "http_post_json": case "fetch":
        return { kind: "result", ok: { kind: "string" }, err: { kind: "string" } };

      // Database (Phase 3)
      case "sqlite_open":
      case "pg_connect":
      case "mysql_connect":
        return { kind: "unknown" }; // Returns database handle
      case "sqlite_query":
      case "pg_query":
      case "mysql_query":
        return { kind: "result", ok: { kind: "array", element: { kind: "unknown" } }, err: { kind: "string" } };
      case "sqlite_execute":
      case "pg_execute":
      case "mysql_execute":
        return { kind: "result", ok: { kind: "unknown" }, err: { kind: "string" } };
      case "sqlite_close":
      case "sqlite_begin": case "sqlite_commit": case "sqlite_rollback":
      case "pg_close":
      case "pg_begin": case "pg_commit": case "pg_rollback":
      case "mysql_close":
      case "mysql_begin": case "mysql_commit": case "mysql_rollback":
        return { kind: "void" };

      // v4.3 Extensions - Math (7) - B-1
      case "floor": case "ceil": case "round":
        return { kind: "i32" };
      case "random":
        return { kind: "f64" };
      case "sin": case "cos":
        return { kind: "f64" };
      case "log":
        return { kind: "result", ok: { kind: "f64" }, err: { kind: "string" } };

      // v4.3 Extensions - String (3) - B-2
      case "index_of":
        return { kind: "option", element: { kind: "i32" } };
      case "pad_left": case "pad_right":
        return { kind: "string" };

      // v4.3 Extensions - Regex (3) - B-3
      case "regex_match":
        return { kind: "option", element: { kind: "string" } };
      case "regex_find_all":
        return { kind: "array", element: { kind: "string" } };
      case "regex_replace":
        return { kind: "result", ok: { kind: "string" }, err: { kind: "string" } };

      // v4.3 Extensions - CSV (2) - B-4
      case "csv_parse":
        return { kind: "array", element: { kind: "array", element: { kind: "string" } } };
      case "csv_stringify":
        return { kind: "string" };

      // v4.3 Extensions - DateTime (3) - B-5
      case "now":
        return { kind: "f64" };
      case "format_date":
        return { kind: "string" };
      case "parse_date":
        return { kind: "result", ok: { kind: "f64" }, err: { kind: "string" } };

      default: return null;
    }
  }

  // ============================================================
  // 채널/Actor 관련 검사
  // ============================================================

  private checkChanNew(expr: Expr & { kind: "chan_new" }): Type {
    const elementType = annotationToType(expr.element, this.structs);
    return { kind: "channel", element: elementType };
  }

  private checkChanSend(expr: Expr & { kind: "chan_send" }): Type {
    const chanType = this.checkExpr(expr.chan);
    const valueType = this.checkExpr(expr.value);

    if (chanType.kind !== "channel" && chanType.kind !== "unknown") {
      this.error(
        `cannot send on non-channel type ${typeToString(chanType)}`,
        expr.line, expr.col,
      );
      return { kind: "void" };
    }

    if (chanType.kind === "channel") {
      if (!typesEqual(chanType.element, valueType) && valueType.kind !== "unknown") {
        this.error(
          `channel element type mismatch: expected ${typeToString(chanType.element)}, got ${typeToString(valueType)}`,
          expr.line, expr.col,
        );
      }
    }

    return { kind: "void" };
  }

  private checkChanRecv(expr: Expr & { kind: "chan_recv" }): Type {
    const chanType = this.checkExpr(expr.chan);

    if (chanType.kind !== "channel" && chanType.kind !== "unknown") {
      this.error(
        `cannot receive on non-channel type ${typeToString(chanType)}`,
        expr.line, expr.col,
      );
      return { kind: "unknown" };
    }

    if (chanType.kind === "channel") {
      return chanType.element;
    }

    return { kind: "unknown" };
  }

  // ============================================================
  // 에러 헬퍼
  // ============================================================

  private error(message: string, line: number, col: number): void {
    this.errors.push({ message, line, col });
  }

  // ============================================================
  // 제네릭 관련 public 메서드
  // ============================================================

  getInstantiatedFunctions(): Map<string, FnInfo> {
    return this.instantiatedFunctions;
  }

  getInstantiatedStructs(): Map<string, Type> {
    return this.instantiatedStructs;
  }

  getGenericFunctions(): Map<string, GenericFnDef> {
    return this.genericFunctions;
  }

  getGenericStructs(): Map<string, GenericStructDef> {
    return this.genericStructs;
  }

  getStructs(): Map<string, Type> {
    return this.structs;
  }

  // ============================================================
  // Name mangling for generic instantiations
  // ============================================================

  private typeToMangledName(t: Type): string {
    switch (t.kind) {
      case "i32": return "i32";
      case "i64": return "i64";
      case "f64": return "f64";
      case "bool": return "bool";
      case "string": return "str";
      case "void": return "void";
      case "array":
        return `arr_${this.typeToMangledName(t.element)}`;
      case "channel":
        return `chan_${this.typeToMangledName(t.element)}`;
      case "option":
        return `opt_${this.typeToMangledName(t.element)}`;
      case "result":
        return `res_${this.typeToMangledName(t.ok)}_${this.typeToMangledName(t.err)}`;
      case "struct":
        return `struct_${[...t.fields.keys()].join("_")}`;
      case "fn": {
        const paramNames = t.params.map(p => this.typeToMangledName(p)).join("_");
        const retName = this.typeToMangledName(t.returnType);
        return `fn_${paramNames}_${retName}`;
      }
      case "type_param":
        return t.name;
      case "generic_ref":
        return `gen_${t.name}`;
      default:
        return "unknown";
    }
  }

  private mangleFunctionName(baseName: string, fnType: FnInfo): string {
    const argNames = fnType.params
      .map(p => this.typeToMangledName(p.type))
      .join("_");
    const retName = this.typeToMangledName(fnType.returnType);
    if (argNames) {
      return `${baseName}_${argNames}_${retName}`;
    } else {
      return `${baseName}_${retName}`;
    }
  }

  // ============================================================
  // 제네릭 함수 인스턴시화
  // ============================================================

  instantiateFunction(name: string, typeArgs: Type[]): FnInfo | null {
    const genericFn = this.genericFunctions.get(name);
    if (!genericFn) return null;

    if (typeArgs.length !== genericFn.typeParams.length) {
      return null;
    }

    // 타입 바인딩 생성
    const bindings = new Map<string, Type>();
    for (let i = 0; i < genericFn.typeParams.length; i++) {
      bindings.set(genericFn.typeParams[i], typeArgs[i]);
    }

    // 파라미터와 반환 타입 치환
    const params = genericFn.params.map(p => ({
      name: p.name,
      type: substituteType(p.type, bindings),
    }));
    const returnType = substituteType(genericFn.returnType, bindings);

    return { params, returnType };
  }

  // ============================================================
  // 제네릭 구조체 인스턴시화
  // ============================================================

  instantiateStruct(name: string, typeArgs: Type[]): Type {
    const genericStruct = this.genericStructs.get(name);
    if (!genericStruct) return { kind: "unknown" };

    if (typeArgs.length !== genericStruct.typeParams.length) {
      return { kind: "unknown" };
    }

    // 타입 바인딩 생성
    const bindings = new Map<string, Type>();
    for (let i = 0; i < genericStruct.typeParams.length; i++) {
      bindings.set(genericStruct.typeParams[i], typeArgs[i]);
    }

    // 필드 타입 치환
    const fields = new Map<string, Type>();
    for (const [fieldName, fieldType] of genericStruct.fields) {
      fields.set(fieldName, substituteType(fieldType, bindings));
    }

    return { kind: "struct", fields };
  }
}
