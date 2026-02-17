const pool = require("../data/db");
const crypto = require("crypto");

let authTableInitPromise;

function ensureAuthTable() {
  if (!authTableInitPromise) {
    authTableInitPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS user_auth (
        userId INT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_auth_user
          FOREIGN KEY (userId) REFERENCES users(id)
          ON DELETE CASCADE
      )
    `);
  }
  return authTableInitPromise;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, expectedHash] = String(passwordHash || "").split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(actualHash, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
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

async function createUserWithCredentials({ username, password, name, address }) {
  await ensureAuthTable();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [userResult] = await connection.query(
      "INSERT INTO users (name, address) VALUES (?, ?)",
      [name, address]
    );

    const passwordHash = hashPassword(password);
    await connection.query(
      "INSERT INTO user_auth (userId, username, passwordHash) VALUES (?, ?, ?)",
      [userResult.insertId, username, passwordHash]
    );

    await connection.commit();
    return await getUserById(userResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function authenticateUser({ username, password }) {
  await ensureAuthTable();

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.address, ua.passwordHash
     FROM user_auth ua
     INNER JOIN users u ON u.id = ua.userId
     WHERE ua.username = ?`,
    [username]
  );

  const record = rows[0];
  if (!record) {
    return null;
  }

  if (!verifyPassword(password, record.passwordHash)) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    address: record.address
  };
}

module.exports = {
  getUsers,
  getUserById,
  createUserWithCredentials,
  authenticateUser
};
