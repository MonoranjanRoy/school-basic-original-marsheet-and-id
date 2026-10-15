-- Details printed on marksheets and ID cards. One row per student account.
CREATE TABLE student_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  class_name text NOT NULL DEFAULT '',
  section text NOT NULL DEFAULT '',
  roll_no text NOT NULL DEFAULT '',
  admission_no text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  blood_group text NOT NULL DEFAULT '',
  -- Permanent Education Number (UDISE+)
  pen text NOT NULL DEFAULT '',
  -- Personal data: only the head teacher sees the full number; everything else shows XXXX XXXX 1234.
  aadhaar text NOT NULL DEFAULT '',
  father_name text NOT NULL DEFAULT '',
  mother_name text NOT NULL DEFAULT '',
  guardian_phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  photo_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX student_profiles_class_idx ON student_profiles (lower(class_name), lower(section));

INSERT INTO student_profiles (user_id) SELECT id FROM users WHERE role = 'student';

-- Which class an exam is for (limits the marks-entry sheet to that class) and its session.
ALTER TABLE exams ADD COLUMN class_name text NOT NULL DEFAULT '';
ALTER TABLE exams ADD COLUMN session text NOT NULL DEFAULT '';
