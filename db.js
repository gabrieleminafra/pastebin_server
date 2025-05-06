import sqlite3 from "sqlite3";
import fs from "fs";

export class Database {
  constructor(target) {
    this.db = null;
    this.target = target;
  }

  init() {
    const dbFolder = "./mount/db/";
    const dbTarget = dbFolder + this.target;
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder, { recursive: true });
    }
    this.db = new sqlite3.Database(dbTarget, (err) => {
      if (err) {
        console.error(
          "Errore nell'apertura del database in: " +
            dbTarget +
            " " +
            err.message
        );
      } else {
        console.log("Database connected successfully. File is " + dbTarget);
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
