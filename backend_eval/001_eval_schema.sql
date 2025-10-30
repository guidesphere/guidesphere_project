-- GuideSphere - Evaluations schema (Docker course demo)
CREATE TABLE IF NOT EXISTS transcripts (
  id SERIAL PRIMARY KEY,
  material_id UUID NOT NULL,
  source_type VARCHAR(20) NOT NULL, -- video|pdf|doc
  lang VARCHAR(10) DEFAULT 'es',
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_bank (
  id SERIAL PRIMARY KEY,
  material_id UUID NOT NULL,
  topic VARCHAR(120),
  difficulty SMALLINT DEFAULT 1,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct CHAR(1) NOT NULL CHECK (correct IN ('A','B','C','D')),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_instances (
  id UUID PRIMARY KEY,
  material_id UUID NOT NULL,
  user_id UUID NOT NULL,
  seeded_at TIMESTAMP DEFAULT NOW(),
  rng_seed BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'generated' -- generated|submitted
);

CREATE TABLE IF NOT EXISTS exam_instance_questions (
  id SERIAL PRIMARY KEY,
  exam_id UUID NOT NULL,
  bank_id INT NOT NULL REFERENCES question_bank(id),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct CHAR(1) NOT NULL,
  order_index SMALLINT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL,
  user_id UUID NOT NULL,
  answers JSONB NOT NULL, -- {"1":"B","2":"D",...}
  score NUMERIC(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW()
);
