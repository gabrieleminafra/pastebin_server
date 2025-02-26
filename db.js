import sqlite3 from "sqlite3";

export class ClipboardDB {
  constructor(target) {
    this.db = null;
    this.target = target;
  }

  init() {
    this.db = new sqlite3.Database("./" + this.target, (err) => {
      if (err) {
        console.error("Errore nell'apertura del database:" + err.message);
      } else {
        console.log("Database connected successfully. File is " + this.target);
      }
    });

    try {
      this.db.run(
        "CREATE TABLE IF NOT EXISTS clipboard (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, created_at TEXT, archived BOOLEAN NOT NULL DEFAULT 0);"
      );
    } catch (error) {
      console.log(error);
    }

    try {
      this.db.run(
        "CREATE TABLE IF NOT EXISTS archive (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, path TEXT, created_at TEXT);"
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
