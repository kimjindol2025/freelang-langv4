// FreeLang v4.2 — 데이터베이스 지원 (sql.js 기반)
// SQLite, PostgreSQL, MySQL 인터페이스

import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import * as fs from "fs";
import * as path from "path";

/**
 * FreeLang Database API
 * 모든 데이터베이스 작업을 통일된 인터페이스로 제공
 */

export interface Row {
  [key: string]: any;
}

export interface QueryResult {
  rows: Row[];
  changes: number;
}

export interface TransactionOptions {
  isolation?: "deferred" | "immediate" | "exclusive";
}

/**
 * 모든 DB 드라이버가 구현해야 하는 공통 인터페이스
 */
export interface DBAdapter {
  query(sql: string, params?: any[]): Promise<Row[]>;
  execute(sql: string, params?: any[]): Promise<{ changes: number }>;
  begin(isolation?: string): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): Promise<void>;
  readonly driverName: string;
}

/**
 * SQLite 데이터베이스 구현 (sql.js 기반)
 */
export class SQLiteDB implements DBAdapter {
  private db: SqlJsDatabase | null = null;
  private filename: string;
  private inTransaction: boolean = false;
  private initialized: boolean = false;
  readonly driverName = "sqlite";

  constructor(filename: string) {
    this.filename = filename;
  }

  /**
   * 초기화 (비동기)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const SQL = await initSqlJs();

      // 파일에서 로드하거나 새 DB 생성
      if (fs.existsSync(this.filename)) {
        const buffer = fs.readFileSync(this.filename);
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
      }

      // 외래 키 제약 활성화
      this.db.run("PRAGMA foreign_keys = ON");

      this.initialized = true;
    } catch (e: any) {
      throw new Error(`Database initialization failed: ${e.message}`);
    }
  }

  /**
   * 디스크에 저장
   */
  save(): void {
    if (!this.db) return;

    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.filename, buffer);
  }

  /**
   * SELECT 쿼리 실행
   */
  async query(sql: string, params: any[] = []): Promise<Row[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);

      const result: Row[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject() as Row;
        result.push(row);
      }

      stmt.free();
      return result;
    } catch (e: any) {
      throw new Error(`Query error: ${e.message}`);
    }
  }

  /**
   * 단일 행 조회
   */
  async queryOne(sql: string, params: any[] = []): Promise<Row | null> {
    const result = await this.query(sql, params);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * INSERT/UPDATE/DELETE 실행
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    try {
      this.db.run(sql, params);
      // 트랜잭션 중에는 저장하지 않음
      if (!this.inTransaction) {
        this.save();
      }
      return { changes: this.db.getRowsModified() };
    } catch (e: any) {
      throw new Error(`Execute error: ${e.message}`);
    }
  }

  /**
   * 트랜잭션 실행
   */
  async transaction<T>(
    callback: () => Promise<T> | T
  ): Promise<T> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    try {
      this.db.run("BEGIN");
      this.inTransaction = true;

      const result = await callback();

      this.db.run("COMMIT");
      this.inTransaction = false;
      this.save();

      return result;
    } catch (e: any) {
      this.db.run("ROLLBACK");
      this.inTransaction = false;
      throw new Error(`Transaction error: ${e.message}`);
    }
  }

  /**
   * 트랜잭션 시작 (수동)
   */
  async begin(isolation: "deferred" | "immediate" | "exclusive" = "deferred"): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const cmd = `BEGIN ${isolation.toUpperCase()}`;
    this.db.run(cmd);
    this.inTransaction = true;
  }

  /**
   * 트랜잭션 커밋
   */
  async commit(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    if (!this.inTransaction) throw new Error("No active transaction");

    this.db.run("COMMIT");
    this.inTransaction = false;
    this.save();
  }

  /**
   * 트랜잭션 롤백
   */
  async rollback(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    if (!this.inTransaction) throw new Error("No active transaction");

    this.db.run("ROLLBACK");
    this.inTransaction = false;
  }

  /**
   * 테이블 생성
   */
  async createTable(
    tableName: string,
    columns: { [key: string]: string }
  ): Promise<void> {
    const columnDefs = Object.entries(columns)
      .map(([name, type]) => `${name} ${type}`)
      .join(", ");

    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;

    try {
      await this.execute(sql);
    } catch (e: any) {
      throw new Error(`Create table error: ${e.message}`);
    }
  }

  /**
   * 테이블 삭제
   */
  async dropTable(tableName: string): Promise<void> {
    try {
      await this.execute(`DROP TABLE IF EXISTS ${tableName}`);
    } catch (e: any) {
      throw new Error(`Drop table error: ${e.message}`);
    }
  }

  /**
   * 모든 테이블 목록
   */
  async listTables(): Promise<string[]> {
    const result = await this.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    return result.map((row) => row.name);
  }

  /**
   * 테이블 스키마 조회
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    const result = await this.query(`PRAGMA table_info(${tableName})`);
    return result;
  }

  /**
   * 데이터베이스 연결 종료
   */
  async close(): Promise<void> {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 데이터베이스 정보
   */
  getInfo(): {
    filename: string;
    initialized: boolean;
    inTransaction: boolean;
  } {
    return {
      filename: this.filename,
      initialized: this.initialized,
      inTransaction: this.inTransaction,
    };
  }
}

/**
 * 쿼리 빌더
 */
export class QueryBuilder {
  private table: string = "";
  private whereConditions: string[] = [];
  private orderByClause: string = "";
  private limitValue: number = 0;
  private offsetValue: number = 0;
  private selectColumns: string[] = ["*"];
  private joinClauses: string[] = [];
  private params: any[] = [];

  constructor(table: string) {
    this.table = table;
  }

  select(...columns: string[]): QueryBuilder {
    this.selectColumns = columns;
    return this;
  }

  where(condition: string, ...params: any[]): QueryBuilder {
    this.whereConditions.push(condition);
    this.params.push(...params);
    return this;
  }

  join(table: string, on: string): QueryBuilder {
    this.joinClauses.push(`JOIN ${table} ON ${on}`);
    return this;
  }

  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): QueryBuilder {
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(n: number): QueryBuilder {
    this.limitValue = n;
    return this;
  }

  offset(n: number): QueryBuilder {
    this.offsetValue = n;
    return this;
  }

  build(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectColumns.join(", ")} FROM ${this.table}`;

    if (this.joinClauses.length > 0) {
      sql += " " + this.joinClauses.join(" ");
    }

    if (this.whereConditions.length > 0) {
      sql += " WHERE " + this.whereConditions.join(" AND ");
    }

    if (this.orderByClause) {
      sql += " " + this.orderByClause;
    }

    if (this.limitValue > 0) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue > 0) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params: this.params };
  }

  async execute(db: SQLiteDB): Promise<Row[]> {
    const { sql, params } = this.build();
    return await db.query(sql, params);
  }
}

/**
 * 마이그레이션 관리자
 */
export class MigrationManager {
  private db: SQLiteDB;
  private migrationsDir: string;

  constructor(db: SQLiteDB, migrationsDir: string = "./migrations") {
    this.db = db;
    this.migrationsDir = migrationsDir;
  }

  private async init(): Promise<void> {
    // 마이그레이션 메타테이블 생성
    try {
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id INTEGER PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {
      // 이미 존재할 수 있음
    }
  }

  /**
   * 모든 마이그레이션 실행
   */
  async up(): Promise<void> {
    await this.init();

    if (!fs.existsSync(this.migrationsDir)) {
      console.log("마이그레이션 디렉토리가 없습니다");
      return;
    }

    const files = fs.readdirSync(this.migrationsDir).sort();

    for (const file of files) {
      if (!file.endsWith(".sql") || file.endsWith(".down.sql")) continue;

      const applied = await this.db.queryOne(
        "SELECT * FROM _migrations WHERE name = ?",
        [file]
      );

      if (applied) {
        console.log(`✓ 스킵: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(
        path.join(this.migrationsDir, file),
        "utf-8"
      );

      try {
        // 여러 SQL 명령 실행
        const statements = sql.split(";").filter((s) => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) {
            await this.db.execute(stmt);
          }
        }

        await this.db.execute(
          "INSERT INTO _migrations (name) VALUES (?)",
          [file]
        );
        console.log(`✓ 적용: ${file}`);
      } catch (e: any) {
        console.error(`✗ 실패: ${file} - ${e.message}`);
        throw e;
      }
    }
  }

  /**
   * 마이그레이션 이력 조회
   */
  async status(): Promise<Row[]> {
    await this.init();
    return await this.db.query(
      "SELECT * FROM _migrations ORDER BY applied_at"
    );
  }

  /**
   * 마이그레이션 롤백 (역순 실행)
   */
  async down(): Promise<void> {
    await this.init();

    if (!fs.existsSync(this.migrationsDir)) {
      console.log("마이그레이션 디렉토리가 없습니다");
      return;
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort()
      .reverse();

    for (const file of files) {
      const downFile = file.replace(".sql", ".down.sql");
      const downPath = path.join(this.migrationsDir, downFile);

      if (!fs.existsSync(downPath)) {
        console.log(`⊘ 건너뜀: ${file} (롤백 파일 없음)`);
        continue;
      }

      const applied = await this.db.queryOne(
        "SELECT * FROM _migrations WHERE name = ?",
        [file]
      );

      if (!applied) {
        console.log(`⊘ 건너뜀: ${file} (미적용)`);
        continue;
      }

      const sql = fs.readFileSync(downPath, "utf-8");

      try {
        const statements = sql.split(";").filter((s) => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) {
            await this.db.execute(stmt);
          }
        }

        await this.db.execute(
          "DELETE FROM _migrations WHERE name = ?",
          [file]
        );
        console.log(`✓ 롤백: ${file}`);
      } catch (e: any) {
        console.error(`✗ 실패: ${file} - ${e.message}`);
        throw e;
      }
    }
  }
}

/**
 * PostgreSQL 데이터베이스 구현 (pg 드라이버 기반)
 */
export class PostgreSQLDB implements DBAdapter {
  private client: any = null;
  private connected: boolean = false;
  readonly driverName = "postgresql";

  constructor(private config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {}

  /**
   * 연결 초기화
   */
  async connect(): Promise<void> {
    const { Client } = require("pg");
    this.client = new Client(this.config);
    await this.client.connect();
    this.connected = true;
  }

  /**
   * SQL 플레이스홀더 변환 (? → $1, $2, ...)
   */
  private convertPlaceholders(sql: string): string {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  /**
   * SELECT 쿼리 실행
   */
  async query(sql: string, params: any[] = []): Promise<Row[]> {
    if (!this.connected) throw new Error("Not connected to PostgreSQL");
    const pgSql = this.convertPlaceholders(sql);
    const result = await this.client.query(pgSql, params);
    return result.rows;
  }

  /**
   * INSERT/UPDATE/DELETE 실행
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    if (!this.connected) throw new Error("Not connected to PostgreSQL");
    const pgSql = this.convertPlaceholders(sql);
    const result = await this.client.query(pgSql, params);
    return { changes: result.rowCount ?? 0 };
  }

  /**
   * 트랜잭션 시작
   */
  async begin(isolation: string = "deferred"): Promise<void> {
    if (!this.connected) throw new Error("Not connected to PostgreSQL");
    const cmd = isolation === "deferred" ? "BEGIN" : `BEGIN ${isolation.toUpperCase()}`;
    await this.client.query(cmd);
  }

  /**
   * 트랜잭션 커밋
   */
  async commit(): Promise<void> {
    if (!this.connected) throw new Error("Not connected to PostgreSQL");
    await this.client.query("COMMIT");
  }

  /**
   * 트랜잭션 롤백
   */
  async rollback(): Promise<void> {
    if (!this.connected) throw new Error("Not connected to PostgreSQL");
    await this.client.query("ROLLBACK");
  }

  /**
   * 연결 종료
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      this.connected = false;
    }
  }
}

/**
 * MySQL 데이터베이스 구현 (mysql2/promise 드라이버 기반)
 */
export class MySQLDB implements DBAdapter {
  private conn: any = null;
  private connected: boolean = false;
  readonly driverName = "mysql";

  constructor(private config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {}

  /**
   * 연결 초기화
   */
  async connect(): Promise<void> {
    const mysql = require("mysql2/promise");
    this.conn = await mysql.createConnection(this.config);
    this.connected = true;
  }

  /**
   * SELECT 쿼리 실행
   */
  async query(sql: string, params: any[] = []): Promise<Row[]> {
    if (!this.connected) throw new Error("Not connected to MySQL");
    const [rows] = await this.conn.query(sql, params);
    return rows as Row[];
  }

  /**
   * INSERT/UPDATE/DELETE 실행
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    if (!this.connected) throw new Error("Not connected to MySQL");
    const [result] = await this.conn.execute(sql, params) as any;
    return { changes: result.affectedRows ?? 0 };
  }

  /**
   * 트랜잭션 시작
   */
  async begin(isolation: string = "deferred"): Promise<void> {
    if (!this.connected) throw new Error("Not connected to MySQL");
    await this.conn.beginTransaction();
  }

  /**
   * 트랜잭션 커밋
   */
  async commit(): Promise<void> {
    if (!this.connected) throw new Error("Not connected to MySQL");
    await this.conn.commit();
  }

  /**
   * 트랜잭션 롤백
   */
  async rollback(): Promise<void> {
    if (!this.connected) throw new Error("Not connected to MySQL");
    await this.conn.rollback();
  }

  /**
   * 연결 종료
   */
  async close(): Promise<void> {
    if (this.conn) {
      await this.conn.end();
      this.conn = null;
      this.connected = false;
    }
  }
}
