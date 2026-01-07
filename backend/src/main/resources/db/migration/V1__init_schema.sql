CREATE TABLE users (
  id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(512),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE collaboration_session (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  creator_id VARCHAR(36) NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  allow_collaborative_drawing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_session_creator (creator_id),
  CONSTRAINT fk_session_creator
    FOREIGN KEY (creator_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE session_strokes (
  id VARCHAR(36) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  stroke_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_strokes_session (session_id),
  INDEX idx_strokes_user (user_id),

  CONSTRAINT fk_strokes_session
    FOREIGN KEY (session_id)
    REFERENCES collaboration_session(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_strokes_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE chat_messages (
  id VARCHAR(36) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_chat_session (session_id),
  INDEX idx_chat_user (user_id),

  CONSTRAINT fk_chat_session
    FOREIGN KEY (session_id)
    REFERENCES collaboration_session(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_chat_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE user_presence (
  session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  last_seen TIMESTAMP NOT NULL,
  cursor_x INT,
  cursor_y INT,

  PRIMARY KEY (session_id, user_id),
  INDEX idx_presence_last_seen (last_seen),

  CONSTRAINT fk_presence_session
    FOREIGN KEY (session_id)
    REFERENCES collaboration_session(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_presence_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);
