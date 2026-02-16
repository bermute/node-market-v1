const pool = require("../data/db");

async function getPosts() {
  const [rows] = await pool.query("SELECT * FROM posts");
  return rows;
}

async function getPostById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM posts WHERE id = ?",
    [id]
  );
  return rows[0];
}

async function addPost(post) {
  await pool.query(
    `INSERT INTO posts ( title, description, price, imageUrl, sellerId, location, status)
      VALUES ( ?, ?, ?, ?, ?, ?, ? )`,
    [
      post.title,
      post.description,
      post.price,
      post.imageUrl,
      post.sellerId,
      post.location,
      post.status,
    ]
  );
}

async function updatePost(id, data) {
  await pool.query(
    "UPDATE posts SET ? WHERE id = ?",
    [data, id]
  );
}

async function deletePost(id) {
  await pool.query("DELETE FROM posts WHERE id = ?", [id]);
}

module.exports = {
  getPosts,
  getPostById,
  addPost,
  updatePost,
  deletePost
};
