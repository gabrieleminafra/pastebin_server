import upload from "./middleware.js";
import cors from "cors";
import express from "express";
import path from "path";

import { Server } from "socket.io";
import { createServer } from "node:http";
import { ClipboardDB } from "./db.js";
import { config } from "dotenv";

const app = express();
app.use(express.json());
app.use(cors());

const server = createServer(app);

config();

server.listen(process.env.PORT ?? 5000, () => {
  console.log(`Server is listening on port ${process.env.PORT}`);
});

const io = new Server(server, {
  transports: ["websocket"],
});

const db = new ClipboardDB(process.env.DB);

db.init();

io.on("connection", (socket) => {
  console.log("SESSION - New session started: " + socket.id);

  socket.on("disconnect", () => {
    console.log("SESSION - Session disconnected by client: " + socket.id);
  });

  socket.on("edit_paste", async (payload) => {
    try {
      const updatedRecord = await db.getOne(
        "UPDATE clipboard SET title = ?, content = ? WHERE id = ? RETURNING *",
        [payload.title, payload.content, payload.id]
      );

      // for (let id of io.sockets.sockets.keys()) {
      // if (id != payload.client_id) {
      io.emit("update_paste", updatedRecord);
      // }
      // }
    } catch (error) {
      console.error(error);
    }
  });
});

app.post("/clipboard/publish", async (req, res) => {
  const { title, content } = req.body;

  try {
    const payload = await db.getOne(
      "INSERT INTO clipboard (title, content, created_at) VALUES (?, ?, ?) RETURNING *",
      [
        title || "Appunti del " + new Date().toLocaleDateString("it-IT"),
        content,
        new Date().toISOString(),
      ]
    );

    io.emit("new_paste", payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
  }
});

app.delete("/clipboard/:id/delete", async (req, res) => {
  const { id } = req.params;

  try {
    const updatedRecord = await db.getOne(
      "UPDATE clipboard SET archived = 1 WHERE id = ? RETURNING *",
      [id]
    );

    if (!updatedRecord) return res.status(404).json("Paste ID not found");

    io.emit("delete_paste", updatedRecord.id);

    return res.status(200).json(updatedRecord.id);
  } catch (error) {
    console.error(error);
  }
});

app.get("/clipboard/all", async (req, res) => {
  try {
    const payload = await db.getAll(
      "SELECT * FROM clipboard WHERE archived = 0"
    );

    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
  }
});

app.post("/archive/publish", upload.single("file"), async (req, res) => {
  const file = req.file;

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

    io.emit("new_archive", payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
  }
});

app.get("/archive/all", async (req, res) => {
  try {
    const payload = await db.getAll("SELECT * FROM archive WHERE archived = 0");

    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
  }
});

app.get("/archive/get", async (req, res) => {
  const filePath = decodeURIComponent(req.query.path);

  try {
    const absolutePath = path.resolve(filePath);
    res.download(absolutePath, (err) => {
      if (err) {
        return res.status(500).json(err);
      }
    });
  } catch (error) {
    console.error(error);
  }
});

app.delete("/archive/:id/delete", async (req, res) => {
  const { id } = req.params;

  try {
    const updatedRecord = await db.getOne(
      "UPDATE archive SET archived = 1 WHERE id = ? RETURNING *",
      [id]
    );

    if (!updatedRecord) return res.status(404).json("Archive ID not found");

    io.emit("delete_archive", updatedRecord.id);

    return res.status(200).json(updatedRecord.id);
  } catch (error) {
    console.error(error);
  }
});

// const logger = (log) => {
//   io.emit("consoleEvent", { payload: log });
//   console.log(log);
// };
