const pool = require("../data/db");

async function getMessagesByPost(postId) {
  const [rows] = await pool.query(
    "SELECT * FROM messages WHERE postId = ? ORDER BY createdAt ASC",
    [postId]
  );
  return rows;
}

async function addMessage(data) {
  const [result] = await pool.query(
    `INSERT INTO messages (postId, senderId, content)
     VALUES (?, ?, ?)`,
    [data.postId, data.senderId, data.content]
  );

  const [rows] = await pool.query("SELECT * FROM messages WHERE id = ?", [result.insertId]);
  return rows[0];
}

module.exports = {
  getMessagesByPost,
  addMessage
};
