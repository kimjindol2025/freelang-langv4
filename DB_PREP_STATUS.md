# FreeLang v4.2 데이터베이스 준비 현황

**상태**: 🟡 API 설계 완료, 구현 대기

---

## 완료된 것

### 1. 데이터베이스 계획 문서
- ✓ V4_DATABASE_PLAN.md 작성 (3 phases)
- ✓ 아키텍처 설계
- ✓ API 스펙 정의

### 2. 인터페이스 구현
- ✓ src/db.ts (인터페이스 레벨)
  - `SQLiteDB` 클래스
  - `QueryBuilder` 클래스
  - `MigrationManager` 클래스

### 3. 예제 작성
- ✓ examples/db_basic.fl (주석 처리)

### 4. 타입 정의
```typescript
interface Row { [key: string]: any }
interface QueryResult { rows: Row[]; changes: number }
```

---

## 아직 할 것

### Phase 1: SQLite (2주)
- [ ] better-sqlite3 또는 sql.js 설치
  - Termux: 네이티브 모듈 미지원 (현재 환경)
  - 해결: 순수 JS 구현 (sql.js) 사용
- [ ] VM에 빌트인 함수 추가
  - `sqlite_open(path: str) -> db`
  - `db.query(sql: str, params: []) -> [Row]`
  - `db.execute(sql: str, params: []) -> {changes: i32}`
- [ ] 테스트 작성 (db-jest.test.ts)
- [ ] 예제 완성 (db_basic.fl, db_query_builder.fl)

### Phase 2: 확장 (2주)
- [ ] PostgreSQL 지원
- [ ] MySQL 지원
- [ ] 커넥션 풀
- [ ] 트랜잭션 개선

### Phase 3: ORM 스타일 (2주)
- [ ] ORM 헬퍼
- [ ] 쿼리 빌더 개선
- [ ] 마이그레이션 CLI

---

## 기술 결정

### SQLite 구현 방식
| 방식 | 장점 | 단점 | 추천 |
|---|---|---|---|
| better-sqlite3 | 빠름, 안정적 | 네이티브 (Termux 불가) | ❌ |
| sqlite3 npm | 표준 | 네이티브 (Termux 불가) | ❌ |
| sql.js | 순수 JS, Termux 가능 | 느림 | ✅ |
| libSQL-js | TypeScript 최적화 | 신규 라이브러리 | 👀 |

**결정**: sql.js 사용 (Termux 호환성)

```bash
npm install sql.js
```

---

## API 스펙 (완성도)

### 현재
```typescript
class SQLiteDB {
  async query(sql, params): Promise<Row[]>      // ✓ 설계됨
  async execute(sql, params): Promise<{changes}> // ✓ 설계됨
  async transaction(callback): Promise<T>        // ✓ 설계됨
  async createTable(name, columns): void         // ✓ 설계됨
  async dropTable(name): void                    // ✓ 설계됨
}
```

### FreeLang 언어 문법 (예상)
```freelang
var db = sqlite_open("data.db")

// SELECT
var result = db.query("SELECT * FROM users WHERE id = ?", [1])

// INSERT/UPDATE/DELETE
var info = db.execute("INSERT INTO users (name) VALUES (?)", ["Alice"])
println(str(info.changes))  // 1

// 트랜잭션
db.transaction(fn() {
  db.execute("INSERT INTO users (name) VALUES (?)", ["Bob"])
})

// 종료
db.close()
```

---

## 다음 단계 (우선순위)

1. **sql.js 설치** (Termux 호환)
2. **db.ts 구현 완성** (sql.js 사용)
3. **VM 빌트인 함수 등록**
4. **테스트 작성**
5. **예제 완성**
6. **v4.2 릴리스**

---

## 예상 일정

```
v4.1 완료:      2026-03-31 ✓
v4.2 준비:      2026-04-07 (이번 주)
v4.2 완성:      2026-04-21
v4.3 계획:      2026-05-01
```

---

## 참고: Termux에서 네이티브 모듈 설치 실패 원인

```
npm error gyp: Undefined variable android_ndk_path in binding.gyp
```

**원인**: Termux는 Android 환경에서 제한된 빌드 도구
- C/C++ 컴파일러 없음
- NDK 미설치

**해결책**:
1. ✓ sql.js (순수 JS)
2. ✓ SQLite WASM (웹 표준)
3. ✓ 클라우드 DB (PostgreSQL@cloud, MySQL@cloud)

**선택**: sql.js (가장 간단)
