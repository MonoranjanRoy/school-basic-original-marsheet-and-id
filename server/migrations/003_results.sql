-- Exams (e.g. "Annual Examination 2026") and each student's results in them.
CREATE TABLE exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  -- [{ "name": "English", "maxMarks": 100 }, …] — maxMarks may be null
  subjects jsonb NOT NULL,
  -- Students see results only after the head teacher publishes them.
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exam_results (
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- { "English": "78", "Maths": "AB" } — numbers or short codes such as AB (absent)
  marks jsonb NOT NULL,
  grade text,
  remarks text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, student_user_id)
);
CREATE INDEX exam_results_student_idx ON exam_results (student_user_id);
