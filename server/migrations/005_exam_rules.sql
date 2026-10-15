-- How each exam grades and passes students (ExamRules in src/lib/marksheet.ts).
-- Subjects may now be split into parts (Term 1, Term 2, Viva…); those live in exams.subjects.
ALTER TABLE exams ADD COLUMN grade_scale text NOT NULL DEFAULT '';
ALTER TABLE exams ADD COLUMN pass_percentage double precision;
ALTER TABLE exams ADD COLUMN subject_grades boolean NOT NULL DEFAULT false;
