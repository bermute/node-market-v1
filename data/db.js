const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "appuser",
  password: "AppUser@2026!",
  database: "mydb",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z'
});

module.exports = pool;
