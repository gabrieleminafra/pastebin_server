import sqlite3 from "sqlite3";

export class ClipboardDB {
  constructor(parameters) {
    this.db = null;
  }

  init() {
    this.db = new sqlite3.Database("./clipboard.db", (err) => {
      if (err) {
        console.error("Errore nell'apertura del database:" + err.message);
      } else {
        console.log("Database connected successfully.");
      }
    });

    try {
      this.db.run(
        "CREATE TABLE IF NOT EXISTS clipboard (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, created_at TEXT, client_id TEXT, stale BOOLEAN NOT NULL DEFAULT 0);"
      );
    } catch (error) {
      console.log(error);
    }
  }

  getOne(query, params) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  getAll(query, params) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  run(query, params) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}
