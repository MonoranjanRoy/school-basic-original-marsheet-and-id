-- Students sign in with their student ID and date of birth instead of a password.
ALTER TABLE users ADD COLUMN student_id text;
ALTER TABLE users ADD COLUMN date_of_birth date;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Student IDs are unique regardless of letter case.
CREATE UNIQUE INDEX users_student_id_key ON users (lower(student_id));

-- Students no longer use passwords.
UPDATE users SET password_hash = NULL, must_change_password = false WHERE role = 'student';
