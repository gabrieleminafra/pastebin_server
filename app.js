import upload from "./middleware.js";
import cors from "cors";
import express from "express";
import path from "path";

import { Server } from "socket.io";
import { createServer } from "node:http";
import { Database } from "./db.js";
import { config } from "dotenv";
import { rmSync } from "fs";

const app = express();
app.use(express.json());
app.use(cors());

const server = createServer(app);

config();

server.listen(process.env.PORT ?? 5000, () => {
  console.log(`Server is listening on port ${process.env.PORT}`);
});

const io = new Server(server, {
  path: "/ws",
  transports: ["websocket"],
});

const db = new Database(process.env.DB);

let isSavingToDB = false;
let packetsQueue = [];

db.init();

io.on("connection", (socket) => {
  console.log("SESSION - New session started: " + socket.id);

  socket.on("disconnect", () => {
    console.log("SESSION - Session disconnected by client: " + socket.id);
  });

  socket.on("edit_paste", async (payload) => {
    isSavingToDB = true;

    try {
      const query = `UPDATE clipboard SET ${payload.target} = ? WHERE id = ? RETURNING *`;

      const updatedData = await db.getOne(query, [payload.value, payload.id]);

      io.except(payload.client_id).emit("update_paste", {
        ...payload,
        value: updatedData[payload.target],
      });

      if (packetsQueue.length > 0) {
        for (const packet of packetsQueue) {
          try {
            console.log("Emitting queued packet...");

            io.except(packet.c).emit("incremental_update_paste", {
              ...packet,
              c: undefined,
            });
          } catch (error) {
            console.error(error);
          }
        }

        packetsQueue = [];
      }
    } catch (error) {
      console.error(error);
    }

    isSavingToDB = false;
  });

  socket.on("write_paste", async (payload) => {
    if (isSavingToDB) {
      packetsQueue.push(payload);
      return;
    }

    try {
      io.except(payload.c).emit("incremental_write_paste", {
        ...payload,
        c: undefined,
      });
    } catch (error) {
      console.error(error);
    }
  });
});

app.post("/api/clipboard", async (req, res) => {
  const { title, content, client_id } = req.body;

  try {
    const payload = await db.getOne(
      "INSERT INTO clipboard (title, content, created_at) VALUES (?, ?, ?) RETURNING *",
      [
        title || "Appunti del " + new Date().toLocaleDateString("it-IT"),
        content,
        new Date().toISOString(),
      ]
    );

    io.except(client_id).emit("new_paste", payload);

    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
  }
});

app.delete("/api/clipboard", async (req, res) => {
  const { id, client_id } = req.query;

  try {
    const updatedRecord = await db.getOne(
      "UPDATE clipboard SET archived = 1 WHERE id = ? RETURNING *",
      [id]
    );

    if (!updatedRecord) return res.status(404).json("Paste ID not found");

    io.except(client_id).emit("delete_paste", updatedRecord.id);

    return res.status(200).json(updatedRecord.id);
  } catch (error) {
    console.error(error);
  }
});

app.get("/api/clipboard/all", async (req, res) => {
  try {
    const payload = await db.getAll(
      "SELECT * FROM clipboard WHERE archived = 0"
    );

    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
  }
});

app.post("/api/archive", upload.single("file"), async (req, res) => {
  const file = req.file;
  const { client_id } = req.query;

  try {
    const payload = await db.getOne(
      "INSERT INTO archive (title, path, created_at) VALUES (?, ?, ?) RETURNING *",
      [
        file.originalname ||
          "Archivio del " + new Date().toLocaleDateString("it-IT"),
        file.path,
        new Date().toISOString(),
      ]
    );

    io.except(client_id).emit("new_archive", payload);

    return res.status(200).json(payload);
  } catch (error) {
    unlinkSync(file.path);
    console.error(error);
  }
});

app.get("/api/archive/all", async (req, res) => {
  try {
    const payload = await db.getAll("SELECT * FROM archive");

    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
  }
});

app.get("/api/archive/download", async (req, res) => {
  const id = req.query.id;

  const payload = await db.getOne("SELECT * FROM archive WHERE id = ?", [id]);

  if (!payload) return res.status(404).json("Record not found");

  try {
    const absolutePath = path.resolve(payload.path);
    res.download(absolutePath, (err) => {
      if (err) {
        return res.status(500).json(err);
      }
    });
  } catch (error) {
    console.error(error);
  }
});

app.delete("/api/archive", async (req, res) => {
  const { id, client_id } = req.query;

  try {
    const updatedRecord = await db.getOne(
      "DELETE FROM archive WHERE id = ? RETURNING *",
      [id]
    );

    if (!updatedRecord) return res.status(404).json("Archive ID not found");

    try {
      rmSync(updatedRecord.path);
    } catch (error) {
      console.error(error);
    }

    io.except(client_id).emit("delete_archive", updatedRecord.id);

    return res.status(200).json(updatedRecord.id);
  } catch (error) {
    console.error(error);
  }
});
