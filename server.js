const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const os = require("os");
const qrcode = require("qrcode");
const fs = require("fs");
const multer = require("multer");

const isPkg = !!process.pkg;
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;

const publicDir = path.join(__dirname, "public");
const uploadDir = path.join(basePath, "uploads");

const app = express();

const server = http.createServer(app);

app.use(express.static(publicDir));
app.get("/", (req, res) => {
  const filePath = path.join(publicDir, "index.html");
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    res.setHeader("Content-Type", "text/html");
    res.send(fileContent);
  } catch (err) {
    res.status(404).send("HTML file not found.");
  }
});

app.get("/style.css", (req, res) => {
  const filePath = path.join(publicDir, "style.css");
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    res.setHeader("Content-Type", "text/css");
    res.send(fileContent);
  } catch (err) {
    res.status(404).send("CSS file not found.");
  }
});

app.get("/script.js", (req, res) => {
  const filePath = path.join(publicDir, "script.js");
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    res.setHeader("Content-Type", "application/javascript");
    res.send(fileContent);
  } catch (err) {
    res.status(404).send("JS file not found.");
  }
});

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });
app.use("/uploads", express.static(uploadDir));
app.use('/socket.io', express.static(path.join(basePath, 'node_modules', 'socket.io', 'client-dist')));

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname });
});


const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let users = {};
let chatHistory = {};

function getChatKey(id1, id2) {
  return [id1, id2].sort().join("_");
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) return alias.address;
    }
  }
  return "localhost";
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("setName", (name) => {
    users[socket.id] = name || "Anonymous";
    io.emit("userList", users);
  });

  socket.on("private.message", ({ to, text }) => {
    const msg = {
      id: Date.now() + "-" + Math.random().toString(36).substr(2, 9),
      from: socket.id,
      fromName: users[socket.id] || "Anonymous",
      text,
      ts: Date.now(),
      to,
      status: "sent",
    };
    const key = getChatKey(socket.id, to);
    if (!chatHistory[key]) chatHistory[key] = [];
    chatHistory[key].push(msg);

    socket.to(to).emit("private.message", msg);
    socket.emit("private.message", msg);
  });

  socket.on("private.file", ({ to, file }) => {
    const msg = {
      id: Date.now() + "-" + Math.random().toString(36).substr(2, 9),
      from: socket.id,
      fromName: users[socket.id] || "Anonymous",
      file: { name: file.name, url: file.url },
      ts: Date.now(),
      to,
      status: "sent",
    };
    const key = getChatKey(socket.id, to);
    if (!chatHistory[key]) chatHistory[key] = [];
    chatHistory[key].push(msg);

    socket.to(to).emit("private.file", msg);
    socket.emit("private.file", msg);
  });

  socket.on("message.delivered", ({ msgId, from }) => {
    io.to(from).emit("message.status", { msgId, status: "delivered" });
  });

  socket.on("message.read", ({ msgId, from }) => {
    io.to(from).emit("message.status", { msgId, status: "read" });
  });

  socket.on("getHistory", (otherId) => {
    const key = getChatKey(socket.id, otherId);
    const history = chatHistory[key] || [];
    socket.emit("chatHistory", { with: otherId, messages: history });
  });

  socket.on("typing", (toId) => {
    io.to(toId).emit("typing", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    delete users[socket.id];
    io.emit("userList", users);
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  server.listen(PORT, "0.0.0.0", async () => {
    const localIP = getLocalIP();
    const url = `http://${localIP}:${PORT}`;
    console.log(`Server running on port ${PORT}`);
    console.log(`Open this URL on any device in the same Wi-Fi: ${url}`);

    try {
      const qr = await qrcode.toString(url, { type: "terminal" });
      console.log(qr);
      console.log("Scan this QR code with your phone to open the chat app.");
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  });
}

startServer();



