# SPEC_13: Error Handling (에러 처리)

**Version**: 1.0
**Status**: Stable
**Phase**: 8.6
**Date**: 2026-03-03

---

## 목차
1. [개념](#개념)
2. [문법](#문법)
3. [의미론](#의미론)
4. [에러 객체](#에러-객체)
5. [제어 흐름](#제어-흐름)
6. [타입 규칙](#타입-규칙)
7. [제약](#제약)
8. [예제](#예제)

---

## 개념

**에러 처리(Error Handling)**는 런타임 중 발생할 수 있는 **예기치 않은 상황**을 안전하게 처리합니다.

### 핵심 특징
- **try-catch-finally**: 오류 발생 영역, 처리, 정리를 명확히 분리
- **에러 객체**: 오류 타입, 메시지, 코드를 구조화
- **전파**: 처리하지 않은 오류는 상위 호출자에게 전파
- **finally**: 성공/실패 관계없이 항상 실행 (리소스 정리)
- **raise**: 명시적 오류 발생 및 전파

---

## 문법

### 1. Try-Catch 블록

```
TryCatchExpr = "try" "{" StmtList "}"
               CatchClause*
               FinallyClause?

CatchClause = "catch" "(" IDENT ")" "{" StmtList "}"

FinallyClause = "finally" "{" StmtList "}"
```

### 2. Raise 문

```
RaiseStmt = "raise" Expr ";"

Expr = ErrorObject  (오류 객체)
```

### 3. Error 객체

```
ErrorObject = "{"
               "type" ":" StringLit ","
               "message" ":" StringLit
               ("code" ":" IntLit)?
             "}"
```

---

## 의미론

### 규칙 1: Try-Catch 실행

**입력**: Try 블록, Catch 블록들, Finally 블록
**처리**:

```
Algorithm: TRY_CATCH_FINALLY
1. try_env = current_env
2. try:
     Execute(try_block, try_env)
   catch err:
     for each catch_block in catch_blocks:
       if CanMatch(err, catch_var_type):
         Bind(catch_var, err) in new_scope
         Execute(catch_block, new_scope)
         handled = true
         break
     if not handled:
       PropagateError(err)  # 상위로 전파
3. finally:
     Execute(finally_block, try_env)  # 항상 실행
```

**흐름**:
- Try 성공 → finally 실행 → 정상 복귀
- Try 오류 → catch 처리 → finally 실행 → 정상 복귀
- Catch 없음 → finally 실행 → 오류 전파

---

### 규칙 2: Raise 문

**입력**: 오류 객체 `err`
**처리**:
1. 오류 객체 생성:
   - `err.type`: 오류 종류 (IOError, TypeError, etc.)
   - `err.message`: 오류 메시지
   - `err.code`: 선택적 오류 코드
2. 현재 실행 흐름 중단
3. 현재 try-catch 블록으로 제어권 이동
4. 처리하는 catch 없으면 상위 호출자에게 전파

**형식**:
```
raise {type: "DivideByZero", message: "division by zero"};
```

---

### 규칙 3: 오류 전파 (Error Propagation)

**입력**: 처리되지 않은 오류 `err`
**처리**:
1. 현재 함수 종료 (finally는 실행)
2. 호출자의 try-catch로 전파
3. 호출자도 처리 못하면 재귀적 전파
4. 최상위 레벨까지 전파 → 프로그램 종료

**스택 추적**:
```
func A() { func B(); }  // A는 B 호출
func B() { raise ... }  // B가 오류 발생
// A → B의 오류 받음
```

---

### 규칙 4: Finally 블록 실행

**입력**: Try/Catch 완료, Finally 블록
**처리**:
1. Try 성공했든, Catch에서 처리했든 상관없이 실행
2. Finally 내부에서도 오류 발생 가능 (이전 오류 덮어씀)
3. Finally는 리소스 정리용 (파일 닫기, 연결 해제 등)

**의미론**:
```
result = execute(try_block)
if error:
  result = execute(catch_block)
finally:
  execute(finally_block)  # 항상 실행
return result
```

---

### 규칙 5: 중첩 Try-Catch

**입력**: 내부 try와 외부 try
**처리**:
1. 내부 try에서 오류 발생
2. 내부 catch가 있으면 내부 catch에서 처리
3. 내부 catch로도 처리 못하면 외부 try로 전파
4. 외부 catch에서 처리

**스택**:
```
try {
  try {
    raise ...  // 내부 오류
  } catch (e1) {
    // 내부 처리 시도
  }
} catch (e2) {
  // 외부 처리 (내부에서 처리 못한 경우)
}
```

---

## 에러 객체

### 구조

```
ErrorObject = {
  type: string       # 오류 분류 (IOError, TypeError, ValueError, etc.)
  message: string    # 사람이 읽을 수 있는 설명
  code?: i32         # 선택적 오류 코드 (HTTP 상태 코드 등)
}
```

### 표준 오류 타입

| 타입 | 의미 | 예시 |
|------|------|------|
| IOError | 파일/네트워크 입출력 | "File not found" |
| TypeError | 타입 불일치 | "expected i32, got string" |
| ValueError | 값이 유효하지 않음 | "invalid argument" |
| DivideByZero | 0으로 나눔 | (arithmetic) |
| OutOfBounds | 배열 범위 초과 | (indexing) |
| NullPointer | null 참조 | (FreeLang에서는 불가능) |
| RuntimeError | 일반 런타임 오류 | (기타) |

---

## 제어 흐름

### 1. 정상 흐름

```
try {
  // 정상 실행
}
catch (e) {
  // 실행되지 않음
}
finally {
  // 항상 실행
}
// 계속 진행
```

### 2. 오류 발생 및 처리

```
try {
  raise {type: "IOError", message: "..."};
  // 여기서부터 실행 중단
}
catch (e) {
  // e = {type: "IOError", message: "..."}
  // 오류 처리
}
finally {
  // 항상 실행
}
// 계속 진행
```

### 3. 오류 전파

```
try {
  // catch 없음 또는 매칭되지 않음
  raise {type: "TypeError", ...};
}
finally {
  // 항상 실행
}
// 상위 호출자의 try로 전파
```

---

## 타입 규칙

### T-TryCatchExpr (Try-Catch 표현식)

```
⊢ try_block: Type_T
⊢ catch_block_i: Type_T (모든 catch 블록이 동일 타입)
⊢ finally_block: void

⊢ try { try_block } catch (...) { catch_block } finally { finally_block }: Type_T
```

**제약**:
1. 모든 catch 블록의 반환 타입이 일치
2. Finally는 반드시 void (부작용만)
3. 오류 객체 타입은 정해짐 (ErrorObject)

### T-RaiseStmt (Raise 문)

```
⊢ err: ErrorObject

⊢ raise err: ⊥  (bottom type - 반환 안 함)
```

**의미**: Raise 후 실행 흐름이 없으므로 `⊥` 타입

---

## 제약

### C1. Catch 변수 타입

```freelang
try {
  raise {type: "IOError", message: "..."};
} catch (e) {
  // e의 타입은 ErrorObject
  var t: string = e.type;      // ✓ OK
  var m: string = e.message;   // ✓ OK
  var c: i32 = e.code;         // ❌ 오류: code는 Option<i32>
}
```

**규칙**: Catch 변수는 ErrorObject 타입

### C2. Finally는 부수효과만

```freelang
try {
  ...
} finally {
  var x = 10;  // ✓ OK
  return 42;   // ❌ 오류: finally에서 return 금지
}
```

**규칙**: Finally는 값을 반환하지 않음

### C3. Raise는 흐름 중단

```freelang
try {
  raise {type: "Error", message: "..."};
  var x = 10;  // ❌ 도달 불가능
}
```

**규칙**: Raise 이후 코드는 실행되지 않음

### C4. 오류 객체 구조

```freelang
raise "just a string";  // ❌ 오류: ErrorObject 필요
raise {type: "Error"};  // ❌ 오류: message 필수
raise {type: "Error", message: "msg"};  // ✓ OK
```

**규칙**: type과 message는 필수, code는 선택

---

## 예제

### 예제 1: 파일 읽기

**의도**: 파일을 읽고 오류 처리

```freelang
var read_config = fn(path: string) -> string {
  try {
    var content = read_file(path);
    return content
  } catch (e) {
    if e.type == "IOError" {
      println("File not found: " + e.message);
      return ""
    } else {
      raise e  // 다른 오류는 재전파
    }
  } finally {
    println("Read attempt finished")
  }
}
```

**의미론**:
- 파일 읽기 성공 → content 반환 → finally 실행
- IOError 발생 → 오류 메시지 출력, 기본값 반환 → finally 실행
- 다른 오류 → 다시 raise → finally 실행 후 전파

---

### 예제 2: 중첩 Try-Catch

```freelang
var process = fn(data: [i32]) -> i32 {
  try {
    try {
      if data[0] == 0 {
        raise {type: "ValueError", message: "first element cannot be 0"}
      }
      return 100 / data[0]
    } catch (e) {
      println("Inner catch: " + e.message);
      raise e  // 외부로 전파
    }
  } catch (e) {
    println("Outer catch: handling " + e.type);
    return -1
  }
}
```

**흐름**:
1. 내부 try에서 오류 발생
2. 내부 catch에서 출력 후 재전파
3. 외부 catch에서 처리
4. 최종 반환: -1

---

### 예제 3: Finally로 리소스 정리

```freelang
var process_file = fn(path: string) -> i32 {
  var file = open_file(path);
  try {
    var sum = 0;
    for line of read_lines(file) {
      sum = sum + parse_int(line)  // 파싱 오류 가능
    }
    return sum
  } catch (e) {
    println("Error: " + e.message);
    return 0
  } finally {
    close_file(file)  // 성공/실패 관계없이 항상 닫기
  }
}
```

**의미론**:
- 정상 완료 → finally에서 파일 닫음
- 파싱 오류 → catch 처리 → finally에서 파일 닫음 (누수 방지)

---

### 예제 4: Result와의 조합

```freelang
struct Config { timeout: i32, retries: i32 }

var load_config = fn(path: string) -> Result<Config, string> {
  try {
    var json = read_file(path);
    var obj = json_parse(json);
    return Ok({
      timeout: obj.timeout,
      retries: obj.retries
    })
  } catch (e) {
    return Err(e.message)
  }
}
```

**의미론**: 예외 → Result 타입으로 변환

---

## 상호 참조

- **SPEC_09**: Struct (에러 객체의 구조)
- **SPEC_11**: 제어 흐름 (try-catch도 제어 흐름)
- **SPEC_12**: Pattern Matching (catch에서 패턴 매칭 가능)

---

## 변경 이력

| 버전 | 날짜        | 변경사항        |
|------|-----------|-------------|
| 1.0  | 2026-03-03 | 초판 작성      |

---

## 참고: AST 매핑 (참조 구현)

```typescript
// Try-Catch-Finally 표현식
type TryCatchExpr = {
  kind: "try_catch"
  tryBlock: Stmt[]
  catchClauses: CatchClause[]
  finallyBlock?: Stmt[]
}

// Catch 절
type CatchClause = {
  errorVar: string  // 오류를 바인딩할 변수명
  body: Stmt[]
}

// Raise 문
type RaiseStmt = {
  kind: "raise"
  error: Expr  // ErrorObject 표현식
}

// 오류 객체 (구조체 리터럴로 표현)
// {type: "IOError", message: "...", code?: 404}
```

---

## VM 수준 구현

Try-Catch는 VM에서 다음과 같이 구현:

```
TRY_BEGIN handler_addr    # try 시작, 오류 시 handler_addr로 점프
  ... try 본체 ...
TRY_END                   # try 종료
JMP finally_addr          # finally로 점프
handler_addr:             # 오류 핸들러
  ... catch 본체 ...
finally_addr:
  ... finally 본체 ...
```
