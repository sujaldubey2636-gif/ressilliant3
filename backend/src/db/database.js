// ============================================================
// DigiQuest Studio — SQLite Database Connection (sql.js)
// ============================================================
// Uses sql.js (pure JavaScript SQLite — no native compilation).
// Provides a wrapper with .prepare().run/.get/.all interface
// compatible with the rest of the codebase.
// ============================================================
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'digiquest.db');

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let database = null;

/**
 * Wrapper class that provides a better-sqlite3-compatible API
 * on top of sql.js so that route files work without changes.
 */
class DatabaseWrapper {
  constructor(sqlJsDb) {
    this._db = sqlJsDb;
  }

  /** Save the in-memory database to disk */
  _save() {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }

  /** Execute raw SQL (no results) */
  exec(sql) {
    this._db.run(sql);
    this._save();
  }

  /**
   * Prepare a statement and return an object with .run(), .get(), .all()
   * These accept positional parameters like better-sqlite3.
   */
  prepare(sql) {
    const db = this._db;
    const self = this;

    return {
      /**
       * Execute an INSERT/UPDATE/DELETE.
       * Returns { changes, lastInsertRowid }.
       */
      run(...params) {
        // Use prepare/bind/step for reliable param binding in sql.js
        let stmt;
        try {
          stmt = db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          stmt.step();
        } finally {
          if (stmt) stmt.free();
        }
        // Retrieve changes and lastInsertRowid BEFORE _save()
        // because db.export() in _save() resets SQLite internal counters
        let changes = 0, lastInsertRowid = 0;
        let s1 = db.prepare('SELECT changes()');
        if (s1.step()) changes = s1.get()[0];
        s1.free();
        let s2 = db.prepare('SELECT last_insert_rowid()');
        if (s2.step()) lastInsertRowid = s2.get()[0];
        s2.free();
        self._save();
        return { changes, lastInsertRowid };
      },

      /**
       * Execute a SELECT and return the first row as an object, or undefined.
       */
      get(...params) {
        let stmt;
        try {
          stmt = db.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            for (let i = 0; i < columns.length; i++) {
              row[columns[i]] = values[i];
            }
            return row;
          }
          return undefined;
        } finally {
          if (stmt) stmt.free();
        }
      },

      /**
       * Execute a SELECT and return all rows as an array of objects.
       */
      all(...params) {
        let stmt;
        try {
          stmt = db.prepare(sql);
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            for (let i = 0; i < columns.length; i++) {
              row[columns[i]] = values[i];
            }
            rows.push(row);
          }
          return rows;
        } finally {
          if (stmt) stmt.free();
        }
      }
    };
  }

  /** Execute a PRAGMA statement */
  pragma(pragmaStr) {
    this._db.run(`PRAGMA ${pragmaStr}`);
  }
}

/**
 * Initialize the database synchronously.
 * sql.js init is async, so we use a top-level await pattern.
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  let db;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Loaded existing database from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new database');
  }

  const wrapper = new DatabaseWrapper(db);

  // Enable foreign keys
  wrapper.pragma('foreign_keys = ON');

  // Run schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  wrapper._db.run(schema);
  wrapper._save();

  console.log('✅ Database initialized at', DB_PATH);
  return wrapper;
}

// We need synchronous access from route files, so we initialise eagerly
// and store the promise. Route files will await getDb().
let dbPromise = initDatabase();
let dbInstance = null;

// Resolve synchronously if possible
dbPromise.then(db => {
  dbInstance = db;
  database = db;
});

/**
 * Get the database instance. 
 * If called before init completes, awaits the promise.
 */
async function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = await dbPromise;
  return dbInstance;
}

/**
 * Get the database instance synchronously.
 * Throws if database is not yet initialized.
 */
function getDbSync() {
  if (!dbInstance) {
    throw new Error('Database not yet initialized. Wait for server ready event.');
  }
  return dbInstance;
}

module.exports = { getDb, getDbSync };
