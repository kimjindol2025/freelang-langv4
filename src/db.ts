// FreeLang v4.2 — 데이터베이스 지원
// SQLite, PostgreSQL, MySQL 인터페이스

import Database from "better-sqlite3";
import * as fs from "fs";

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
 * SQLite 데이터베이스 구현
 */
export class SQLiteDB {
  private db: Database.Database;
  private inTransaction: boolean = false;

  constructor(filename: string) {
    this.db = new Database(filename);
    // 외래 키 제약 활성화
    this.db.pragma("foreign_keys = ON");
  }

  /**
   * SELECT 쿼리 실행
   */
  async query(sql: string, params: any[] = []): Promise<Row[]> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.all(...params) as Row[];
      return result;
    } catch (e: any) {
      throw new Error(`Query error: ${e.message}`);
    }
  }

  /**
   * 단일 행 조회
   */
  async queryOne(sql: string, params: any[] = []): Promise<Row | null> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as Row | undefined;
      return result || null;
    } catch (e: any) {
      throw new Error(`Query error: ${e.message}`);
    }
  }

  /**
   * INSERT/UPDATE/DELETE 실행
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    try {
      const stmt = this.db.prepare(sql);
      const info = stmt.run(...params);
      return { changes: info.changes };
    } catch (e: any) {
      throw new Error(`Execute error: ${e.message}`);
    }
  }

  /**
   * 트랜잭션 실행
   */
  async transaction<T>(
    callback: () => Promise<T> | T,
    options: TransactionOptions = {}
  ): Promise<T> {
    const isolation = options.isolation || "deferred";
    const startSql = `BEGIN ${isolation}`;

    try {
      this.db.exec(startSql);
      this.inTransaction = true;

      const result = await callback();

      this.db.exec("COMMIT");
      this.inTransaction = false;

      return result;
    } catch (e: any) {
      this.db.exec("ROLLBACK");
      this.inTransaction = false;
      throw new Error(`Transaction error: ${e.message}`);
    }
  }

  /**
   * 테이블 생성 (간단한 DDL)
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
      this.db.exec(sql);
    } catch (e: any) {
      throw new Error(`Create table error: ${e.message}`);
    }
  }

  /**
   * 테이블 삭제
   */
  async dropTable(tableName: string): Promise<void> {
    try {
      this.db.exec(`DROP TABLE IF EXISTS ${tableName}`);
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
   * 데이터베이스 백업
   */
  async backup(backupPath: string): Promise<void> {
    try {
      const backupDb = new Database(backupPath);
      this.db.backup(backupDb);
      backupDb.close();
    } catch (e: any) {
      throw new Error(`Backup error: ${e.message}`);
    }
  }

  /**
   * 데이터베이스 연결 종료
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  /**
   * 데이터베이스 정보
   */
  getInfo(): {
    readonly: boolean;
    memory: boolean;
    filename: string;
  } {
    return {
      readonly: this.db.readonly,
      memory: this.db.memory,
      filename: this.db.name,
    };
  }
}

/**
 * 쿼리 빌더 (선택사항)
 */
export class QueryBuilder {
  private table: string = "";
  private whereConditions: string[] = [];
  private orderByClause: string = "";
  private limitValue: number = 0;
  private offsetValue: number = 0;
  private selectColumns: string[] = ["*"];
  private joinClauses: string[] = [];

  constructor(table: string) {
    this.table = table;
  }

  select(...columns: string[]): QueryBuilder {
    this.selectColumns = columns;
    return this;
  }

  where(condition: string): QueryBuilder {
    this.whereConditions.push(condition);
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

  build(): string {
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

    return sql;
  }

  async execute(db: SQLiteDB): Promise<Row[]> {
    return await db.query(this.build());
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
    this.init();
  }

  private async init(): Promise<void> {
    // 마이그레이션 메타테이블 생성
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * 모든 마이그레이션 실행
   */
  async up(): Promise<void> {
    if (!fs.existsSync(this.migrationsDir)) {
      console.log("마이그레이션 디렉토리가 없습니다");
      return;
    }

    const files = fs.readdirSync(this.migrationsDir).sort();

    for (const file of files) {
      if (!file.endsWith(".sql")) continue;

      const applied = await this.db.queryOne(
        "SELECT * FROM _migrations WHERE name = ?",
        [file]
      );

      if (applied) {
        console.log(`✓ 스킵: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(
        `${this.migrationsDir}/${file}`,
        "utf-8"
      );

      try {
        await this.db.execute(sql);
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
    return await this.db.query("SELECT * FROM _migrations ORDER BY applied_at");
  }
}
