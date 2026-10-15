-- Accounts for the head teacher, faculty and students.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('head_teacher', 'faculty', 'student')),
  password_hash text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  -- Bumped on password reset / deactivation to sign the user out everywhere.
  session_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- Uploaded images and PDF attachments.
CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mime text NOT NULL,
  data bytea NOT NULL,
  bytes integer NOT NULL,
  width integer,
  height integer,
  original_name text,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- All editable website content (one row).
CREATE TABLE site_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE faculty_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name jsonb NOT NULL,
  role jsonb NOT NULL,
  qualification jsonb,
  subjects jsonb,
  photo_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  title jsonb NOT NULL,
  body jsonb NOT NULL,
  category jsonb,
  pinned boolean NOT NULL DEFAULT false,
  audience text NOT NULL DEFAULT 'public' CHECK (audience IN ('public', 'students', 'staff')),
  attachment_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  attachment_label jsonb,
  published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notices_date_idx ON notices (date DESC);

CREATE TABLE gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- "/media/<id>" for uploads, or a bundled "/images/..." path.
  src text NOT NULL,
  media_id uuid REFERENCES media(id) ON DELETE CASCADE,
  width integer,
  height integer,
  alt jsonb NOT NULL,
  caption jsonb,
  category jsonb,
  sort integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Who did what, visible to the head teacher.
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  username text,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);
