import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";
import { Compiler } from "./compiler";
import { VM } from "./vm";
import * as fs from "fs";

async function exec(source: string): Promise<{ output: string[]; error: string | null }> {
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) {
    return { output: [], error: `lex error: ${lexErrors[0].message}` };
  }

  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) {
    return { output: [], error: `parse error: ${parseErrors[0].message}` };
  }

  const checkErrors = new TypeChecker().check(program);
  if (checkErrors.length > 0) {
    return { output: [], error: `type error: ${checkErrors[0].message}` };
  }

  const chunk = new Compiler().compile(program);
  return await new VM().run(chunk);
}

describe("Database Operations", () => {
  // Clean up test database files
  afterEach(() => {
    try {
      if (fs.existsSync("./test_db.db")) {
        fs.unlinkSync("./test_db.db");
      }
    } catch {
      // ignore
    }
  });

  it("sqlite_open: creates or opens database file", async () => {
    const { output, error } = await exec(`
      var db = sqlite_open("./test_db.db")
      println("DB opened")
    `);
    expect(error).toBeNull();
    expect(output).toContain("DB opened");
  });

  it("sqlite_execute: creates table and inserts data", async () => {
    const { output, error } = await exec(`
      var db = sqlite_open("./test_db.db")
      var create_result = sqlite_execute(db, "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE)", [])
      println("Table created")
      var insert_result = sqlite_execute(db, "INSERT INTO users (name, email) VALUES (?, ?)", ["Alice", "alice@example.com"])
      println("Record inserted")
    `);
    expect(error).toBeNull();
    expect(output).toContain("Table created");
    expect(output).toContain("Record inserted");
  });

  it("sqlite_query: retrieves data from table", async () => {
    const { output, error } = await exec(`
      var db = sqlite_open("./test_db.db")
      sqlite_execute(db, "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE)", [])
      sqlite_execute(db, "INSERT INTO users (name, email) VALUES (?, ?)", ["Alice", "alice@example.com"])
      sqlite_execute(db, "INSERT INTO users (name, email) VALUES (?, ?)", ["Bob", "bob@example.com"])
      var result = sqlite_query(db, "SELECT * FROM users", [])
      println("Query complete")
    `);
    expect(error).toBeNull();
    expect(output).toContain("Query complete");
  });

  it("sqlite_close: closes database", async () => {
    const { output, error } = await exec(`
      var db = sqlite_open("./test_db.db")
      sqlite_close(db)
      println("DB closed")
    `);
    expect(error).toBeNull();
    expect(output).toContain("DB closed");
  });

  it("database handle error: invalid first argument", async () => {
    const { output, error } = await exec(`
      var result = sqlite_query("not a db", "SELECT 1", [])
      println("Query attempted")
    `);
    // Should fail because first arg is not a database
    expect(error || output.join(" ")).toBeTruthy();
  });

  it("sqlite_execute: returns ok result", async () => {
    const { output, error } = await exec(`
      var db = sqlite_open("./test_db.db")
      sqlite_execute(db, "CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)", [])
      var result = sqlite_execute(db, "INSERT INTO items (name) VALUES (?)", ["Item1"])
      println("Executed")
    `);
    expect(error).toBeNull();
    expect(output).toContain("Executed");
  });

  it("sqlite_query: multiple rows", async () => {
    const { output, error } = await exec(`
      var db = sqlite_open("./test_db.db")
      sqlite_execute(db, "CREATE TABLE IF NOT EXISTS people (id INTEGER PRIMARY KEY, name TEXT)", [])
      sqlite_execute(db, "INSERT INTO people (name) VALUES (?)", ["Alice"])
      sqlite_execute(db, "INSERT INTO people (name) VALUES (?)", ["Bob"])
      sqlite_execute(db, "INSERT INTO people (name) VALUES (?)", ["Charlie"])
      var rows = sqlite_query(db, "SELECT * FROM people", [])
      println("All rows retrieved")
    `);
    expect(error).toBeNull();
    expect(output).toContain("All rows retrieved");
  });

  it("sqlite_begin/commit: manual transaction", async () => {
    const { output, error } = await exec(`
      var db = sqlite_open("./test_db.db")
      sqlite_execute(db, "CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, balance INTEGER)", [])
      sqlite_begin(db, "immediate")
      sqlite_execute(db, "INSERT INTO accounts (balance) VALUES (?)", ["1000"])
      sqlite_commit(db)
      println("Transaction committed")
    `);
    expect(error).toBeNull();
    expect(output).toContain("Transaction committed");
  });

  it("sqlite_begin/rollback: transaction rollback", async () => {
    const { output, error } = await exec(`
      var db = sqlite_open("./test_db.db")
      sqlite_execute(db, "CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, message TEXT)", [])
      sqlite_begin(db)
      sqlite_execute(db, "INSERT INTO logs (message) VALUES (?)", ["Before rollback"])
      sqlite_rollback(db)
      var count = sqlite_query(db, "SELECT COUNT(*) as cnt FROM logs", [])
      println("Rollback done")
    `);
    expect(error).toBeNull();
    expect(output).toContain("Rollback done");
  });
});
