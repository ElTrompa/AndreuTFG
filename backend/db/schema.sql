-- Create athletes table to store Strava tokens
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

-- Table to support OAuth polling flow: temporary login sessions
CREATE TABLE IF NOT EXISTS login_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  state VARCHAR(128) NOT NULL UNIQUE,
  jwt TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cached power-duration curves per athlete
CREATE TABLE IF NOT EXISTS power_curves (
  athlete_id BIGINT NOT NULL PRIMARY KEY,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  data TEXT,
  INDEX (computed_at)
);

-- Profiles table to store user settings (height, weight, FTP, VO2max, HR)
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
