# Phase 1 상세 수정 계획

**목표:** 252/252 테스트 통과 (현재 233/252)

---

## 🔴 Issue 1: 패턴 매칭 - match_expr이 void 반환

**현재 코드:** src/compiler.ts:1364-1405
**증상:** match 식이 항상 "void" 반환
**원인:** 라인 1400에서 무조건 PUSH_VOID

### 현재 코드 분석
```typescript
private compileMatchExpr(expr: Expr & { kind: "match_expr" }): void {
  this.compileExpr(expr.subject);           // subject를 스택에 push
  const endJumps: number[] = [];

  for (const arm of expr.arms) {
    this.chunk.emit(Op.DUP, expr.line);     // subject 복제
    this.compilePatternTest(arm.pattern, expr.line);
    this.chunk.emit(Op.JUMP_IF_FALSE, expr.line);
    const nextArm = this.chunk.currentOffset();
    this.chunk.emitI32(0, expr.line);

    // Guard 절 처리 (이미 구현됨)
    if (arm.guard) {
      this.compileExpr(arm.guard);          // guard 조건 평가
      this.chunk.emit(Op.JUMP_IF_FALSE, expr.line);
      guardJump = this.chunk.currentOffset();
      this.chunk.emitI32(0, expr.line);
    }

    this.chunk.emit(Op.POP, expr.line);     // subject 제거 ← 문제!
    this.compileExpr(arm.body);             // arm body 실행, 값 스택에

    this.chunk.emit(Op.JUMP, expr.line);    // 다음 arm 스킵
    endJumps.push(this.chunk.currentOffset());
    this.chunk.emitI32(0, expr.line);

    if (guardJump !== null) {
      this.chunk.patchI32(guardJump, this.chunk.currentOffset());
    }

    this.chunk.patchI32(nextArm, this.chunk.currentOffset());
  }

  this.chunk.emit(Op.POP, expr.line);       // subject 제거
  this.chunk.emit(Op.PUSH_VOID, expr.line); // ← void 푸시!

  for (const j of endJumps) {
    this.chunk.patchI32(j, this.chunk.currentOffset());
  }
}
```

### 문제점
1. 모든 arm을 처리한 후 무조건 `PUSH_VOID`
2. arm.body의 값이 무시됨
3. endJumps patch가 PUSH_VOID 이후에 됨 (너무 늦음)

### 수정 방안

```typescript
private compileMatchExpr(expr: Expr & { kind: "match_expr" }): void {
  this.compileExpr(expr.subject);
  const endJumps: number[] = [];
  let hasMatch = false;

  for (const arm of expr.arms) {
    this.chunk.emit(Op.DUP, expr.line);
    this.compilePatternTest(arm.pattern, expr.line);
    
    this.chunk.emit(Op.JUMP_IF_FALSE, expr.line);
    const skipThisArm = this.chunk.currentOffset();
    this.chunk.emitI32(0, expr.line);

    // Guard 절
    let skipGuard: number | null = null;
    if (arm.guard) {
      this.compileExpr(arm.guard);
      this.chunk.emit(Op.JUMP_IF_FALSE, expr.line);
      skipGuard = this.chunk.currentOffset();
      this.chunk.emitI32(0, expr.line);
    }

    // 매칭됨 - subject 제거 후 body 실행
    this.chunk.emit(Op.POP, expr.line);
    this.compileExpr(arm.body);
    
    // 다른 arm 스킵
    this.chunk.emit(Op.JUMP, expr.line);
    endJumps.push(this.chunk.currentOffset());
    this.chunk.emitI32(0, expr.line);

    // Guard 실패 시 label patch
    if (skipGuard !== null) {
      this.chunk.patchI32(skipGuard, this.chunk.currentOffset());
    }

    // 다음 arm으로 label patch
    this.chunk.patchI32(skipThisArm, this.chunk.currentOffset());
  }

  // 모든 arm 미매칭 시 (fallthrough)
  this.chunk.emit(Op.POP, expr.line);
  this.chunk.emit(Op.PUSH_VOID, expr.line);

  // 성공한 arm의 끝 label patch
  for (const j of endJumps) {
    this.chunk.patchI32(j, this.chunk.currentOffset());
  }
}
```

---

## 🟠 Issue 2: 패턴 매칭 - 구조체 패턴 파싱 실패

**현재 코드:** src/parser.ts:990-1015 (parsePattern)
**증상:** Parse error: "expected field name (got RBRACE)"
**원인:** 빈 구조체 패턴 `Point { }` 처리 불완전

### 현재 코드 분석
```typescript
private parsePattern(): Pattern {
  // ... 생략 ...
  
  if (this.check(TokenType.LBRACE)) {
    this.advance(); // {
    const fields: { name: string; pattern: Pattern; alias?: string }[] = [];
    let rest = false;

    if (!this.check(TokenType.RBRACE)) {  // ← 문제: RBRACE 이후 처리가 계속됨
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.DOTDOT)) {
          rest = true;
          break;
        }

        const fieldName = this.expectIdent("field name");  // ← RBRACE일 때 에러!
        // ...
      }
    }

    this.expect(TokenType.RBRACE, "expected '}'");
    return { kind: "struct", name: ident, fields, rest };
  }
}
```

### 수정 방안
```typescript
if (this.check(TokenType.LBRACE)) {
  this.advance(); // {
  const fields: { name: string; pattern: Pattern; alias?: string }[] = [];
  let rest = false;

  // 빈 중괄호도 허용 Point { }
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
```

---

## 🟡 Issue 3: async/await - Promise 타입 미완성

**파일:** src/checker.ts, src/compiler.ts
**증상:** async fn이 Promise로 감싸지지 않음

### 수정 위치: src/checker.ts:343-365 (registerFunction)

**현재:**
```typescript
private registerFunction(stmt: Stmt & { kind: "fn_decl" }): void {
  // ...
  let returnType = annotationToType(stmt.returnType, this.structs);

  if (stmt.isAsync) {
    returnType = { kind: "promise", element: returnType };
  }
  // ...
}
```

**검증 필요:**
- async fn은 Promise<T>로 변환되는가? ✅ (이미 구현됨)
- Promise 클래스가 정의되어 있는가?

### 수정 필요 위치: src/compiler.ts (await 처리)

**현재:**
```typescript
case "await": {
  this.compileExpr(expr.expr);
  // await 처리가 없음
  break;
}
```

**수정:**
```typescript
case "await": {
  this.compileExpr(expr.expr);  // Promise 객체 평가
  
  // Promise._value 필드 추출
  this.chunk.emit(Op.FIELD_GET, expr.line);
  this.chunk.emitI32(
    this.chunk.addConstant("_value"),
    expr.line
  );
  break;
}
```

---

## 🟢 Issue 4: 채널 - VM 런타임 미구현

**파일:** src/vm.ts:1800-2000
**증상:** "panic: send on non-channel"

### 필요한 구현

**1. Channel 클래스 추가**
```typescript
class Channel {
  elementType: any;
  queue: Value[] = [];
  
  send(value: Value) {
    this.queue.push(value);
  }
  
  receive(): Value | null {
    return this.queue.shift() || null;
  }
}
```

**2. Op.CHAN_NEW 구현**
```typescript
case Op.CHAN_NEW: {
  // 타입 정보가 필요하지만, 일단 generic Channel 생성
  const chan = new Channel();
  this.push(chan);
  break;
}
```

**3. Op.CHAN_SEND 구현**
```typescript
case Op.CHAN_SEND: {
  const value = this.pop();
  const chan = this.pop();

  if (!chan || !(chan instanceof Channel)) {
    throw new Error("panic: send on non-channel");
  }

  chan.send(value);
  break;
}
```

**4. Op.CHAN_RECV 구현**
```typescript
case Op.CHAN_RECV: {
  const chan = this.pop();

  if (!chan || !(chan instanceof Channel)) {
    throw new Error("panic: receive from non-channel");
  }

  const value = chan.receive();
  this.push(value);
  break;
}
```

---

## 📊 수정 요약

| Issue | 파일 | 라인 | 난이도 | 시간 |
|-------|------|------|--------|------|
| 1. match_expr void | compiler.ts | 1364-1405 | 🟡 중 | 1-2h |
| 2. struct 패턴 파싱 | parser.ts | 990-1015 | 🟢 낮 | 30m |
| 3. async Promise | checker.ts + compiler.ts | 여러 곳 | 🟡 중 | 1-2h |
| 4. 채널 런타임 | vm.ts | 1800-2000 | 🟡 중 | 1-2h |

---

## ✅ 구현 순서

1. **Issue 4 (채널)** - 가장 독립적 (vm.ts만 수정)
2. **Issue 2 (struct 파싱)** - 가장 간단 (parser.ts만)
3. **Issue 3 (async)** - 중간 (checker + compiler)
4. **Issue 1 (match_expr)** - 가장 복잡 (compiler 로직)

---

**예상 완료:** 3-4시간
**테스트:** npm test → 252/252
