const pool = require("../data/db");

let appointmentColumnsPromise;

async function getAppointmentColumns() {
  if (!appointmentColumnsPromise) {
    appointmentColumnsPromise = (async () => {
      const [rows] = await pool.query("SHOW COLUMNS FROM appointments");
      return new Set(rows.map((row) => row.Field));
    })();
  }
  return appointmentColumnsPromise;
}

async function getAppointments() {
  const [rows] = await pool.query(
    `SELECT a.*, p.sellerId AS sellerId, seller.name AS sellerName, buyer.name AS buyerName
     FROM appointments a
     LEFT JOIN posts p ON p.id = a.postId
     LEFT JOIN users seller ON seller.id = p.sellerId
     LEFT JOIN users buyer ON buyer.id = a.buyerId
    `
  );
  return rows;
}

async function getAppointmentByPost(postId) {
  const [rows] = await pool.query(
    `SELECT a.*, p.sellerId AS sellerId, seller.name AS sellerName, buyer.name AS buyerName
     FROM appointments a
     LEFT JOIN posts p ON p.id = a.postId
     LEFT JOIN users seller ON seller.id = p.sellerId
     LEFT JOIN users buyer ON buyer.id = a.buyerId
     WHERE a.postId = ?`,
    [postId]
  );
  return rows[0];
}

async function addAppointment(data) {
  const columns = await getAppointmentColumns();
  const payload = {};
  const keys = ["id", "postId", "buyerId", "sellerId", "datetime", "place", "cancelRequestedBy", "createdAt"];

  keys.forEach((key) => {
    if (columns.has(key) && typeof data[key] !== "undefined") {
      payload[key] = data[key];
    }
  });

  if (columns.has("createdAt") && typeof payload.createdAt === "undefined") {
    payload.createdAt = new Date();
  }

  if (typeof payload.postId === "undefined" || typeof payload.buyerId === "undefined") {
    throw new Error("appointments 테이블에 필요한 컬럼(postId, buyerId)을 확인해 주세요.");
  }

  const insertColumns = Object.keys(payload);
  const insertValues = Object.values(payload);

  await pool.query(
    `INSERT INTO appointments (${insertColumns.map((col) => `\`${col}\``).join(", ")})
     VALUES (${insertColumns.map(() => "?").join(", ")})`,
    insertValues
  );

  return await getAppointmentByPost(data.postId);
}

async function requestAppointmentCancellation(postId, userId) {
  const columns = await getAppointmentColumns();
  if (!columns.has("cancelRequestedBy")) {
    return await getAppointmentByPost(postId);
  }

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
