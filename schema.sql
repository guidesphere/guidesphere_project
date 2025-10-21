--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: content_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.content_type AS ENUM (
    'video',
    'document',
    'link',
    'markdown',
    'quiz'
);


ALTER TYPE public.content_type OWNER TO postgres;

--
-- Name: media_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.media_source AS ENUM (
    'upload',
    'onedrive',
    'teams',
    'powerpoint',
    'external_url'
);


ALTER TYPE public.media_source OWNER TO postgres;

--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role_enum AS ENUM (
    'superadmin',
    'admin',
    'professor',
    'student'
);


ALTER TYPE public.user_role_enum OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    meta jsonb,
    at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: certificate_template; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificate_template (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    name text NOT NULL,
    design_json jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.certificate_template OWNER TO postgres;

--
-- Name: comment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content_id uuid,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comment OWNER TO postgres;

--
-- Name: content_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    section_id uuid,
    type public.content_type NOT NULL,
    title text NOT NULL,
    description text,
    "position" integer DEFAULT 1 NOT NULL,
    duration_sec integer,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.content_item OWNER TO postgres;

--
-- Name: course; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    title text NOT NULL,
    description text,
    passing_score numeric(5,2) DEFAULT 70.00,
    created_by uuid,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.course OWNER TO postgres;

--
-- Name: course_section; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_section (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    "position" integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.course_section OWNER TO postgres;

--
-- Name: document_asset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_asset (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid,
    source public.media_source NOT NULL,
    uri text NOT NULL,
    provider_meta jsonb,
    pages integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_asset OWNER TO postgres;

--
-- Name: enrollment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enrollment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.enrollment OWNER TO postgres;

--
-- Name: issued_certificate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issued_certificate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    public_code text NOT NULL,
    pdf_uri text
);


ALTER TABLE public.issued_certificate OWNER TO postgres;

--
-- Name: media_asset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_asset (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid,
    source public.media_source NOT NULL,
    uri text NOT NULL,
    provider_meta jsonb,
    thumbnail_uri text,
    duration_sec integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.media_asset OWNER TO postgres;

--
-- Name: organization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    domain text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organization OWNER TO postgres;

--
-- Name: progress_event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.progress_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    content_id uuid,
    event_type text NOT NULL,
    value numeric(10,2),
    at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.progress_event OWNER TO postgres;

--
-- Name: quiz; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid NOT NULL,
    time_limit_sec integer,
    attempts_allowed integer DEFAULT 3,
    randomize_order boolean DEFAULT false
);


ALTER TABLE public.quiz OWNER TO postgres;

--
-- Name: quiz_answer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_answer (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    selected_option_ids uuid[],
    free_text text
);


ALTER TABLE public.quiz_answer OWNER TO postgres;

--
-- Name: quiz_attempt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_attempt (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    user_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    score numeric(6,2),
    passed boolean,
    attempt_no integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.quiz_attempt OWNER TO postgres;

--
-- Name: quiz_option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_option (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    label text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL
);


ALTER TABLE public.quiz_option OWNER TO postgres;

--
-- Name: quiz_question; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_question (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    prompt text NOT NULL,
    question_type text DEFAULT 'single_choice'::text NOT NULL,
    points numeric(6,2) DEFAULT 1 NOT NULL
);


ALTER TABLE public.quiz_question OWNER TO postgres;

--
-- Name: rating; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rating (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    score integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rating_score_check CHECK (((score >= 1) AND (score <= 5)))
);


ALTER TABLE public.rating OWNER TO postgres;

--
-- Name: user_account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    email public.citext NOT NULL,
    password_hash text,
    first_name text,
    last_name text,
    phone text,
    avatar_path text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role public.user_role_enum DEFAULT 'student'::public.user_role_enum NOT NULL,
    username text
);


ALTER TABLE public.user_account OWNER TO postgres;

--
-- Name: v_user_admin_list; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_user_admin_list AS
 SELECT id,
    ((first_name || ' '::text) || last_name) AS name,
    email,
    role
   FROM public.user_account u;


ALTER VIEW public.v_user_admin_list OWNER TO postgres;

--
-- Name: v_user_login; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_user_login AS
 SELECT id,
    email,
    username,
    ((first_name || ' '::text) || last_name) AS full_name,
    role,
    password_hash
   FROM public.user_account u;


ALTER VIEW public.v_user_login OWNER TO postgres;

--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: certificate_template certificate_template_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificate_template
    ADD CONSTRAINT certificate_template_pkey PRIMARY KEY (id);


--
-- Name: comment comment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_pkey PRIMARY KEY (id);


--
-- Name: content_item content_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_item
    ADD CONSTRAINT content_item_pkey PRIMARY KEY (id);


--
-- Name: course course_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course
    ADD CONSTRAINT course_pkey PRIMARY KEY (id);


--
-- Name: course_section course_section_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_section
    ADD CONSTRAINT course_section_pkey PRIMARY KEY (id);


--
-- Name: document_asset document_asset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_asset
    ADD CONSTRAINT document_asset_pkey PRIMARY KEY (id);


--
-- Name: enrollment enrollment_course_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollment
    ADD CONSTRAINT enrollment_course_id_user_id_key UNIQUE (course_id, user_id);


--
-- Name: enrollment enrollment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollment
    ADD CONSTRAINT enrollment_pkey PRIMARY KEY (id);


--
-- Name: issued_certificate issued_certificate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issued_certificate
    ADD CONSTRAINT issued_certificate_pkey PRIMARY KEY (id);


--
-- Name: issued_certificate issued_certificate_public_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issued_certificate
    ADD CONSTRAINT issued_certificate_public_code_key UNIQUE (public_code);


--
-- Name: media_asset media_asset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_asset
    ADD CONSTRAINT media_asset_pkey PRIMARY KEY (id);


--
-- Name: organization organization_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_name_key UNIQUE (name);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: progress_event progress_event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_event
    ADD CONSTRAINT progress_event_pkey PRIMARY KEY (id);


--
-- Name: quiz_answer quiz_answer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_answer
    ADD CONSTRAINT quiz_answer_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempt quiz_attempt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_attempt
    ADD CONSTRAINT quiz_attempt_pkey PRIMARY KEY (id);


--
-- Name: quiz quiz_content_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz
    ADD CONSTRAINT quiz_content_id_key UNIQUE (content_id);


--
-- Name: quiz_option quiz_option_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_option
    ADD CONSTRAINT quiz_option_pkey PRIMARY KEY (id);


--
-- Name: quiz quiz_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz
    ADD CONSTRAINT quiz_pkey PRIMARY KEY (id);


--
-- Name: quiz_question quiz_question_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_question
    ADD CONSTRAINT quiz_question_pkey PRIMARY KEY (id);


--
-- Name: rating rating_course_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rating
    ADD CONSTRAINT rating_course_id_user_id_key UNIQUE (course_id, user_id);


--
-- Name: rating rating_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rating
    ADD CONSTRAINT rating_pkey PRIMARY KEY (id);


--
-- Name: user_account user_account_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_email_key UNIQUE (email);


--
-- Name: user_account user_account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_pkey PRIMARY KEY (id);


--
-- Name: user_account user_account_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_username_key UNIQUE (username);


--
-- Name: idx_content_course; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_course ON public.content_item USING btree (course_id, section_id, type);


--
-- Name: idx_course_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_course_org ON public.course USING btree (org_id);


--
-- Name: idx_enrollment_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollment_user ON public.enrollment USING btree (user_id);


--
-- Name: idx_progress_user_course; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_user_course ON public.progress_event USING btree (user_id, course_id, at);


--
-- Name: idx_quiz_attempt_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quiz_attempt_user ON public.quiz_attempt USING btree (user_id, quiz_id, started_at);


--
-- Name: idx_user_account_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_account_email ON public.user_account USING btree (email);


--
-- Name: course trg_course_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_course_updated BEFORE UPDATE ON public.course FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_account trg_user_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_updated BEFORE UPDATE ON public.user_account FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.user_account(id) ON DELETE SET NULL;


--
-- Name: certificate_template certificate_template_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificate_template
    ADD CONSTRAINT certificate_template_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(id) ON DELETE SET NULL;


--
-- Name: certificate_template certificate_template_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificate_template
    ADD CONSTRAINT certificate_template_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organization(id) ON DELETE SET NULL;


--
-- Name: comment comment_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_item(id) ON DELETE SET NULL;


--
-- Name: comment comment_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: comment comment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


--
-- Name: content_item content_item_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_item
    ADD CONSTRAINT content_item_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: content_item content_item_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_item
    ADD CONSTRAINT content_item_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(id) ON DELETE SET NULL;


--
-- Name: content_item content_item_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_item
    ADD CONSTRAINT content_item_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.course_section(id) ON DELETE SET NULL;


--
-- Name: course course_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course
    ADD CONSTRAINT course_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_account(id) ON DELETE SET NULL;


--
-- Name: course course_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course
    ADD CONSTRAINT course_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organization(id) ON DELETE SET NULL;


--
-- Name: course_section course_section_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_section
    ADD CONSTRAINT course_section_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: document_asset document_asset_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_asset
    ADD CONSTRAINT document_asset_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_item(id) ON DELETE CASCADE;


--
-- Name: enrollment enrollment_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollment
    ADD CONSTRAINT enrollment_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: enrollment enrollment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollment
    ADD CONSTRAINT enrollment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


--
-- Name: issued_certificate issued_certificate_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issued_certificate
    ADD CONSTRAINT issued_certificate_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: issued_certificate issued_certificate_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issued_certificate
    ADD CONSTRAINT issued_certificate_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.certificate_template(id) ON DELETE RESTRICT;


--
-- Name: issued_certificate issued_certificate_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issued_certificate
    ADD CONSTRAINT issued_certificate_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


--
-- Name: media_asset media_asset_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_asset
    ADD CONSTRAINT media_asset_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_item(id) ON DELETE CASCADE;


--
-- Name: progress_event progress_event_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_event
    ADD CONSTRAINT progress_event_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_item(id) ON DELETE SET NULL;


--
-- Name: progress_event progress_event_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_event
    ADD CONSTRAINT progress_event_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: progress_event progress_event_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_event
    ADD CONSTRAINT progress_event_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


--
-- Name: quiz_answer quiz_answer_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_answer
    ADD CONSTRAINT quiz_answer_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.quiz_attempt(id) ON DELETE CASCADE;


--
-- Name: quiz_answer quiz_answer_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_answer
    ADD CONSTRAINT quiz_answer_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_question(id) ON DELETE CASCADE;


--
-- Name: quiz_attempt quiz_attempt_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_attempt
    ADD CONSTRAINT quiz_attempt_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;


--
-- Name: quiz_attempt quiz_attempt_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_attempt
    ADD CONSTRAINT quiz_attempt_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


--
-- Name: quiz quiz_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz
    ADD CONSTRAINT quiz_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_item(id) ON DELETE CASCADE;


--
-- Name: quiz_option quiz_option_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_option
    ADD CONSTRAINT quiz_option_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_question(id) ON DELETE CASCADE;


--
-- Name: quiz_question quiz_question_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_question
    ADD CONSTRAINT quiz_question_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;


--
-- Name: rating rating_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rating
    ADD CONSTRAINT rating_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: rating rating_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rating
    ADD CONSTRAINT rating_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


--
-- Name: user_account user_account_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organization(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

