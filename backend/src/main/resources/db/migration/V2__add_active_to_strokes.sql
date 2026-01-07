ALTER TABLE session_strokes DROP FOREIGN KEY fk_strokes_user;

ALTER TABLE session_strokes MODIFY user_id VARCHAR(36) NULL;
