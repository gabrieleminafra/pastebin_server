import cors from "cors";
import express from "express";

import { Server } from "socket.io";
import { createServer } from "node:http";
import { ClipboardDB } from "./db.js";

const app = express();
app.use(express.json());
app.use(cors());

const server = createServer(app);

server.listen(5000, () => {
  console.log(`Server is listening on port 5000`);
});

const io = new Server(server, {
  transports: ["websocket"],
});

const db = new ClipboardDB();

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
  const { title, content, client_id } = req.body;

  try {
    const payload = await db.getOne(
      "INSERT INTO clipboard (title, content, client_id, created_at) VALUES (?, ?, ?, ?) RETURNING *",
      [
        title || "Paste del " + new Date().toLocaleDateString("it-IT"),
        content,
        client_id,
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
      "UPDATE clipboard SET stale = 1 WHERE id = ? RETURNING *",
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
    const payload = await db.getAll("SELECT * FROM clipboard WHERE stale = 0");

    // io.emit("new_paste", payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
  }
});

// const logger = (log) => {
//   io.emit("consoleEvent", { payload: log });
//   console.log(log);
// };
