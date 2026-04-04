# 📚 FreeLang v4 - API 레퍼런스

**표준 라이브러리 42개 함수**

---

## 📋 카테고리별 함수 목록

### 1️⃣ 문자열 (String) - 8개 함수

#### length() -> i32
문자열의 길이 반환
```freelang
let text = "hello"
let len = text.length()  // 5
```

#### to_upper() -> str
대문자로 변환
```freelang
let text = "hello"
let upper = text.to_upper()  // "HELLO"
```

#### to_lower() -> str
소문자로 변환
```freelang
let text = "HELLO"
let lower = text.to_lower()  // "hello"
```

#### slice(start: i32, end: i32) -> str
부분 문자열 추출
```freelang
let text = "hello"
let sub = text.slice(1, 4)  // "ell"
```

#### char_at(index: i32) -> Option(str)
특정 위치의 문자 반환
```freelang
let text = "hello"
match text.char_at(1) {
  case Some(ch) -> println(ch),  // "e"
  case None -> println("Index out of range")
}
```

#### index_of(substr: str) -> Option(i32)
부분 문자열의 위치 반환
```freelang
let text = "hello world"
match text.index_of("world") {
  case Some(pos) -> println(str(pos)),  // 6
  case None -> println("Not found")
}
```

#### pad_left(width: i32, char: str) -> str
왼쪽 패딩
```freelang
let text = "42"
let padded = text.pad_left(5, "0")  // "00042"
```

#### pad_right(width: i32, char: str) -> str
오른쪽 패딩
```freelang
let text = "test"
let padded = text.pad_right(8, "*")  // "test****"
```

---

### 2️⃣ 배열/컬렉션 (Array) - 7개 함수

#### length() -> i32
배열의 길이
```freelang
let arr = [1, 2, 3]
let len = arr.length()  // 3
```

#### push(value: T) -> void
배열에 요소 추가
```freelang
let arr = [1, 2]
arr.push(3)  // [1, 2, 3]
```

#### pop() -> Option(T)
마지막 요소 제거 및 반환
```freelang
let arr = [1, 2, 3]
match arr.pop() {
  case Some(val) -> println(str(val)),  // 3
  case None -> println("Empty array")
}
```

#### first() -> Option(T)
첫 번째 요소
```freelang
let arr = [10, 20, 30]
match arr.first() {
  case Some(val) -> println(str(val)),  // 10
  case None -> println("Empty array")
}
```

#### last() -> Option(T)
마지막 요소
```freelang
let arr = [10, 20, 30]
match arr.last() {
  case Some(val) -> println(str(val)),  // 30
  case None -> println("Empty array")
}
```

#### reverse() -> [T]
배열 역순
```freelang
let arr = [1, 2, 3]
let reversed = arr.reverse()  // [3, 2, 1]
```

#### fold(init: U, fn: fn(U, T) -> U) -> U
배열 축약
```freelang
let arr = [1, 2, 3, 4, 5]
let sum = arr.fold(0, fn(acc, x) -> acc + x)  // 15
```

---

### 3️⃣ 수학 (Math) - 7개 함수

#### floor(x: f64) -> i32
내림
```freelang
let result = floor(3.7)  // 3
```

#### ceil(x: f64) -> i32
올림
```freelang
let result = ceil(3.2)  // 4
```

#### round(x: f64) -> i32
반올림
```freelang
let result = round(3.5)  // 4
```

#### abs(x: i32) -> i32
절댓값
```freelang
let result = abs(-42)  // 42
```

#### sqrt(x: f64) -> f64
제곱근
```freelang
let result = sqrt(16.0)  // 4.0
```

#### pow(base: f64, exp: f64) -> f64
거듭제곱
```freelang
let result = pow(2.0, 3.0)  // 8.0
```

#### random() -> f64
0~1 난수
```freelang
let rand = random()  // 0.123456...
```

---

### 4️⃣ 파일 I/O (File) - 4개 함수

#### read_file(path: str) -> Result(str, str)
파일 읽기
```freelang
match read_file("data.txt") {
  case Ok(content) -> println(content),
  case Err(e) -> println("Error: " + e)
}
```

#### write_file(path: str, content: str) -> Result(void, str)
파일 쓰기
```freelang
match write_file("output.txt", "Hello") {
  case Ok(_) -> println("Written"),
  case Err(e) -> println("Error: " + e)
}
```

#### append_file(path: str, content: str) -> Result(void, str)
파일에 추가
```freelang
match append_file("log.txt", "New log\n") {
  case Ok(_) -> println("Appended"),
  case Err(e) -> println("Error: " + e)
}
```

#### exists(path: str) -> bool
파일 존재 확인
```freelang
let exists = exists("data.txt")
if exists {
  println("File exists")
}
```

---

### 5️⃣ 정규식 (Regex) - 3개 함수

#### regex_match(text: str, pattern: str) -> Option(str)
정규식 매칭
```freelang
match regex_match("test123", "\\d+") {
  case Some(match_str) -> println(match_str),  // "123"
  case None -> println("No match")
}
```

#### regex_find_all(text: str, pattern: str) -> [str]
모든 매칭 찾기
```freelang
let matches = regex_find_all("a1b2c3", "\\d")
// ["1", "2", "3"]
```

#### regex_replace(text: str, pattern: str, replacement: str) -> str
정규식 치환
```freelang
let result = regex_replace("hello123world", "\\d", "X")
// "helloXXXworld"
```

---

### 6️⃣ CSV - 2개 함수

#### csv_parse(content: str) -> Result([str], str)
CSV 파싱
```freelang
let csv = "name,age\nAlice,30\nBob,25"
match csv_parse(csv) {
  case Ok(data) -> println(str(data.length())),  // 3
  case Err(e) -> println("Error: " + e)
}
```

#### csv_stringify(data: [[str]]) -> str
CSV 생성
```freelang
let data = [["name", "age"], ["Alice", "30"]]
let csv = csv_stringify(data)
// "name,age\nAlice,30"
```

---

### 7️⃣ 날짜/시간 (DateTime) - 3개 함수

#### now() -> i64
현재 타임스탬프
```freelang
let timestamp = now()
println(str(timestamp))
```

#### format_date(timestamp: i64, format: str) -> str
날짜 포맷팅
```freelang
let formatted = format_date(now(), "YYYY-MM-DD HH:mm:ss")
println(formatted)
```

#### parse_date(date_str: str, format: str) -> Result(i64, str)
날짜 파싱
```freelang
match parse_date("2026-04-05", "YYYY-MM-DD") {
  case Ok(timestamp) -> println(str(timestamp)),
  case Err(e) -> println("Error: " + e)
}
```

---

### 8️⃣ YAML - 2개 함수

#### yaml_parse(content: str) -> Result(map, str)
YAML 파싱
```freelang
let yaml = "name: Alice\nage: 30"
match yaml_parse(yaml) {
  case Ok(data) -> println(data),
  case Err(e) -> println("Error: " + e)
}
```

#### yaml_stringify(data: map) -> str
YAML 생성
```freelang
let data = {"name": "Alice", "age": 30}
let yaml = yaml_stringify(data)
```

---

### 9️⃣ 데이터베이스 (Database) - 5개 함수

#### db_open(path: str) -> Result(Database, str)
데이터베이스 열기
```freelang
match db_open("app.db") {
  case Ok(db) -> println("Connected"),
  case Err(e) -> println("Error: " + e)
}
```

#### db_query(db: Database, sql: str) -> Result([map], str)
쿼리 실행
```freelang
match db_query(db, "SELECT * FROM users") {
  case Ok(rows) -> println(str(rows.length())),
  case Err(e) -> println("Error: " + e)
}
```

#### db_execute(db: Database, sql: str) -> Result(i32, str)
INSERT/UPDATE/DELETE 실행
```freelang
match db_execute(db, "INSERT INTO users (name) VALUES (?)") {
  case Ok(count) -> println(str(count) + " rows affected"),
  case Err(e) -> println("Error: " + e)
}
```

#### db_close(db: Database) -> void
데이터베이스 닫기
```freelang
db_close(db)
```

#### db_transaction(db: Database, fn: fn(Database) -> Result) -> Result
트랜잭션
```freelang
match db_transaction(db, fn(db) -> {
  db_execute(db, "INSERT ...")
}) {
  case Ok(_) -> println("Transaction committed"),
  case Err(e) -> println("Transaction rolled back")
}
```

---

## 🔧 유틸리티 함수

#### str(value: T) -> str
모든 값을 문자열로 변환
```freelang
str(42)          // "42"
str(3.14)        // "3.14"
str(true)        // "true"
```

#### parse_int(text: str) -> Result(i32, str)
정수 파싱
```freelang
match parse_int("42") {
  case Ok(num) -> println(str(num)),
  case Err(e) -> println("Error: " + e)
}
```

#### range(start: i32, end: i32) -> [i32]
범위 생성
```freelang
let nums = range(1, 5)  // [1, 2, 3, 4]
```

#### println(text: str) -> void
출력
```freelang
println("Hello, World!")
```

---

## 📊 함수 분포

```
문자열:     8개 (19%)
배열:       7개 (17%)
수학:       7개 (17%)
파일:       4개 (10%)
정규식:     3개 (7%)
CSV:        2개 (5%)
날짜:       3개 (7%)
YAML:       2개 (5%)
데이터베이스: 5개 (12%)
───────────────────
합계:      42개
```

---

## 💡 사용 팁

### 1. 에러 처리 필수
```freelang
// ✅ 좋은 방법
match parse_int(user_input) {
  case Ok(num) -> use_number(num),
  case Err(e) -> handle_error(e)
}

// ❌ 나쁜 방법 (에러 무시)
let num = parse_int(user_input)
```

### 2. Option 확인
```freelang
// ✅ 좋은 방법
match arr.first() {
  case Some(val) -> process(val),
  case None -> println("Empty")
}

// ❌ 위험한 방법
let val = arr[0]  // 인덱스 범위 체크 필요
```

### 3. 리소스 관리
```freelang
// ✅ 좋은 방법
match db_open("app.db") {
  case Ok(db) -> {
    db_query(db, "...")
    db_close(db)
  },
  case Err(e) -> println("Error")
}
```

---

**Last Updated: 2026-04-05**
