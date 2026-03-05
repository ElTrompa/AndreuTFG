// Driver de MySQL con soporte nativo para Promises y async/await
const mysql = require('mysql2/promise');

// Crea el pool de conexiones a la base de datos
const createPool = async () => {
  if (process.env.DB_URL) {
    // Si existe DB_URL, se usa directamente (útil en entornos cloud como Railway o Heroku)
    // Ejemplo de formato: mysql://usuario:contraseña@host:3306/nombre_bd
    return mysql.createPool(process.env.DB_URL + '?connectionLimit=10');
  }

  // Configuración del pool con variables de entorno (con valores por defecto para desarrollo local)
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',       // Dirección del servidor MySQL
    user: process.env.DB_USER || 'root',            // Usuario de la base de datos
    password: process.env.DB_PASSWORD || '',        // Contraseña del usuario
    database: process.env.DB_NAME || 'ridemetrics', // Nombre de la base de datos
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306, // Puerto (por defecto 3306)
    waitForConnections: true, // Las peticiones esperan si no hay conexiones disponibles
    connectionLimit: 10,      // Máximo de conexiones simultáneas en el pool
    queueLimit: 0,            // Sin límite en la cola de espera (0 = ilimitado)
  });
  return pool;
};

// Variable que almacena la promesa del pool (patrón singleton)
let poolPromise = null;

// Exporta la función getPool: devuelve siempre el mismo pool (se crea solo una vez)
module.exports.getPool = async () => {
  if (!poolPromise) poolPromise = createPool();
  return poolPromise;
};
