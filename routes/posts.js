const express = require("express");
const path = require("path");
const { clearAppointmentReminder } = require("../services/notificationService");
const {  
  getPosts,
  getPostById,
  addPost,
  updatePost,
  deletePost
} = require("../models/postModel");
const {
  getUsers,
  getUserById
} = require("../models/userModel");

const {
  getMessagesByPost
} = require("../models/messageModel");
const {
  getAppointmentByPost
} = require("../models/appointmentModel");

const DEFAULT_IMAGE = "/uploads/r3.jpg";

function createPostsRouter(upload) {
  const router = express.Router();

  // 세션 로그인 사용자만 접근합니다.
  router.use(async (req, res, next) => {
    if (!req.session?.userId) {
      return res.redirect("/login");
    }

    res.locals.request = req;
    const currentUser = await getUserById(req.session.userId);
    if (!currentUser) {
      return res.redirect("/login");
    }

    res.locals.currentUserId = currentUser.id;
    res.locals.authUser = currentUser;
    res.locals.users = await getUsers();
    return next();
  });

  // 메인 리스트 페이지
  router.get("/", async (req, res) => {
    const posts = await getPosts();
    res.render("index", {
      posts
    });
  });

  // 판매글 작성 화면
  router.get("/posts/new", async (req, res) => {
    const currentUser = await getUserById(res.locals.currentUserId);
    res.render("post_new", {
      defaultLocation: currentUser?.address || ""
    });
  });

  // 판매글 저장
  router.post("/posts", upload.single("image"), async (req, res) => {
    const { title, price, location, description } = req.body;

    const seller = res.locals.authUser;
    const sanitizedLocation = location || seller.address || "";
    const filePath = req.file ? `/uploads/${path.basename(req.file.path)}` : DEFAULT_IMAGE;

    const newPost = {

      title,
      description,
      price: Number(price) || 0,
      imageUrl: filePath,
      sellerId: seller.id,
      location: sanitizedLocation,
      status: "판매중",
    };

    await addPost(newPost);

    res.redirect("/");
  });

  async function enrichMessages(messages = []) {
    return Promise.all(messages.map(async (msg) => {
      const sender = await getUserById(msg.senderId);
      const receiver = await getUserById(msg.receiverId);
      return {
        ...msg,
        senderName: sender?.name || msg.senderId,
        receiverName: receiver?.name || msg.receiverId
      };
    }));
  }

  // 판매글 상세 + 채팅/약속 화면
  router.get("/posts/:id", async (req, res) => {
    const post = await getPostById(req.params.id);
    if (!post) {
      return res.status(404).render("404", { message: "게시글을 찾을 수 없습니다." });
    }

    res.render("post_show", {
      post,
      messages: await enrichMessages(await getMessagesByPost(post.id)),
      appointment: await getAppointmentByPost(post.id),
      errorMessage: req.query.error || null
    });
  });

  router.post("/posts/:id/delete",async (req, res) => {
    const post = await getPostById(req.params.id);
    const currentUser = res.locals.currentUserId;
    if (!post) {
      return res.status(404).render("404", { message: "게시글을 찾을 수 없습니다." });
    }
    if (post.sellerId !== currentUser) {
      return res.status(403).render("404", { message: "삭제 권한이 없습니다." });
    }
    const appointment = await getAppointmentByPost(post.id);
    if (post.status === "예약중" && appointment) {
      return res.redirect(`/posts/${post.id}?error=예약을 먼저 철회해야 삭제할 수 있습니다.`);
    }

    await deletePost(post.id);
    clearAppointmentReminder(post.id);
    res.redirect("/");
  });

  return router;
}

module.exports = createPostsRouter;
