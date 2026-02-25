const mysql = require('mysql2/promise');

const createPool = async () => {
  if (process.env.DB_URL) {
    // DB_URL example: mysql://user:pass@host:3306/dbname
    return mysql.createPool(process.env.DB_URL + '?connectionLimit=10');
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ridemetrics',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  return pool;
};

let poolPromise = null;

module.exports.getPool = async () => {
  if (!poolPromise) poolPromise = createPool();
  return poolPromise;
};
