const pool = require("../data/db");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

let loginIdColumnPromise;

async function getLoginIdColumn() {
  if (!loginIdColumnPromise) {
    loginIdColumnPromise = (async () => {
      const [rows] = await pool.query("SHOW COLUMNS FROM users");
      const columns = new Set(rows.map((row) => row.Field));
      if (columns.has("userId")) {
        return "userId";
      }
      if (columns.has("username")) {
        return "username";
      }
      throw new Error("users 테이블에 userId 또는 username 컬럼이 필요합니다.");
    })();
  }
  return loginIdColumnPromise;
}

async function getUsers() {
  const [rows] = await pool.query("SELECT * FROM users");
  return rows;
}

async function getUserById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );
  return rows[0];
}

async function createUserWithCredentials({ userId, name, address, password }) {
  const loginIdColumn = await getLoginIdColumn();
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    `INSERT INTO users (name, address, ${loginIdColumn}, password) VALUES (?, ?, ?, ?)`,
    [name, address, userId, hashedPassword]
  );
  return await getUserById(result.insertId);
}

async function authenticateUser({ userId, password }) {
  const loginIdColumn = await getLoginIdColumn();
  const [rows] = await pool.query(
    `SELECT id, name, address, password FROM users WHERE ${loginIdColumn} = ?`,
    [userId]
  );

  const user = rows[0];
  if (!user) {
    return null;
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return null;
  }
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

module.exports = {
  getUsers,
  getUserById,
  createUserWithCredentials,
  authenticateUser
};
