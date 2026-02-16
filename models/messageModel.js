const pool = require("../data/db");

async function getMessagesByPost(postId) {
  const [rows] = await pool.query(
    "SELECT * FROM messages WHERE postId = ? ORDER BY createdAt ASC",
    [postId]
  );
  return rows;
}

module.exports = {
  getMessagesByPost
};
