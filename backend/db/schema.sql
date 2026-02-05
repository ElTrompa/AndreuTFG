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
