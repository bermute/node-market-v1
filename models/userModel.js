const pool = require("../data/db");

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

module.exports = {
  getUsers,
  getUserById
};
