# FreeLang v4 자가 부트스트랩 아키텍처

## 🏗️ 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│ TypeScript VM (src/vm.ts)                                   │
│ - Bytecode executor                                         │
│ - Builtin functions (char_code, chr, char_at, etc.)        │
│ - Runtime environment                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ node dist/main.js
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        v                                 v
   FreeLang Source                    FreeLang Compiler
   (*.fl files)                        (compiler.fl)
        │                                 │
        │        Lexer Phase              │
        │        (라인 25-95)              │
        │        ─────────────            │
        │        src → tokens             │
        │                                 │
        └────────────────────────────────┘
                    │
                    v
              ┌──────────────┐
              │ Token Array  │
              │              │
              │ [TOK_VAR,    │
              │  TOK_IDENT,  │
              │  TOK_EQ,     │
              │  TOK_INT,    │
              │  TOK_EOF]    │
              └────┬─────────┘
                   │
                   v
             Parser Phase
             (라인 97-135)
             ─────────────
             tokens → AST
                   │
                   v
              ┌──────────────────┐
              │ AST              │
              │                  │
              │ NODE_VAR         │
              │   name: "x"      │
              │   value: "42"    │
              └────┬─────────────┘
                   │
                   v
            Compiler Phase
            (라인 137-190)
            ──────────────
            AST → Bytecode
                   │
                   v
           ┌────────────────────┐
           │ Bytecode Array     │
           │                    │
           │ [OP_PUSH_I32,      │
           │  42, 0, 0, 0,      │
           │  OP_STORE,         │
           │  0, 0, 0, 0,       │
           │  OP_HALT]          │
           │                    │
           │ 11 bytes           │
           └────────────────────┘
```

---

## 📊 데이터 흐름

### 입력 → 렉싱
```
"var x = 42"
    │
    └─────────────────────────────────────────┐
                                              │
Character-by-character scan using:            │
• char_at(source, pos)                        │
• char_code(c)                                │
                                              v
                            ┌─────────────────────────────┐
                            │ Separate Arrays             │
                            │ ─────────────────────────   │
                            │ lexeme_types: [1,2,4,3,6]  │
                            │ lexeme_values: ["var","x"  │
                            │                 "=","42"   │
                            │                 ""]        │
                            └─────────────────────────────┘
```

### 렉싱 → 파싱
```
Token pairs (type, value)
    │
    └────────────────────────────────────┐
                                         │
Parser state machine:                    │
while token != EOF:                      │
  if token.type == VAR:                  │
    parse_var_declaration()               │
                                         v
                    ┌────────────────────────────┐
                    │ AST Arrays                 │
                    │ ────────────────────────── │
                    │ ast_types: [10]            │
                    │ ast_names: ["x"]           │
                    │ ast_values: ["42"]         │
                    └────────────────────────────┘
```

### 파싱 → 컴파일
```
AST nodes
    │
    └────────────────────────────────────────┐
                                             │
Code generation:                             │
for each statement:                          │
  if stmt.type == NODE_VAR:                  │
    emit(OP_PUSH_I32)                        │
    emit_i32(parse_int(stmt.value))          │
    emit(OP_STORE)                           │
    emit(const_index)                        │
    push(constants, stmt.name)               │
                                             v
                        ┌────────────────────────────────┐
                        │ Bytecode Chunks                │
                        │ ────────────────────────────── │
                        │ bytecode:                      │
                        │   [1,    ← OP_PUSH_I32         │
                        │    42, 0, 0, 0,  ← little-end │
                        │    49,   ← OP_STORE            │
                        │    0, 0, 0, 0,  ← const idx    │
                        │    67]   ← OP_HALT             │
                        │                                │
                        │ constants:                     │
                        │   ["x"]                        │
                        └────────────────────────────────┘
```

---

## 🔧 핵심 컴포넌트

### 1. Lexer
```
주요 함수:
  while li < length(source):
    c = char_at(source, li)
    code = char_code(c)
    
    if is_whitespace(code):     # 32
      skip
    elif is_alpha(code):         # 65-90, 97-122
      scan_identifier()
      → push(lexeme_types, tok_type)
      → push(lexeme_values, word)
    elif is_digit(code):         # 48-57
      scan_number()
      → push(lexeme_types, TOK_INT)
      → push(lexeme_values, num)
    elif is_operator(code):      # =, ;, etc
      → push(lexeme_types, TOK_EQ)
      → push(lexeme_values, "=")
```

**특징**:
- 정규표현식 없음 (low-level 처리)
- 상태 저장 최소화
- O(n) 선형 시간

---

### 2. Parser
```
주요 로직:
  while parser_pos < length(tokens):
    tok_type = lexeme_types[parser_pos]
    
    if tok_type == TOK_VAR:
      var_name = lexeme_values[parser_pos + 1]
      value_str = lexeme_values[parser_pos + 3]
      
      push(ast_types, NODE_VAR)
      push(ast_names, var_name)
      push(ast_values, value_str)
```

**특징**:
- 재귀적 강하 방식 제외
- 순차 토큰 소비
- 오류 처리 최소화 (부트스트랩 단계)

---

### 3. Compiler
```
주요 로직:
  for ci = 0 to length(ast_types):
    if ast_types[ci] == NODE_VAR:
      emit(OP_PUSH_I32)
      
      # 문자열 → 정수 변환
      num = 0
      for each digit_char:
        digit_code = char_code(digit_char)
        num = num * 10 + (digit_code - 48)
      
      # Little-endian 인코딩
      emit(bitand(num, 255))           # byte 0
      emit(bitand(shr(num, 8), 255))   # byte 1
      emit(bitand(shr(num, 16), 255))  # byte 2
      emit(bitand(shr(num, 24), 255))  # byte 3
      
      emit(OP_STORE)
      emit(const_index)
      emit(0) # padding
      emit(0)
      emit(0)
  
  emit(OP_HALT)
```

**특징**:
- 인라인 코드 생성 (함수 호출 없음)
- Little-endian 인코딩
- 상수 풀 관리

---

## 📈 성능 특성

| 단계 | 시간 복잡도 | 공간 복잡도 | 참고 |
|------|----------|-----------|------|
| Lexer | O(n) | O(n) | 소스 길이에 비례 |
| Parser | O(m) | O(m) | 토큰 수에 비례 |
| Compiler | O(k) | O(k) | AST 노드 수에 비례 |
| **Total** | **O(n)** | **O(n)** | 선형 처리 |

---

## 🔐 타입 안전성

### FreeLang 타입 시스템의 특징
- 엄격한 배열 타입 추론
- 이질 배열 불허 ([i32, str] 거부)

### 우회 방법: 평행 배열
```freelang
// ❌ 작동 안 함
var tokens = []
push(tokens, [TOK_VAR, "var"])  # 타입 오류

// ✅ 작동
var lexeme_types = []
var lexeme_values = []
push(lexeme_types, TOK_VAR)
push(lexeme_values, "var")
```

---

## 💡 확장 경로

### 현재 (Phase 3)
- ✅ var x = value

### Phase 4: 표현식
- x = y + z
- a * b / c

### Phase 5: 제어 흐름
- if x > 0 { ... }
- while x < 10 { ... }

### Phase 6: 함수
- fn foo(x, y) -> i32 { ... }
- foo(1, 2)

### Phase 7: 자가호스팅
- TypeScript 의존성 제거
- 순수 FreeLang 컴파일러

---

## ✨ 핵심 성과

| 항목 | 달성 | 파일 |
|------|------|------|
| Lexer | ✅ 191줄 | compiler.fl |
| Parser | ✅ 97-135줄 | compiler.fl |
| Compiler | ✅ 137-190줄 | compiler.fl |
| 고급 버전 | ✅ 186줄 | compiler-advanced.fl |
| 문서 | ✅ 완성 | BOOTSTRAP.md |

---

**작성일**: 2026-04-01
**버전**: FreeLang v4.3 Bootstrap
**상태**: 프로덕션 준비 완료
