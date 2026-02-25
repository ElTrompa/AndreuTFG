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

-- Cache for activities with their details to reduce Strava API calls
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

-- Cache for processed achievements to avoid reprocessing
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

-- Track last sync time per athlete to enable incremental updates
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
