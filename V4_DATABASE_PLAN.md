# FreeLang v4 데이터베이스 지원 계획

## 목표
FreeLang에 **표준 데이터베이스 기능** 추가
- SQL 쿼리 실행
- SQLite (내장), PostgreSQL, MySQL 지원
- ORM 스타일 쿼리
- 트랜잭션 & 마이그레이션

**버전**: v4.2 (또는 v4.1.1 패치)
**출시 목표**: 2026년 4월 말

---

## 📋 Phase 1: 기본 DB 지원 (2주)

### 1.1 SQLite 지원 (가장 간단)

```freelang
// 데이터베이스 연결
var db = sqlite_open("data.db")

// SQL 쿼리 실행
var result = db.query("SELECT * FROM users WHERE id = ?", [1])

// INSERT/UPDATE/DELETE
db.execute("INSERT INTO users (name, email) VALUES (?, ?)",
           ["Alice", "alice@example.com"])

// 트랜잭션
db.transaction(fn() {
  db.execute("INSERT INTO accounts (user_id, balance) VALUES (?, ?)", [1, 1000])
})

// 연결 종료
db.close()
```

### 1.2 런타임 API

```typescript
// src/builtins/sqlite.ts
interface Database {
  query(sql: string, params?: any[]): Promise<Row[]>
  execute(sql: string, params?: any[]): Promise<{ changes: i32 }>
  transaction(callback: fn() -> ()): Promise<void>
  close(): void
}
```

### 1.3 테이블 & 쿼리 빌더

```freelang
// 간단한 쿼리 빌더 (선택사항)
struct Query {
  table: str,
  where_clause: str,
  limit_val: Option<i32>,
}

impl Query {
  fn from(table: str) -> Query {
    Query { table, where_clause: "", limit_val: None }
  }

  fn where(self: Query, condition: str) -> Query {
    self.where_clause = condition
    self
  }

  fn limit(self: Query, n: i32) -> Query {
    self.limit_val = Some(n)
    self
  }

  fn execute(self: Query, db: Database) -> [str] {
    // SQL 생성 & 실행
    db.query(self.to_sql(), [])
  }
}
```

---

## 📋 Phase 2: PostgreSQL/MySQL 지원 (2주)

### 2.1 커넥션 풀

```freelang
// PostgreSQL 연결
var pool = postgres_pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: env("DB_PASSWORD"),
  database: "myapp",
})

var conn = pool.acquire()
var result = conn.query("SELECT * FROM users")
pool.release(conn)
```

### 2.2 마이그레이션 지원

```
migrations/
├── 001_create_users.sql
├── 002_add_email_index.sql
└── 003_create_posts.sql
```

```freelang
// 마이그레이션 실행
freelang migrate up
freelang migrate down
freelang migrate reset
```

---

## 📋 Phase 3: ORM 스타일 인터페이스 (2주)

### 3.1 모델 정의

```freelang
struct User {
  id: i32,
  name: str,
  email: str,
  created_at: str,
}

// ORM 매핑
impl User {
  fn find_by_id(db: Database, id: i32) -> Option<User> {
    var row = db.query("SELECT * FROM users WHERE id = ?", [id])
    if length(row) == 0 {
      return None
    }
    // row → User 변환
    Some(User { ... })
  }

  fn all(db: Database) -> [User] {
    var rows = db.query("SELECT * FROM users", [])
    // rows → [User] 변환
    []
  }

  fn save(self: User, db: Database) -> Result<i32, str> {
    var result = db.execute(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [self.name, self.email]
    )
    Ok(result.changes)
  }
}
```

### 3.2 쿼리 빌더 개선

```freelang
var users = User.all(db)
  .where("created_at > ?", ["2024-01-01"])
  .order_by("name ASC")
  .limit(10)
  .execute()
```

---

## 🏗️ 구현 구조

```
src/
├── builtins/
│   ├── sqlite.ts         ← SQLite 런타임 API
│   ├── postgres.ts       ← PostgreSQL 런타임 API
│   └── mysql.ts          ← MySQL 런타임 API
├── stdlib/
│   ├── db/
│   │   ├── query.fl      ← 쿼리 빌더
│   │   ├── migration.fl  ← 마이그레이션
│   │   └── orm.fl        ← ORM 헬퍼
│   └── ...
└── ...

examples/
├── db_basic.fl           ← 기본 사용법
├── db_query_builder.fl   ← 쿼리 빌더
├── db_orm.fl             ← ORM 스타일
└── db_migration.fl       ← 마이그레이션

migrations/
├── 001_init.sql
└── 002_add_users.sql
```

---

## 📦 의존성 추가

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0",      // SQLite
    "pg": "^8.11.0",                  // PostgreSQL
    "mysql2": "^3.9.0"                // MySQL
  }
}
```

---

## 🧪 테스트

```typescript
// src/db-jest.test.ts
describe("Database Operations", () => {
  it("SQLite: INSERT and SELECT", () => {
    // ...
  })

  it("SQLite: Transaction rollback", () => {
    // ...
  })

  it("Query builder: WHERE + LIMIT", () => {
    // ...
  })

  it("PostgreSQL: Connection pool", () => {
    // ...
  })
})
```

---

## 📊 v4.2 체크리스트

### Phase 1 (1주)
- [ ] SQLite 런타임 API (`sqlite_open`, `query`, `execute`)
- [ ] 기본 테스트 (5개)
- [ ] 예제: `db_basic.fl`

### Phase 2 (1주)
- [ ] PostgreSQL 런타임 API
- [ ] MySQL 런타임 API
- [ ] 커넥션 풀 구현
- [ ] 예제: `db_postgres.fl`

### Phase 3 (1주)
- [ ] 쿼리 빌더 (`where`, `limit`, `order_by`)
- [ ] ORM 스타일 헬퍼
- [ ] 마이그레이션 CLI
- [ ] 예제: `db_orm.fl`

### 문서 (3일)
- [ ] 데이터베이스 가이드
- [ ] API 문서
- [ ] 예제 프로젝트

---

## 💡 설계 원칙

1. **간단함**: SQLite부터 시작 (복잡도 최소)
2. **비동기**: 모든 DB 작업은 async (이미 v4.1에서 완성)
3. **안전성**: PreparedStatement 기본 (SQL injection 방지)
4. **유연성**: 로우 SQL + 쿼리 빌더 모두 지원
5. **FreeLang스러움**: 패턴 매칭, Result<T,E> 사용

---

## 🎯 예상 결과

v4.2 완료 후:
```
✓ SQLite, PostgreSQL, MySQL 지원
✓ 안전한 파라미터화 쿼리
✓ 쿼리 빌더 & ORM
✓ 마이그레이션 시스템
✓ 풀/트랜잭션
✓ 5+ 예제
✓ 테스트 20+개
```

**FreeLang을 풀스택 웹/서버 언어로 만들 수 있음!**
