require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { createServer } = require("http");
const { Server } = require("socket.io");
const dayjs = require("dayjs");

const {
  getPostById
} = require("./models/postModel");
const {
  addMessage,
  getMessagesByPost
} = require("./models/messageModel");
const {
  getUserById
} = require("./models/userModel");
const {
  getAppointments
} = require("./models/appointmentModel");
const createAuthRouter = require("./routes/auth");
const createPostsRouter = require("./routes/posts");
const createApiRouter = require("./routes/api");
const { scheduleAppointmentReminder } = require("./services/notificationService");
const { sessionMiddleware } = require("./services/sessionService");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// 이미지를 담아둘 폴더가 없으면 먼저 만들어 둡니다.
const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "")}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});


// 뷰 엔진과 공통 미들웨어
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.locals.dayjs = dayjs;

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, "public")));

// 라우터 연결
app.use("/", createAuthRouter());
app.use("/", createPostsRouter(upload));
app.use("/api", createApiRouter(io));

app.get("/health", (_req, res) => res.json({ ok: true }));

async function enrichMessage(message) {
  const sender = await getUserById(message.senderId);
  return {
    ...message,
    senderName: sender?.name || message.senderId
  };
}

// socket.io 이벤트 (채팅방 입장 + 메시지 브로드캐스트)
io.on("connection", (socket) => {
  socket.on("joinRoom", async ({ postId }) => {
    socket.join(postId);
    const rawMessages = await getMessagesByPost(postId);
    const history = await Promise.all(rawMessages.map((message) => enrichMessage(message)));
    socket.emit("chatHistory", history);
  });

  socket.on("chatMessage", async ({ postId, senderId, content }) => {
    if (!content?.trim()) {
      return;
    }
    const post = await getPostById(postId);
    if (!post) return;

    const message = await addMessage({
      postId,
      senderId,
      content: content.trim()
    });

    io.to(postId).emit("chatMessage", await enrichMessage(message));
  });
});

const PORT = process.env.PORT || 4000;
async function bootstrap() {
  const appointments = await getAppointments();
  appointments.forEach((appointment) => {
    scheduleAppointmentReminder({ appointment, io });
  });

  httpServer.listen(PORT, () => {
    console.log(`서버가 실행 중입니다: http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("서버 초기화 실패:", error);
  process.exit(1);
});
