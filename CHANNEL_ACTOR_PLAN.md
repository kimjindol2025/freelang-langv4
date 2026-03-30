# 📡 FreeLang v4 채널/Actor 기능 구현 계획서

**예상 시간**: 18-26시간 (약 3-4일) | **난이도**: 중상 (6/10)

---

## 1. 현황 분석

### ✅ 이미 구현된 부분 (70-80%)

#### AST 노드 (ast.ts)
```typescript
TypeAnnotation: { kind: "channel"; element: TypeAnnotation }
Stmt: { kind: "spawn_stmt"; body: Stmt[] }
```

#### 토큰 타입 (lexer.ts)
```typescript
TokenType.SPAWN = "SPAWN"
TokenType.TYPE_CHANNEL = "TYPE_CHANNEL"
```

#### OpCode (compiler.ts)
```typescript
SPAWN = 0x80,
CHAN_NEW = 0x81,
CHAN_SEND = 0x82,
CHAN_RECV = 0x83,
```

#### VM 데이터 구조 (vm.ts)
```typescript
type Channel = {
  id: number
  buffer: Value[]
  waitingRecv: number[]
}

type Actor = {
  id: number
  ip: number
  stack: Value[]
  frames: CallFrame[]
  state: "running" | "waiting" | "done"
  waitingChan: number | null
}
```

#### VM 스케줄러
- Round-robin 스케줄러 구현됨
- Op.SPAWN, CHAN_NEW, CHAN_SEND, CHAN_RECV 부분 구현됨

---

## 2. 미완성 부분

- ❌ 채널 생성 구문: `channel<T>()` 함수 호출
- ❌ 채널 send/recv 문법: `chan <- value`, `<- chan`
- ❌ 타입 체커: 채널 타입 검사
- ❌ 컴파일러: IR 생성 및 바이트코드 컴파일
- ❌ 통합 테스트: 채널/Actor 테스트

---

## 3. 필요한 AST 노드

```typescript
// ast.ts의 Expr 타입에 추가
| { kind: "chan_new"; element: TypeAnnotation; line: number; col: number }
| { kind: "chan_send"; chan: Expr; value: Expr; line: number; col: number }
| { kind: "chan_recv"; chan: Expr; line: number; col: number }
```

---

## 4. 필요한 토큰 및 문법

### 추가 토큰 (lexer.ts)
```typescript
LARROW = "LARROW",  // <- (송수신 연산자)
```

### 파서 확장 (parser.ts)
```
channel<i32>()     → chan_new 식
chan <- 42         → chan_send 식
<- chan            → chan_recv 식
```

---

## 5. 타입 체커 변경사항 (checker.ts)

```typescript
// 채널 타입 호환성 검사
function isChannelCompatible(actualType: Type, expectedType: Type): boolean {
  if (actualType.kind !== "channel" || expectedType.kind !== "channel") {
    return false;
  }
  return typesEqual(actualType.element, expectedType.element);
}

// 채널 식 검사 추가
case "chan_new":
  return { kind: "channel", element: annotationToType(expr.element) };

case "chan_send":
  // chan <- value 검사
  checkChannelType(expr.chan, "cannot send on non-channel");
  checkTypeMatch(chanType.element, valueType, "channel element type mismatch");
  return { kind: "void" };

case "chan_recv":
  // <- chan 검사
  checkChannelType(expr.chan, "cannot receive on non-channel");
  return { kind: "result", ok: chanType.element, err: { kind: "string" } };
```

---

## 6. IR 확장 (ir.ts)

```typescript
// IrInst에 추가
| { kind: "chan_new"; dest: string }
| { kind: "chan_send"; chan: IrValue; value: IrValue }
| { kind: "chan_recv"; dest: string; chan: IrValue }
```

---

## 7. 컴파일러 구현 (compiler.ts)

```typescript
// compileExpr()에 추가
case "chan_new": {
  this.chunk.emit(Op.CHAN_NEW, expr.line);
  break;
}

case "chan_send": {
  this.compileExpr(expr.chan);
  this.compileExpr(expr.value);
  this.chunk.emit(Op.CHAN_SEND, expr.line);
  break;
}

case "chan_recv": {
  this.compileExpr(expr.chan);
  this.chunk.emit(Op.CHAN_RECV, expr.line);
  break;
}
```

---

## 8. VM 런타임 (vm.ts)

SPAWN, CHAN_NEW, CHAN_SEND, CHAN_RECV는 이미 부분 구현됨:

```typescript
// 이미 구현됨:
// - SPAWN: 라인 519-530
// - CHAN_NEW: 라인 532-540
// - CHAN_SEND: 라인 542-557
// - CHAN_RECV: 라인 559-573

// 개선 사항:
// - 오류 처리 강화
// - Deadlock 감지 (선택)
// - 타임아웃 지원 (선택)
```

---

## 9. 테스트 케이스

### 기본 테스트 (7가지)

1. **채널 생성**: `var ch = channel<i32>();`
2. **송수신**: Actor에서 송신, 메인에서 수신
3. **다중 Actor**: 여러 actor 간 통신
4. **실행 순서**: Actor 스케줄링 검증
5. **타입 검사**: 타입 미스매치 에러 검출
6. **복합 타입**: Struct를 채널로 송수신
7. **성능**: 100+ 메시지 처리

### 예제 코드

```freeLang
// 기본 채널 사용
var ch = channel<i32>();

spawn {
  ch <- 42;  // 송신
  ch <- 100;
}

var x = <- ch;  // 수신
var y = <- ch;
println(str(x));  // 42
println(str(y));  // 100
```

---

## 10. 구현 순서 및 예상 시간

| Phase | 작업 | 예상 시간 |
|-------|------|---------|
| 1 | AST/파서/토큰 추가 | 2-3시간 |
| 2 | 타입 체커 확장 | 3-4시간 |
| 3 | IR 생성 | 2시간 |
| 4 | 바이트코드 컴파일 | 3-4시간 |
| 5 | VM 런타임 (검증/완성) | 3-4시간 |
| 6 | 통합 테스트 | 3-4시간 |
| 7 | 최적화/정리 | 2시간 |
| **총합** | | **18-26시간** |

**추정 일정**: 약 **3-4일** (하루 6-8시간 개발)

---

## 11. 핵심 발견사항

✅ **좋은 소식**: 기초 구조(AST, OpCode, VM)가 이미 70-80% 구현되어 있습니다.

⚠️ **해야 할 일**:
- 식 문법 추가 (`chan_new`, `chan_send`, `chan_recv`)
- 타입 체커 확장
- 컴파일러의 IR 및 바이트코드 생성 완성
- VM의 기존 OpCode 구현 검증

✨ **이점**:
- 구현 시간이 예상보다 짧음 (3-4일)
- 위험도 낮음 (기초가 안정적)
- 테스트 용이함 (VM 이미 구현됨)

---

## ✅ 결론

이 계획을 따라 단계적으로 진행하면 **안정적이고 완전한 채널/Actor 시스템**을 구축할 수 있습니다.
