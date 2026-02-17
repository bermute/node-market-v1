const express = require("express");
const {
  createUserWithCredentials,
  authenticateUser
} = require("../models/userModel");
const {
  createSession,
  destroySession
} = require("../services/sessionService");

function createAuthRouter() {
  const router = express.Router();

  router.get("/login", (req, res) => {
    if (req.session?.userId) {
      return res.redirect("/");
    }
    return res.render("login", { errorMessage: null });
  });

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).render("login", {
        errorMessage: "아이디와 비밀번호를 입력해 주세요."
      });
    }

    const user = await authenticateUser({ username, password });
    if (!user) {
      return res.status(401).render("login", {
        errorMessage: "아이디 또는 비밀번호가 올바르지 않습니다."
      });
    }

    createSession(res, {
      userId: user.id,
      userName: user.name
    });

    return res.redirect("/");
  });

  router.get("/signup", (req, res) => {
    if (req.session?.userId) {
      return res.redirect("/");
    }
    return res.render("signup", { errorMessage: null });
  });

  router.post("/signup", async (req, res) => {
    const { username, password, name, address } = req.body;

    if (!username || !password || !name || !address) {
      return res.status(400).render("signup", {
        errorMessage: "모든 항목을 입력해 주세요."
      });
    }

    if (password.length < 6) {
      return res.status(400).render("signup", {
        errorMessage: "비밀번호는 6자 이상이어야 합니다."
      });
    }

    try {
      const user = await createUserWithCredentials({
        username: username.trim(),
        password,
        name: name.trim(),
        address: address.trim()
      });

      createSession(res, {
        userId: user.id,
        userName: user.name
      });

      return res.redirect("/");
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        return res.status(409).render("signup", {
          errorMessage: "이미 사용 중인 아이디입니다."
        });
      }

      console.error("회원가입 실패:", error);
      return res.status(500).render("signup", {
        errorMessage: "회원가입 중 오류가 발생했습니다."
      });
    }
  });

  router.post("/logout", (req, res) => {
    destroySession(req, res);
    return res.redirect("/login");
  });

  return router;
}

module.exports = createAuthRouter;
