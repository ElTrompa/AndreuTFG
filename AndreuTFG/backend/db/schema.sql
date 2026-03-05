-- Tabla de atletas para almacenar los tokens de Strava
CREATE TABLE IF NOT EXISTS athletes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id BIGINT NOT NULL UNIQUE,
  access_token VARCHAR(255),
  refresh_token VARCHAR(255),
  expires_at DATETIME,
  token_type VARCHAR(50),
  scope VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla para el flujo de polling OAuth: sesiones de inicio de sesión temporales
CREATE TABLE IF NOT EXISTS login_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  state VARCHAR(128) NOT NULL UNIQUE,
  jwt TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Curvas de potencia-duración en caché por atleta
CREATE TABLE IF NOT EXISTS power_curves (
  athlete_id BIGINT NOT NULL PRIMARY KEY,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  data TEXT,
  INDEX (computed_at)
);

-- Tabla de perfiles para almacenar la configuración del usuario (altura, peso, FTP, VO2max, FC)
CREATE TABLE IF NOT EXISTS profiles (
  athlete_id BIGINT NOT NULL PRIMARY KEY,
  height_cm INT DEFAULT NULL,
  weight_kg DECIMAL(5,2) DEFAULT NULL,
  vo2max DECIMAL(5,2) DEFAULT NULL,
  ftp DECIMAL(6,2) DEFAULT NULL,
  hr_max INT DEFAULT NULL,
  hr_rest INT DEFAULT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Caché de actividades con sus detalles para reducir las llamadas a la API de Strava
CREATE TABLE IF NOT EXISTS activities_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id BIGINT NOT NULL,
  activity_id BIGINT NOT NULL,
  activity_name VARCHAR(255),
  activity_date DATETIME,
  elapsed_time INT,
  distance DECIMAL(10,2),
  type VARCHAR(50),
  segment_efforts_data LONGTEXT,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_activity (athlete_id, activity_id),
  INDEX (athlete_id, updated_at),
  INDEX (cached_at)
);

-- Caché de logros procesados para evitar reprocesarlos
CREATE TABLE IF NOT EXISTS achievements_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id BIGINT NOT NULL,
  koms LONGTEXT,
  top10 LONGTEXT,
  podios LONGTEXT,
  local_legends LONGTEXT,
  total_segments INT DEFAULT 0,
  days_range INT DEFAULT 180,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_achievements (athlete_id, days_range),
  INDEX (athlete_id, cached_at)
);

-- Registro del último tiempo de sincronización por atleta para actualizaciones incrementales
CREATE TABLE IF NOT EXISTS api_sync_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id BIGINT NOT NULL,
  endpoint VARCHAR(100),
  last_sync_timestamp INT,
  request_count INT DEFAULT 0,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_sync (athlete_id, endpoint),
  INDEX (athlete_id, endpoint)
);

-- Almacena los municipios/ciudades encontrados en las actividades
CREATE TABLE IF NOT EXISTS towns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  province VARCHAR(100),
  country VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_town (name, province, country),
  INDEX (name, country)
);

-- Relaciona actividades con municipios (para búsqueda de rutas por municipio)
CREATE TABLE IF NOT EXISTS activity_towns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  athlete_id BIGINT NOT NULL,
  activity_id BIGINT NOT NULL,
  town_id INT NOT NULL,
  distance_from_center DECIMAL(8,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_activity_town (activity_id, town_id),
  INDEX (athlete_id, town_id),
  INDEX (activity_id),
  FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE CASCADE
);
