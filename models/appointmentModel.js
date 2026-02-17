const pool = require("../data/db");

async function getAppointments() {
  const [rows] = await pool.query("SELECT * FROM appointments");
  return rows;
}

async function getAppointmentByPost(postId) {
  const [rows] = await pool.query(
    "SELECT * FROM appointments WHERE postId = ?",
    [postId]
  );
  return rows[0];
}

async function addAppointment(data) {
  await pool.query(
    `INSERT INTO appointments (id, postId, buyerId, sellerId, datetime, place)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.postId,
      data.buyerId,
      data.sellerId,
      data.datetime,
      data.place
    ]
  );
  return data;
}

async function requestAppointmentCancellation(postId, userId) {
  const [result] = await pool.query(
    `UPDATE appointments
      SET cancelRequestedBy = ?
      WHERE postId = ?`,
    [userId, postId]
  );

  if (result.affectedRows === 0) return null;

  return await getAppointmentByPost(postId);
}

async function finalizeAppointmentCancellation(postId) {
  const appointment = await getAppointmentByPost(postId);
  if (!appointment) return null;

  const [result] = await pool.query(
    `DELETE FROM appointments WHERE postId = ?`,
    [postId]
  );

  if (result.affectedRows === 0) return null;

  return appointment; // 삭제 전 데이터 반환
}

module.exports = {
  getAppointments,
  getAppointmentByPost,
  addAppointment,
  requestAppointmentCancellation,
  finalizeAppointmentCancellation
};
