-- Drop existing foreign key constraints
ALTER TABLE user_presence DROP FOREIGN KEY fk_presence_session;
ALTER TABLE user_presence DROP FOREIGN KEY fk_presence_user;

-- Recreate without foreign key constraints to allow flexible presence tracking
-- This allows presence tracking for sessions/users that might not be in the database yet
