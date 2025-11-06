--
-- PostgreSQL database dump
--

\restrict fzT9ZpwXHmA2HlHUJaWZBIyX24QtBcEkEPGKdyjyN9PO345aQHy8GwqIjYi6sE8

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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
-- Name: course_certificate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_certificate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    attempt_id uuid NOT NULL,
    score_percent numeric(5,2) NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.course_certificate OWNER TO postgres;

--
-- Name: course_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    last_video_sec integer DEFAULT 0 NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.course_progress OWNER TO postgres;

--
-- Name: course_rating; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_rating (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    rating smallint NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT course_rating_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.course_rating OWNER TO postgres;

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
-- Name: exam_answer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_answer (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    option_id uuid NOT NULL,
    is_correct boolean NOT NULL
);


ALTER TABLE public.exam_answer OWNER TO postgres;

--
-- Name: exam_attempt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_attempt (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    quiz_id uuid NOT NULL,
    content_id uuid NOT NULL,
    score_percent numeric(5,2) NOT NULL,
    passed boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.exam_attempt OWNER TO postgres;

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
    username text,
    avatar_uri text DEFAULT '/uploads/avatars/default.png'::text,
    password text,
    CONSTRAINT user_account_role_chk CHECK ((role = ANY (ARRAY['superadmin'::public.user_role_enum, 'professor'::public.user_role_enum, 'student'::public.user_role_enum])))
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
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, actor_id, action, target_type, target_id, meta, at) FROM stdin;
\.


--
-- Data for Name: certificate_template; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certificate_template (id, org_id, name, design_json, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: comment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comment (id, course_id, user_id, content_id, body, created_at) FROM stdin;
\.


--
-- Data for Name: content_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content_item (id, course_id, section_id, type, title, description, "position", duration_sec, created_by, created_at) FROM stdin;
46a69b73-2ab7-4236-95d8-b0d5c92b3c46	53069cde-2196-4241-8ce3-a2f18fbfd181	\N	document	1762199239619.pdf	\N	1	\N	e047ad6a-24e8-4180-8633-bb3084555829	2025-11-03 19:47:22.009909+00
2d53534d-d0f9-4d3c-9116-9293f224df47	e22a2bfa-4508-4498-83c7-955f979df862	\N	document	1762199478782.pdf	\N	1	\N	e047ad6a-24e8-4180-8633-bb3084555829	2025-11-03 19:51:45.040126+00
3f7f7e5d-10b3-4b81-9852-838ba05f9fb0	e22a2bfa-4508-4498-83c7-955f979df862	\N	video	1762199490298.mp4	\N	2	\N	e047ad6a-24e8-4180-8633-bb3084555829	2025-11-03 19:51:45.040126+00
bfba1706-0324-43f5-87d5-8dfabc7b450f	b16a9091-9190-4eac-b7b2-6dad61dfcb57	\N	video	1762264151664.mp4	\N	1	\N	258f5ce3-55fd-4107-8a9c-41ca5ea0dd0f	2025-11-04 13:49:17.48906+00
af4d6809-6ff7-4efa-9a98-56857a7d7a09	63a2e225-836c-4f77-992f-ad2f9ea7c361	\N	document	1762264201435.pdf	\N	1	\N	258f5ce3-55fd-4107-8a9c-41ca5ea0dd0f	2025-11-04 13:50:03.23002+00
230811d5-8476-48b1-8c7f-b6d689d77f7f	47995892-34c6-442d-8ee9-21179e8f827c	\N	video	1762271911802.mp4	\N	1	\N	6b046204-dea0-45e9-90ee-c35ff5d81ba5	2025-11-04 15:58:33.646258+00
603a54a6-36b6-41a2-99b7-c87dd9ec2f85	792ab1a0-402e-49ab-829a-f1b004c71d13	\N	document	1762293010587.pdf	\N	1	\N	6b046204-dea0-45e9-90ee-c35ff5d81ba5	2025-11-05 13:14:40.816276+00
5487a40a-8723-4fe8-abcc-b788d2be85df	792ab1a0-402e-49ab-829a-f1b004c71d13	\N	video	1762293018164.mp4	\N	2	\N	6b046204-dea0-45e9-90ee-c35ff5d81ba5	2025-11-05 13:14:40.816276+00
\.


--
-- Data for Name: course; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course (id, org_id, title, description, passing_score, created_by, is_published, created_at, updated_at) FROM stdin;
13626215-e9be-4fb3-a0c3-03a2a385e554	\N	Curso Práctico de Docker	Primeros pasos en Docker	70.00	e047ad6a-24e8-4180-8633-bb3084555829	t	2025-11-03 17:38:02.538116+00	2025-11-03 17:38:57.075012+00
53069cde-2196-4241-8ce3-a2f18fbfd181	\N	Curso de prueba Docker	curso para probar	70.00	e047ad6a-24e8-4180-8633-bb3084555829	t	2025-11-03 19:47:22.009909+00	2025-11-03 19:49:07.913394+00
e22a2bfa-4508-4498-83c7-955f979df862	\N	El Docker del futuro	Segunda prueba de curso	70.00	e047ad6a-24e8-4180-8633-bb3084555829	t	2025-11-03 19:51:45.040126+00	2025-11-03 19:52:26.689429+00
63a2e225-836c-4f77-992f-ad2f9ea7c361	\N	Lenguajes de Programacion	Introduccion a la programacion.	70.00	258f5ce3-55fd-4107-8a9c-41ca5ea0dd0f	t	2025-11-04 13:50:03.23002+00	2025-11-04 13:50:27.616436+00
b16a9091-9190-4eac-b7b2-6dad61dfcb57	\N	Bases de Datos	Introduccion a las bases de datos	70.00	258f5ce3-55fd-4107-8a9c-41ca5ea0dd0f	t	2025-11-04 13:49:17.48906+00	2025-11-04 13:50:28.934935+00
47995892-34c6-442d-8ee9-21179e8f827c	\N	Introduccion al CSS	Códigos para el diseño	70.00	6b046204-dea0-45e9-90ee-c35ff5d81ba5	t	2025-11-04 15:58:33.646258+00	2025-11-04 15:58:45.651953+00
792ab1a0-402e-49ab-829a-f1b004c71d13	\N	Introducción a React		60.00	6b046204-dea0-45e9-90ee-c35ff5d81ba5	t	2025-11-04 21:50:34.873931+00	2025-11-05 13:14:40.816276+00
\.


--
-- Data for Name: course_certificate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_certificate (id, user_id, course_id, attempt_id, score_percent, issued_at) FROM stdin;
6ea67783-3b1f-4450-94ce-87e80207aa29	904fe67e-8c34-49f9-ad76-3a0bc52e6277	e22a2bfa-4508-4498-83c7-955f979df862	ed39748c-7e45-4da9-af2f-1692e1253465	100.00	2025-11-05 01:19:11.518733+00
0e4fadf4-bb27-416f-b001-753f81b16ca9	904fe67e-8c34-49f9-ad76-3a0bc52e6277	792ab1a0-402e-49ab-829a-f1b004c71d13	d71d24d2-07a7-466b-834d-acd5c1d2fdba	100.00	2025-11-05 19:54:07.238148+00
\.


--
-- Data for Name: course_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_progress (id, user_id, course_id, progress, last_video_sec, meta, updated_at) FROM stdin;
8bf27b2f-ecbd-47aa-9d79-62e9059f571d	904fe67e-8c34-49f9-ad76-3a0bc52e6277	e22a2bfa-4508-4498-83c7-955f979df862	100	419	{"items": {"2d53534d-d0f9-4d3c-9116-9293f224df47": {"status": "completed", "last_sec": 0, "progress_percent": 100}, "3f7f7e5d-10b3-4b81-9852-838ba05f9fb0": {"status": "completed", "last_sec": 419, "progress_percent": 100}}, "docProgress": {"2d53534d-d0f9-4d3c-9116-9293f224df47": 100}, "lastVideoId": "3f7f7e5d-10b3-4b81-9852-838ba05f9fb0", "videoProgress": {"3f7f7e5d-10b3-4b81-9852-838ba05f9fb0": 100}, "lastVideoTitle": "1762199490298.mp4"}	2025-11-04 00:43:28.981202+00
0c341068-17af-4005-a0b2-7db9033bf4b3	904fe67e-8c34-49f9-ad76-3a0bc52e6277	53069cde-2196-4241-8ce3-a2f18fbfd181	100	0	{"items": {"46a69b73-2ab7-4236-95d8-b0d5c92b3c46": {"status": "completed", "last_sec": 0, "progress_percent": 100}}, "docProgress": {"46a69b73-2ab7-4236-95d8-b0d5c92b3c46": 100}, "lastVideoId": null, "videoProgress": {}, "lastVideoTitle": ""}	2025-11-04 14:38:44.441725+00
a2a76a13-9ccc-4b55-9a10-f972f51e6313	904fe67e-8c34-49f9-ad76-3a0bc52e6277	792ab1a0-402e-49ab-829a-f1b004c71d13	100	42	{"items": {"5487a40a-8723-4fe8-abcc-b788d2be85df": {"status": "completed", "last_sec": 42, "progress_percent": 100}, "603a54a6-36b6-41a2-99b7-c87dd9ec2f85": {"status": "completed", "last_sec": 0, "progress_percent": 100}}, "docProgress": {"603a54a6-36b6-41a2-99b7-c87dd9ec2f85": 100, "8d850274-1431-4fe8-9d05-8df7450b7eca": 100}, "lastVideoId": "5487a40a-8723-4fe8-abcc-b788d2be85df", "videoProgress": {"2f9d5cd5-6995-43e5-8d11-19fb858f926d": 100, "5487a40a-8723-4fe8-abcc-b788d2be85df": 100}, "lastVideoTitle": "1762293018164.mp4"}	2025-11-05 19:50:36.181855+00
a4a45893-4107-472a-8b26-7eb87389a367	904fe67e-8c34-49f9-ad76-3a0bc52e6277	47995892-34c6-442d-8ee9-21179e8f827c	100	53	{"items": {"230811d5-8476-48b1-8c7f-b6d689d77f7f": {"status": "completed", "last_sec": 53, "progress_percent": 100}}, "docProgress": {}, "lastVideoId": "230811d5-8476-48b1-8c7f-b6d689d77f7f", "videoProgress": {"230811d5-8476-48b1-8c7f-b6d689d77f7f": 100}, "lastVideoTitle": "1762271911802.mp4"}	2025-11-04 16:00:11.874395+00
f7fe3de1-2b6c-408e-8a37-18db733371b2	904fe67e-8c34-49f9-ad76-3a0bc52e6277	b16a9091-9190-4eac-b7b2-6dad61dfcb57	100	52	{"items": {"bfba1706-0324-43f5-87d5-8dfabc7b450f": {"status": "completed", "last_sec": 52, "progress_percent": 100}}, "docProgress": {}, "lastVideoId": "bfba1706-0324-43f5-87d5-8dfabc7b450f", "videoProgress": {"bfba1706-0324-43f5-87d5-8dfabc7b450f": 100}, "lastVideoTitle": "1762264151664.mp4"}	2025-11-04 15:48:14.603916+00
77e2e33d-9bf2-477a-b8b6-06851ea3846a	904fe67e-8c34-49f9-ad76-3a0bc52e6277	63a2e225-836c-4f77-992f-ad2f9ea7c361	100	0	{"items": {"af4d6809-6ff7-4efa-9a98-56857a7d7a09": {"status": "completed", "last_sec": 0, "progress_percent": 100}}, "docProgress": {"af4d6809-6ff7-4efa-9a98-56857a7d7a09": 100}, "lastVideoId": null, "videoProgress": {}, "lastVideoTitle": ""}	2025-11-04 23:09:00.316755+00
\.


--
-- Data for Name: course_rating; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_rating (id, user_id, course_id, rating, comment, created_at, updated_at) FROM stdin;
a211858f-81d4-4ab4-a2d4-facc3147859b	904fe67e-8c34-49f9-ad76-3a0bc52e6277	e22a2bfa-4508-4498-83c7-955f979df862	5	Excelente curso, muy claro.	2025-11-05 01:35:20.045027+00	2025-11-05 05:07:31.315453+00
5e28625c-2356-4e08-bed1-138e23b3ea33	904fe67e-8c34-49f9-ad76-3a0bc52e6277	47995892-34c6-442d-8ee9-21179e8f827c	5	Excelente profesor	2025-11-05 05:08:05.164978+00	2025-11-05 05:08:05.164978+00
54ed5aeb-fc41-47cd-93bf-f0902b276ec3	904fe67e-8c34-49f9-ad76-3a0bc52e6277	792ab1a0-402e-49ab-829a-f1b004c71d13	4	Buen curso, pero esperaba más	2025-11-05 19:51:05.819849+00	2025-11-05 19:51:05.819849+00
\.


--
-- Data for Name: course_section; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_section (id, course_id, title, "position") FROM stdin;
\.


--
-- Data for Name: document_asset; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_asset (id, content_id, source, uri, provider_meta, pages, created_at) FROM stdin;
22b531b3-4e3f-4249-9351-7993833cd32c	46a69b73-2ab7-4236-95d8-b0d5c92b3c46	upload	/uploads/docs/1762199239619.pdf	\N	\N	2025-11-03 19:47:22.009909+00
3c5d4bd0-d0a5-41b2-bb1d-3a25fb437c1d	2d53534d-d0f9-4d3c-9116-9293f224df47	upload	/uploads/docs/1762199478782.pdf	\N	\N	2025-11-03 19:51:45.040126+00
1cdd13f5-ce9f-441a-b0b1-98102c24b8a7	af4d6809-6ff7-4efa-9a98-56857a7d7a09	upload	/uploads/docs/1762264201435.pdf	\N	\N	2025-11-04 13:50:03.23002+00
3331277d-d90c-441b-a063-434167396607	603a54a6-36b6-41a2-99b7-c87dd9ec2f85	upload	/uploads/docs/1762293010587.pdf	\N	\N	2025-11-05 13:14:40.816276+00
\.


--
-- Data for Name: enrollment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.enrollment (id, course_id, user_id, enrolled_at) FROM stdin;
30d99f7e-5e37-43bf-b0f5-a20aabaf5b65	13626215-e9be-4fb3-a0c3-03a2a385e554	904fe67e-8c34-49f9-ad76-3a0bc52e6277	2025-11-03 17:45:49.759603+00
d2357e27-05be-4736-9268-a3cff4a3ba16	53069cde-2196-4241-8ce3-a2f18fbfd181	904fe67e-8c34-49f9-ad76-3a0bc52e6277	2025-11-03 19:49:28.594359+00
723b8795-46aa-4fa4-9684-a34a6c7e3cd8	e22a2bfa-4508-4498-83c7-955f979df862	904fe67e-8c34-49f9-ad76-3a0bc52e6277	2025-11-03 19:52:50.373806+00
90409765-8b78-4eca-80b7-5f4914a727a8	b16a9091-9190-4eac-b7b2-6dad61dfcb57	904fe67e-8c34-49f9-ad76-3a0bc52e6277	2025-11-04 13:51:06.248792+00
0ec1b094-7a7a-4cd4-aa95-faebe15b33eb	63a2e225-836c-4f77-992f-ad2f9ea7c361	904fe67e-8c34-49f9-ad76-3a0bc52e6277	2025-11-04 13:51:11.585475+00
36eda23b-7bed-43a2-8cc0-a9d677391726	47995892-34c6-442d-8ee9-21179e8f827c	904fe67e-8c34-49f9-ad76-3a0bc52e6277	2025-11-04 15:59:07.84741+00
5ce06102-bed8-422a-99c3-f840bfa6c536	792ab1a0-402e-49ab-829a-f1b004c71d13	904fe67e-8c34-49f9-ad76-3a0bc52e6277	2025-11-04 21:51:02.657238+00
bb842282-2c07-43da-a7d3-b4ef991c2130	b16a9091-9190-4eac-b7b2-6dad61dfcb57	6b046204-dea0-45e9-90ee-c35ff5d81ba5	2025-11-04 22:09:05.117314+00
\.


--
-- Data for Name: exam_answer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_answer (id, attempt_id, question_id, option_id, is_correct) FROM stdin;
4ce2ba35-ca76-42c2-a473-e345c2aa4692	ed39748c-7e45-4da9-af2f-1692e1253465	b15bfc00-bd4d-42da-8415-0c8261cdd2cb	712e3c44-477e-4d61-8eb5-2e8adfb1857d	t
0f6c6f24-602c-41e6-ad7c-5ad43ca6dfa8	ed39748c-7e45-4da9-af2f-1692e1253465	a914ba11-3320-4926-b67f-773bd8b016ea	06034d24-e4c0-4717-81c8-81e2a793c138	t
47c53785-242b-4406-8f17-12271fc875d3	fe6579cd-c045-4ad1-a8b4-0e556071cd09	a14b22b7-9351-401e-b7ea-70e26290ede2	6f27439a-03af-4d61-8c1f-eaa81dcaf48f	t
10da7b30-8bbc-4a2d-a04e-3c2d07f0fc35	fe6579cd-c045-4ad1-a8b4-0e556071cd09	530ccb0c-ac13-48d0-b302-859a9c9fba08	2852400f-a16e-4efe-88c4-0856e4b36020	t
d31b9a00-8c80-42f8-bdaa-fcfb30a24f1a	fe6579cd-c045-4ad1-a8b4-0e556071cd09	2a76585a-b73b-4720-9ff7-66a3d1e88c30	df0559a0-2045-4ade-a67b-fab2d93173dd	t
93adbe14-90a4-4b02-a047-bd5e6abf08fc	fe6579cd-c045-4ad1-a8b4-0e556071cd09	f94beda0-f482-4c33-a356-decf7e5cc89a	5521c6cb-f5cd-42ed-af6a-88a7f5af8c4b	t
833275b2-53c7-4c02-b234-978520498eba	fe6579cd-c045-4ad1-a8b4-0e556071cd09	fbbee43a-9a4c-4acd-9d55-6e20053f75b5	df8ec19c-c8ac-4637-8960-7ef301e69f66	f
46e610fc-a039-4389-ad8a-53ca728b48a0	d71d24d2-07a7-466b-834d-acd5c1d2fdba	fb490d05-f1d2-4c02-804c-dcdc9b6ea86a	8ea96a47-9ca5-4c97-912b-be1e796407cf	t
80f40213-d1fa-497f-999f-7a187cd4cb9a	d71d24d2-07a7-466b-834d-acd5c1d2fdba	ffbbf238-5a41-41af-a19b-34c475e6e2c3	90dd597d-f0c1-4b96-8eb0-fc7ba77ee566	t
6586dd8f-4b90-4d33-a668-346ffbb51ca6	d71d24d2-07a7-466b-834d-acd5c1d2fdba	482f3250-d58c-4f85-9562-c2a53e31fce8	82818e7e-e8d5-46f0-8932-43ba50bdc6db	t
0cfe6f50-0027-4115-8882-001149d18df8	d71d24d2-07a7-466b-834d-acd5c1d2fdba	4ab10741-af83-4976-8ea0-c0103e246c8f	fdf5a7d6-3ecc-4b23-b120-0e43cba8d5aa	t
50f7c372-4b02-4085-8273-7d267887a139	d71d24d2-07a7-466b-834d-acd5c1d2fdba	1beb82a9-9edd-4753-83e9-b7de7997af1e	29f10bc1-c780-447d-991e-9784d76185d1	t
6bd7b740-aea3-49d1-ba7e-9405ec6577e1	09d1523d-ced7-4869-880f-5cbf32a753c5	700ce9d4-d5dd-4f89-9028-de5ecbc5fd16	a07de4c3-a402-4cc9-80cb-c1cf5e9a9f9e	t
bd257728-93a2-4e27-9518-e52c47b38d9d	09d1523d-ced7-4869-880f-5cbf32a753c5	9912f379-4abf-4c52-b1dd-a6425ff52b0a	dd074d36-134b-47f9-930a-98b20647f40e	t
ecd938fd-8893-449d-8ad4-c910e4bf529c	09d1523d-ced7-4869-880f-5cbf32a753c5	0b109f7d-681f-4b8e-b257-b9e32d0cc04a	4325b2e4-ba98-4d5c-93ae-f8ff4db964a0	f
c95df2e0-f3f6-462d-9518-79f54249c2cd	09d1523d-ced7-4869-880f-5cbf32a753c5	33cf3c68-23cf-4ddf-8fa8-d7624fdf517b	b06c20fd-6a7f-4ad1-a0da-b096ecf71874	t
7bd169ef-ef91-45aa-895b-ee3299f7c110	09d1523d-ced7-4869-880f-5cbf32a753c5	2b85a863-7a92-464d-8f17-834c5485a497	256a13cb-ef33-42ee-80cc-8fd5bc997180	t
\.


--
-- Data for Name: exam_attempt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_attempt (id, user_id, quiz_id, content_id, score_percent, passed, created_at, submitted_at) FROM stdin;
ed39748c-7e45-4da9-af2f-1692e1253465	904fe67e-8c34-49f9-ad76-3a0bc52e6277	d1710b86-437d-4556-82fc-9c58b22795ba	3f7f7e5d-10b3-4b81-9852-838ba05f9fb0	100.00	t	2025-11-05 01:19:11.518733+00	2025-11-05 01:19:11.518733+00
fe6579cd-c045-4ad1-a8b4-0e556071cd09	904fe67e-8c34-49f9-ad76-3a0bc52e6277	3d4ca1bb-5df4-4169-a59e-7fa86abd441c	2d53534d-d0f9-4d3c-9116-9293f224df47	80.00	t	2025-11-05 01:20:29.434733+00	2025-11-05 01:20:29.434733+00
d71d24d2-07a7-466b-834d-acd5c1d2fdba	904fe67e-8c34-49f9-ad76-3a0bc52e6277	eff872a8-e56f-4602-9151-b663e7afc237	5487a40a-8723-4fe8-abcc-b788d2be85df	100.00	t	2025-11-05 19:54:07.238148+00	2025-11-05 19:54:07.238148+00
09d1523d-ced7-4869-880f-5cbf32a753c5	904fe67e-8c34-49f9-ad76-3a0bc52e6277	04f76f4c-9f00-4e2f-b844-10010ed6ca97	603a54a6-36b6-41a2-99b7-c87dd9ec2f85	80.00	t	2025-11-05 19:55:19.440977+00	2025-11-05 19:55:19.440977+00
\.


--
-- Data for Name: issued_certificate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.issued_certificate (id, template_id, course_id, user_id, issued_at, public_code, pdf_uri) FROM stdin;
\.


--
-- Data for Name: media_asset; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media_asset (id, content_id, source, uri, provider_meta, thumbnail_uri, duration_sec, created_at) FROM stdin;
199c9737-cb24-48c7-9a6f-743988b1e510	3f7f7e5d-10b3-4b81-9852-838ba05f9fb0	upload	/uploads/videos/1762199490298.mp4	\N	\N	0	2025-11-03 19:51:45.040126+00
7f6fece3-3530-40fb-a614-48a7f927d562	bfba1706-0324-43f5-87d5-8dfabc7b450f	upload	/uploads/videos/1762264151664.mp4	\N	\N	0	2025-11-04 13:49:17.48906+00
77567ed8-e186-4b42-a162-12f382ebb863	230811d5-8476-48b1-8c7f-b6d689d77f7f	upload	/uploads/videos/1762271911802.mp4	\N	\N	0	2025-11-04 15:58:33.646258+00
cf611e2c-27e2-405a-a721-5ab550b5065a	5487a40a-8723-4fe8-abcc-b788d2be85df	upload	/uploads/videos/1762293018164.mp4	\N	\N	0	2025-11-05 13:14:40.816276+00
\.


--
-- Data for Name: organization; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organization (id, name, domain, created_at) FROM stdin;
\.


--
-- Data for Name: progress_event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.progress_event (id, user_id, course_id, content_id, event_type, value, at) FROM stdin;
\.


--
-- Data for Name: quiz; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz (id, content_id, time_limit_sec, attempts_allowed, randomize_order) FROM stdin;
d1710b86-437d-4556-82fc-9c58b22795ba	3f7f7e5d-10b3-4b81-9852-838ba05f9fb0	\N	3	f
3d4ca1bb-5df4-4169-a59e-7fa86abd441c	2d53534d-d0f9-4d3c-9116-9293f224df47	\N	3	f
b4dcc73d-fecc-4fcc-afb9-ef29a3bbeaa7	af4d6809-6ff7-4efa-9a98-56857a7d7a09	\N	3	f
b3c390d4-cc18-4749-97b3-2436859f470a	230811d5-8476-48b1-8c7f-b6d689d77f7f	\N	3	f
aa71b014-2246-4489-89a1-57f00e271cd5	bfba1706-0324-43f5-87d5-8dfabc7b450f	\N	3	f
eff872a8-e56f-4602-9151-b663e7afc237	5487a40a-8723-4fe8-abcc-b788d2be85df	\N	3	f
04f76f4c-9f00-4e2f-b844-10010ed6ca97	603a54a6-36b6-41a2-99b7-c87dd9ec2f85	\N	3	f
\.


--
-- Data for Name: quiz_answer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_answer (id, attempt_id, question_id, selected_option_ids, free_text) FROM stdin;
\.


--
-- Data for Name: quiz_attempt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_attempt (id, quiz_id, user_id, started_at, completed_at, score, passed, attempt_no) FROM stdin;
\.


--
-- Data for Name: quiz_option; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_option (id, question_id, label, is_correct) FROM stdin;
2683981c-bc6f-418b-a588-db3cfbe13afe	b15bfc00-bd4d-42da-8415-0c8261cdd2cb	Iptables	f
42da8211-e35d-4dbf-ac9f-5d597ebbecdd	b15bfc00-bd4d-42da-8415-0c8261cdd2cb	estatus	f
e3014efb-0d97-413b-a0f0-f6cee90b4522	b15bfc00-bd4d-42da-8415-0c8261cdd2cb	firewall	f
712e3c44-477e-4d61-8eb5-2e8adfb1857d	b15bfc00-bd4d-42da-8415-0c8261cdd2cb	activar	t
6918d1ce-d0cb-403c-b682-fb5e711f6d23	a914ba11-3320-4926-b67f-773bd8b016ea	Verdadero	f
06034d24-e4c0-4717-81c8-81e2a793c138	a914ba11-3320-4926-b67f-773bd8b016ea	Falso	t
53f2cc7b-4ebd-4917-a979-1adf86c7400c	f94beda0-f482-4c33-a356-decf7e5cc89a	Primer	f
601babda-ebd3-49f6-8c51-600c13573442	f94beda0-f482-4c33-a356-decf7e5cc89a	Ejemplo	f
5521c6cb-f5cd-42ed-af6a-88a7f5af8c4b	f94beda0-f482-4c33-a356-decf7e5cc89a	Nginx	t
83d87c25-326d-4a1d-a4c0-11da853ea350	f94beda0-f482-4c33-a356-decf7e5cc89a	contenedor	f
166e30ad-536e-4953-b0d2-5630fd613105	530ccb0c-ac13-48d0-b302-859a9c9fba08	Creación	f
91051d10-86f3-40d8-994c-bb303b4e6d92	530ccb0c-ac13-48d0-b302-859a9c9fba08	Dockerfile	f
e247494f-bd13-4fea-808f-8e3ec3f29aac	530ccb0c-ac13-48d0-b302-859a9c9fba08	construir	f
2852400f-a16e-4efe-88c4-0856e4b36020	530ccb0c-ac13-48d0-b302-859a9c9fba08	imágenes	t
8fa88ebb-1604-4e89-8afe-d6b34a1e28c3	2a76585a-b73b-4720-9ff7-66a3d1e88c30	contenedores	f
df0559a0-2045-4ade-a67b-fab2d93173dd	2a76585a-b73b-4720-9ff7-66a3d1e88c30	Comandos	t
9e6e7829-0419-41b2-9665-8c2b2a586896	2a76585a-b73b-4720-9ff7-66a3d1e88c30	Gestión	f
129f252b-aeb7-48b3-916d-1fc3794cac9f	2a76585a-b73b-4720-9ff7-66a3d1e88c30	docker	f
d6674a21-4257-485f-ab37-f89e5b859715	fbbee43a-9a4c-4acd-9d55-6e20053f75b5	Creación	f
12995e21-7426-4ec9-8098-f194bfc308d9	fbbee43a-9a4c-4acd-9d55-6e20053f75b5	create	t
51262579-e385-4fa8-b024-38753bda6e71	fbbee43a-9a4c-4acd-9d55-6e20053f75b5	comunicación	f
df8ec19c-c8ac-4637-8960-7ef301e69f66	fbbee43a-9a4c-4acd-9d55-6e20053f75b5	Redes	f
6f27439a-03af-4d61-8c1f-eaa81dcaf48f	a14b22b7-9351-401e-b7ea-70e26290ede2	adicionales	t
b4f42fbb-8b34-4416-8b01-602dad510ad0	a14b22b7-9351-401e-b7ea-70e26290ede2	Conceptos	f
91dc2d0c-f77b-4966-a9eb-840245665aff	a14b22b7-9351-401e-b7ea-70e26290ede2	Docker	f
fe53432e-95ad-4c27-a6d9-da06036cd32c	a14b22b7-9351-401e-b7ea-70e26290ede2	Docker	f
f17544f4-9087-42aa-836d-00df64320d6f	c04a3498-414b-4a0b-b4a4-deef1068bbbb	instrucciones	t
2ca3cb5c-6afa-48d0-80ea-3f94a7a84293	c04a3498-414b-4a0b-b4a4-deef1068bbbb	lenguaje	f
0c22abab-9597-4458-a2af-3898f58e72c9	c04a3498-414b-4a0b-b4a4-deef1068bbbb	conjunto	f
4489f8c8-d4df-4972-b7ee-cd5508d8a395	c04a3498-414b-4a0b-b4a4-deef1068bbbb	programación	f
1048b7b0-32d6-4fb1-a9a0-569f8469fa31	b271eb66-1c9d-4e50-9d08-10d6ee77676c	lenguajes	f
1a573a73-3b8f-4f4a-b7e0-9933c2158f99	b271eb66-1c9d-4e50-9d08-10d6ee77676c	Otros	f
b6920bbd-bbd3-46fa-bc6e-541be8523ad7	b271eb66-1c9d-4e50-9d08-10d6ee77676c	JavaScript	t
038ab6d6-66bb-4ed7-bb82-e835e0d8afa7	b271eb66-1c9d-4e50-9d08-10d6ee77676c	están	f
64ee0563-c298-48fd-a087-52de3d4e4e9f	6e66807a-f2a3-4f60-b8e6-dccc3683ec34	misma	t
6943ee43-bde7-4297-abca-4cea46a0b17f	6e66807a-f2a3-4f60-b8e6-dccc3683ec34	sintaxis	f
c59e2e2d-93b5-4ba7-ba78-375fd49c53b7	6e66807a-f2a3-4f60-b8e6-dccc3683ec34	cambia	f
3b4368df-2e1d-4e85-8200-29ce50370f4f	6e66807a-f2a3-4f60-b8e6-dccc3683ec34	Aunque	f
7d7e909d-1d77-46e7-ac0a-398559106cd1	dccec4b0-df99-44c2-a6d8-ef36da000a4f	diseñado	f
7393a809-6547-4bfd-9f1f-3101e5ae140c	dccec4b0-df99-44c2-a6d8-ef36da000a4f	ciertos	f
2afd7122-f1b5-4dee-8e05-282a7bd5e856	dccec4b0-df99-44c2-a6d8-ef36da000a4f	lenguaje	f
0bbf8268-e28f-4f3c-b352-f97a3483ebe0	dccec4b0-df99-44c2-a6d8-ef36da000a4f	caracteriza	t
f031acbd-3b12-4b93-b988-c9c4352e3106	f3d71597-3a36-44f2-a1cb-d4e4208c6c51	Java	f
d6dc3327-30c0-42cf-bc76-fd951668324d	f3d71597-3a36-44f2-a1cb-d4e4208c6c51	Lenguajes	f
bd3d7232-cc96-4f84-a8da-caf8473edbe6	f3d71597-3a36-44f2-a1cb-d4e4208c6c51	suelen	f
3c8a0363-641d-4be5-82c2-77b7c5750464	f3d71597-3a36-44f2-a1cb-d4e4208c6c51	empresariales	t
0ab12bfa-717c-4b68-92b8-952cabe143e6	e1c737c1-cdba-4a77-b3a0-e494bad4500e	escribo	f
9a7411d8-1bce-4476-ad1c-51809ef949f0	e1c737c1-cdba-4a77-b3a0-e494bad4500e	suficientemente	t
7ce13de5-69ba-46e1-91ff-fcb5fce2fd5b	e1c737c1-cdba-4a77-b3a0-e494bad4500e	tenga	f
0ff43da7-23f5-40cf-ab3f-89999deedfb5	e1c737c1-cdba-4a77-b3a0-e494bad4500e	largo	f
850feefd-bbc4-4775-b83c-f5459fdfdeec	75297324-e025-4add-9575-da9bae57003d	prueba	f
bf3df3b8-8550-4c03-9d0a-0166f4adec04	75297324-e025-4add-9575-da9bae57003d	texto	f
93781970-e94e-4a24-b033-3ccfd4159148	75297324-e025-4add-9575-da9bae57003d	bases	f
6872e8e3-c344-4478-af84-787c71f25499	75297324-e025-4add-9575-da9bae57003d	consultas	t
3bf57f30-434b-4c0c-99a8-2f5d375b6575	df8516ea-cd6e-494f-8fe4-ae41e0c46bae	Verdadero	f
0d7b4b57-2997-4ac2-a472-56711f300187	df8516ea-cd6e-494f-8fe4-ae41e0c46bae	Falso	t
3a907f7b-f14e-413c-a28e-3bf4824cd130	33b7e831-89e9-4f22-bcbf-65d1fabab49f	Verdadero	f
45a5dbb4-250f-488b-92e3-a100fffbb21a	33b7e831-89e9-4f22-bcbf-65d1fabab49f	Falso	t
e42ca2f4-f3a2-4a5d-b846-b36b1eee778a	eb97d3b8-6926-46bf-9175-9829cda51fc4	bases	f
d0360610-6bbe-453e-ac3a-8a02702ef486	eb97d3b8-6926-46bf-9175-9829cda51fc4	MySQL	t
f887100d-e785-461f-b8f1-4a83f3edf5be	eb97d3b8-6926-46bf-9175-9829cda51fc4	datos	f
85f08acb-9810-49f9-bfa9-ddbbff81a596	eb97d3b8-6926-46bf-9175-9829cda51fc4	Existen	f
bfb37df7-22c2-4e4a-9c1a-36a22a0e8170	53413616-1153-47ef-8d22-ad387eff5239	aplicaciones	t
25debd0e-cba7-4089-b6cc-8979a88f25ae	53413616-1153-47ef-8d22-ad387eff5239	datos	f
71d51d56-2ebb-44cf-9f16-09be201ddf94	53413616-1153-47ef-8d22-ad387eff5239	base	f
596130a7-95b3-4348-b531-fef890fbe80c	53413616-1153-47ef-8d22-ad387eff5239	mayoría	f
180cf0f4-87d1-487a-8735-f2dca29c303e	387730c5-0652-49d0-8585-59a37a521ece	conjunto	f
27f655d5-ea61-420f-a09e-4ae7516bdadb	387730c5-0652-49d0-8585-59a37a521ece	información	t
d25d04cf-cfe7-47b6-b8c4-a24d3c33aa46	387730c5-0652-49d0-8585-59a37a521ece	datos	f
31e56797-4349-4767-b185-f10c0176c575	387730c5-0652-49d0-8585-59a37a521ece	bases	f
3289caa5-a6a9-4da7-a3fb-bc1a40f97513	76fc49d6-9d20-4a30-a311-8991850c099a	contactos	t
a3f1e14d-4677-40a0-a9a5-00cd76d18410	76fc49d6-9d20-4a30-a311-8991850c099a	línea	f
cd13f893-5d0e-4889-8f0f-6f8185a386de	76fc49d6-9d20-4a30-a311-8991850c099a	entras	f
e4343162-8f6a-4e08-98fd-94a400db141b	76fc49d6-9d20-4a30-a311-8991850c099a	banco	f
8d4a75cf-9a24-4b3a-9c7f-52d5c23043cd	4c7dbc6f-719c-4431-af1d-bbc90a5035cb	base	f
e6a48714-c809-40e4-95da-c25fc433ca75	4c7dbc6f-719c-4431-af1d-bbc90a5035cb	datos	f
b733fbfe-0dd9-498a-bfea-30315227048d	4c7dbc6f-719c-4431-af1d-bbc90a5035cb	información	t
d5de90bb-60d2-4a7e-854c-c77335a6fc5e	4c7dbc6f-719c-4431-af1d-bbc90a5035cb	importante	f
29f10bc1-c780-447d-991e-9784d76185d1	1beb82a9-9edd-4753-83e9-b7de7997af1e	Finalmente	t
b9825523-9866-47a8-ac74-d1920eeebccd	1beb82a9-9edd-4753-83e9-b7de7997af1e	ciclo	f
a0f21f8f-3a4a-4903-a374-2b06d64610b1	1beb82a9-9edd-4753-83e9-b7de7997af1e	vida	f
bb6d8335-4b7f-4eff-90a8-c331afe49400	1beb82a9-9edd-4753-83e9-b7de7997af1e	componentes	f
b886f076-77ab-4a51-bb2a-ec65073eebe6	482f3250-d58c-4f85-9562-c2a53e31fce8	estado	f
ef15a99e-a97b-4fd5-b88c-cb61f5644ae3	482f3250-d58c-4f85-9562-c2a53e31fce8	utiliza	f
82818e7e-e8d5-46f0-8932-43ba50bdc6db	482f3250-d58c-4f85-9562-c2a53e31fce8	propiedad	t
2d6e156b-9e40-42a9-8627-17659497ddc0	482f3250-d58c-4f85-9562-c2a53e31fce8	También	f
b036e959-7e75-4abc-b346-e899014139aa	fb490d05-f1d2-4c02-804c-dcdc9b6ea86a	clave	f
2419e73d-de5a-4065-8014-ac7ce9ffde80	fb490d05-f1d2-4c02-804c-dcdc9b6ea86a	concepto	f
8ea96a47-9ca5-4c97-912b-be1e796407cf	fb490d05-f1d2-4c02-804c-dcdc9b6ea86a	actualizando	t
e5728c4f-3034-4e5a-b869-88ce830bf68c	fb490d05-f1d2-4c02-804c-dcdc9b6ea86a	Otro	f
33796df0-b33b-4024-b496-663462a22bfa	ffbbf238-5a41-41af-a19b-34c475e6e2c3	React	f
7813e1d7-4598-4091-994f-a84e025d62c9	ffbbf238-5a41-41af-a19b-34c475e6e2c3	biblioteca	f
90dd597d-f0c1-4b96-8eb0-fc7ba77ee566	ffbbf238-5a41-41af-a19b-34c475e6e2c3	interfaces	t
e396f723-1576-44e1-b5ad-788761ac15cb	ffbbf238-5a41-41af-a19b-34c475e6e2c3	llaves	f
fdf5a7d6-3ecc-4b23-b120-0e43cba8d5aa	4ab10741-af83-4976-8ea0-c0103e246c8f	conceptos	t
9fc510c5-a7cc-408d-8f52-d34211ddfe6a	4ab10741-af83-4976-8ea0-c0103e246c8f	componentes	f
edba184e-1fd8-4324-9952-b54bb9b8d57a	4ab10741-af83-4976-8ea0-c0103e246c8f	principales	f
dd4ac851-fda3-46b6-963f-f740d0427053	4ab10741-af83-4976-8ea0-c0103e246c8f	permiten	f
c3400b3e-8d24-4c4e-9f02-8bb55aae1014	0b109f7d-681f-4b8e-b257-b9e32d0cc04a	estado	t
f60d1117-d3da-4f5b-8e0e-6b19d729a7f8	0b109f7d-681f-4b8e-b257-b9e32d0cc04a	utiliza	f
4f02344c-9779-4bc1-b3b5-e5a104380d5a	0b109f7d-681f-4b8e-b257-b9e32d0cc04a	También	f
4325b2e4-ba98-4d5c-93ae-f8ff4db964a0	0b109f7d-681f-4b8e-b257-b9e32d0cc04a	state	f
d0c4602f-f610-486b-9af8-6682a896094a	33cf3c68-23cf-4ddf-8fa8-d7624fdf517b	conceptos	f
b06c20fd-6a7f-4ad1-a0da-b096ecf71874	33cf3c68-23cf-4ddf-8fa8-d7624fdf517b	dividir	t
3c687dfb-59a1-410c-bf4f-1805c3fa55d9	33cf3c68-23cf-4ddf-8fa8-d7624fdf517b	componentes	f
07d52a3d-9ca3-4976-9706-fc30a0bcc352	33cf3c68-23cf-4ddf-8fa8-d7624fdf517b	principales	f
256a13cb-ef33-42ee-80cc-8fd5bc997180	2b85a863-7a92-464d-8f17-834c5485a497	Finalmente	t
37ff258d-7500-4257-87a5-fb1ab9a8500c	2b85a863-7a92-464d-8f17-834c5485a497	ciclo	f
05387cff-e1a3-446a-a64a-dc18bd432266	2b85a863-7a92-464d-8f17-834c5485a497	componentes	f
8e8dba10-06dc-49da-8d27-7cdd95a13c83	2b85a863-7a92-464d-8f17-834c5485a497	vida	f
053175c9-11cc-4f34-83f1-2eb023e6e553	9912f379-4abf-4c52-b1dd-a6425ff52b0a	virtual	f
dd074d36-134b-47f9-930a-98b20647f40e	9912f379-4abf-4c52-b1dd-a6425ff52b0a	concepto	t
cc3935cf-94b8-4a00-8851-8267f6a4b8e2	9912f379-4abf-4c52-b1dd-a6425ff52b0a	clave	f
31a31604-fb0c-4da1-a69f-77a232385ebb	9912f379-4abf-4c52-b1dd-a6425ff52b0a	Otro	f
a07de4c3-a402-4cc9-80cb-c1cf5e9a9f9e	700ce9d4-d5dd-4f89-9028-de5ecbc5fd16	Facebook	t
ba5774aa-bed8-46e2-b8de-2c85e924a7b0	700ce9d4-d5dd-4f89-9028-de5ecbc5fd16	React	f
742d1972-0edf-47d5-bc4d-a9a939753436	700ce9d4-d5dd-4f89-9028-de5ecbc5fd16	Reac	f
1eb2ab0d-4c07-44f5-b861-b0e1337570ad	700ce9d4-d5dd-4f89-9028-de5ecbc5fd16	Introducción	f
\.


--
-- Data for Name: quiz_question; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_question (id, quiz_id, prompt, question_type, points) FROM stdin;
b15bfc00-bd4d-42da-8415-0c8261cdd2cb	d1710b86-437d-4556-82fc-9c58b22795ba	6-\tIptables -L\nEs para ver el estatus de los firewall de seguridad se pueden deshabilitar con iptables off y ____ con iptables on\n\n7-\tcat /etc/passwd\nEs para ver los usuarios y a qué tienen accesos\n\n8-\tcd /etc/yum.repos.d/\nTe muestra los repositorios que están en tu Linux\n\n9-\treboot\npara reiniciar el servidor\n\n10-\tdf -h\nEs para ver los puntos de montaje, tamaño de disco, ram usados, etc\n\nTodos estos son comandos Linux	single_choice	1.00
a914ba11-3320-4926-b67f-773bd8b016ea	d1710b86-437d-4556-82fc-9c58b22795ba	Según el documento, es correcto que: "6- Iptables -L Es para ver el estatus de los firewall de seguridad se pueden deshabilitar con iptables off y activar con iptables on 7- cat "	single_choice	1.00
f94beda0-f482-4c33-a356-decf7e5cc89a	3d4ca1bb-5df4-4169-a59e-7fa86abd441c	Primer contenedor\nEjemplo con ____ usando docker run -p 8080:80 nginx.	single_choice	1.00
530ccb0c-ac13-48d0-b302-859a9c9fba08	3d4ca1bb-5df4-4169-a59e-7fa86abd441c	Creación de ____\nUso del Dockerfile para construir imágenes personalizadas.	single_choice	1.00
2a76585a-b73b-4720-9ff7-66a3d1e88c30	3d4ca1bb-5df4-4169-a59e-7fa86abd441c	Gestión de contenedores\n____ docker ps, stop y rm para controlar procesos.	single_choice	1.00
fbbee43a-9a4c-4acd-9d55-6e20053f75b5	3d4ca1bb-5df4-4169-a59e-7fa86abd441c	Redes y comunicación\nCreación de redes con docker network ____ y conexión entre contenedores.	single_choice	1.00
a14b22b7-9351-401e-b7ea-70e26290ede2	3d4ca1bb-5df4-4169-a59e-7fa86abd441c	Conceptos ____ de Docker:\n\nDocker logs\n\nDocker exec\n\nDocker inspect\n\nEntrypoint override\n\nOverlay networks\n\nDocker swarm\n\nContextos remotos\n\nSecretos en Compose\n\nVariables de entorno\n\nDocker Desktop	single_choice	1.00
c04a3498-414b-4a0b-b4a4-deef1068bbbb	b4dcc73d-fecc-4fcc-afb9-ef29a3bbeaa7	Un lenguaje de programación es un conjunto de reglas y símbolos que permiten darle \n____ precisas a una computadora.	single_choice	1.00
b271eb66-1c9d-4e50-9d08-10d6ee77676c	b4dcc73d-fecc-4fcc-afb9-ef29a3bbeaa7	Otros lenguajes, com o ____, están pensados para dar vida a \nlas páginas web y permitir que el usuario interactúe con ellas.	single_choice	1.00
6e66807a-f2a3-4f60-b8e6-dccc3683ec34	b4dcc73d-fecc-4fcc-afb9-ef29a3bbeaa7	Aunque la sintaxis cambia de un \nlenguaje a otro, todos comparten la ____ idea: traducir la lógica de un ser humano a \ninstrucciones que una máquina  pueda ejecutar de manera confiable y repetible.	single_choice	1.00
dccec4b0-df99-44c2-a6d8-ef36da000a4f	b4dcc73d-fecc-4fcc-afb9-ef29a3bbeaa7	Cada lenguaje fue diseñado con ciertos objetivos en \nmente: por ejemplo, Python se ____ por ser sencillo de leer y escribir, lo que lo hace ideal \npara quienes están comenzando o para tareas de análisis de datos.	single_choice	1.00
f3d71597-3a36-44f2-a1cb-d4e4208c6c51	b4dcc73d-fecc-4fcc-afb9-ef29a3bbeaa7	Lenguajes como Java o C# \nsuelen utilizarse en aplicaciones ____ de gran tamaño, donde se necesita estructura y \nmantenimiento a largo plazo.	single_choice	1.00
e1c737c1-cdba-4a77-b3a0-e494bad4500e	b3c390d4-cc18-4749-97b3-2436859f470a	Lo escribo ____ largo para que tenga más de cincuenta caracteres...	single_choice	1.00
75297324-e025-4add-9575-da9bae57003d	b3c390d4-cc18-4749-97b3-2436859f470a	Este es un texto de prueba sobre bases de datos, tablas, índices y ____ SQL.	single_choice	1.00
df8516ea-cd6e-494f-8fe4-ae41e0c46bae	b3c390d4-cc18-4749-97b3-2436859f470a	Según el documento, es correcto que: "Lo escribo suficientemente largo para que tenga más de cincuenta caracteres..."	single_choice	1.00
33b7e831-89e9-4f22-bcbf-65d1fabab49f	b3c390d4-cc18-4749-97b3-2436859f470a	Según el documento, es correcto que: "Este es un texto de prueba sobre bases de datos, tablas, índices y consultas SQL."	single_choice	1.00
eb97d3b8-6926-46bf-9175-9829cda51fc4	aa71b014-2246-4489-89a1-57f00e271cd5	Existen bases de datos relacionales, como POSGRE o ____, que organizan la información en tablas con filas y coluna y otras relacionales como MOGOEB, que son más flexibles con la estructura de los datos.	single_choice	1.00
53413616-1153-47ef-8d22-ad387eff5239	aa71b014-2246-4489-89a1-57f00e271cd5	Sin base de datos, la mayoría de las ____ modernas simplemente no podrían funcionar.	single_choice	1.00
387730c5-0652-49d0-8585-59a37a521ece	aa71b014-2246-4489-89a1-57f00e271cd5	Una de las bases de datos es un conjunto organizado de ____ que podemos guardar, consultar y actualizar de forma eficiente.	single_choice	1.00
76fc49d6-9d20-4a30-a311-8991850c099a	aa71b014-2246-4489-89a1-57f00e271cd5	Cuando entras en tu banco en línea, cuando ves tus ____ en el celular o cuando revisas tu mensaje, detrás hay una base de datos trabajando.	single_choice	1.00
4c7dbc6f-719c-4431-af1d-bbc90a5035cb	aa71b014-2246-4489-89a1-57f00e271cd5	Lo importante es que una base de datos nos permite mantener ____ segura, consistente y disponible para muchas personas al mismo tiempo.	single_choice	1.00
1beb82a9-9edd-4753-83e9-b7de7997af1e	eff872a8-e56f-4602-9151-b663e7afc237	____ el ciclo de vida de los componentes define cómo se montan, actualizan y eliminan dentro de la aplicación.	single_choice	1.00
482f3250-d58c-4f85-9562-c2a53e31fce8	eff872a8-e56f-4602-9151-b663e7afc237	También utiliza el estado state para manejar datos dinámicos y la ____ de props para comunicar información entre componentes.	single_choice	1.00
fb490d05-f1d2-4c02-804c-dcdc9b6ea86a	eff872a8-e56f-4602-9151-b663e7afc237	Otro concepto clave es el DOM virtual que mejora el rendimiento ____ solo los elementos necesarios.	single_choice	1.00
ffbbf238-5a41-41af-a19b-34c475e6e2c3	eff872a8-e56f-4602-9151-b663e7afc237	React es una biblioteca de llaves crides desarrollada por Facebook para construir ____ de usuario.	single_choice	1.00
4ab10741-af83-4976-8ea0-c0103e246c8f	eff872a8-e56f-4602-9151-b663e7afc237	Uno de sus ____ principales son los componentes que permiten dividir la aplicación en partes reutilizables.	single_choice	1.00
0b109f7d-681f-4b8e-b257-b9e32d0cc04a	04f76f4c-9f00-4e2f-b844-10010ed6ca97	También utiliza el ____ (state)  para manejar datos \ndinámicos, y las propiedades (props)  para comunicar información entre componentes.	single_choice	1.00
33cf3c68-23cf-4ddf-8fa8-d7624fdf517b	04f76f4c-9f00-4e2f-b844-10010ed6ca97	Uno de sus conceptos principales son los componentes , que permiten ____ la \naplicación en partes reutilizables.	single_choice	1.00
2b85a863-7a92-464d-8f17-834c5485a497	04f76f4c-9f00-4e2f-b844-10010ed6ca97	____, el ciclo de vida de los componentes  define cómo se montan, actualizan \ny eliminan dentro de la aplicación.	single_choice	1.00
9912f379-4abf-4c52-b1dd-a6425ff52b0a	04f76f4c-9f00-4e2f-b844-10010ed6ca97	Otro \n____ clave es el DOM virtual , que mejora el rendimiento actualizando solo los elementos \nnecesarios.	single_choice	1.00
700ce9d4-d5dd-4f89-9028-de5ecbc5fd16	04f76f4c-9f00-4e2f-b844-10010ed6ca97	Introducción  a Reac t \nReact es una biblioteca de JavaScript desarrollada por ____ para construir interfaces de \nusuario.	single_choice	1.00
\.


--
-- Data for Name: rating; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rating (id, course_id, user_id, score, comment, created_at) FROM stdin;
\.


--
-- Data for Name: user_account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_account (id, org_id, email, password_hash, first_name, last_name, phone, avatar_path, is_active, created_at, updated_at, role, username, avatar_uri, password) FROM stdin;
69a3fdd0-8d2d-4fd3-baab-e4909478ea7e	\N	estudiante3@demo.com	1234	Estudiante	3	\N	\N	t	2025-11-01 21:37:30.43019+00	2025-11-01 21:37:30.43019+00	student	estudiante3	/uploads/avatars/default.png	\N
73f728be-ae8b-4273-ac57-f78f781d9e5e	\N	estudiante@demo.com	1234	Estudiante	de curso	\N	\N	t	2025-11-03 04:53:17.112904+00	2025-11-03 07:29:26.545473+00	student	estudiante	/uploads/avatars/default.png	\N
258f5ce3-55fd-4107-8a9c-41ca5ea0dd0f	\N	profesor1@demo.com	1234	profesor	de Curso 1	\N	\N	t	2025-11-03 17:00:20.904842+00	2025-11-03 17:09:45.573624+00	professor	profesor1	/uploads/avatars/default.png	\N
dfe4ae2b-28e3-45c4-a12e-26be6066ab5e	\N	estudiante1@demo.com	1234	Estudiante	1	\N	\N	t	2025-11-03 17:42:39.603243+00	2025-11-03 17:42:39.603243+00	student	estudiante1	/uploads/avatars/default.png	\N
2c8447e1-dfa3-465c-9bdf-39c0ce622015	\N	estudiante2@demo.com	1234	Estudiante	2	\N	\N	t	2025-11-03 17:43:12.270664+00	2025-11-03 17:43:12.270664+00	student	estudiante2	/uploads/avatars/default.png	\N
904fe67e-8c34-49f9-ad76-3a0bc52e6277	\N	estudiante4@demo.com	1234	Estudiante	4	\N	\N	t	2025-11-03 17:43:40.730767+00	2025-11-03 17:43:40.730767+00	student	estudiante4	/uploads/avatars/default.png	\N
6b046204-dea0-45e9-90ee-c35ff5d81ba5	\N	admin@demo.com	1234	Administrador	del Sistema	\N	\N	t	2025-11-01 23:17:19.090654+00	2025-11-05 06:05:29.376147+00	superadmin	admin	/uploads/avatars/default.png	\N
e047ad6a-24e8-4180-8633-bb3084555829	\N	profesor@demo.com	1234	Profesor	de Curso 3	\N	\N	t	2025-11-02 00:35:39.337183+00	2025-11-05 13:42:00.853348+00	professor	profesor	/uploads/avatars/default.png	\N
\.


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


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
-- Name: course_certificate course_certificate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_certificate
    ADD CONSTRAINT course_certificate_pkey PRIMARY KEY (id);


--
-- Name: course_certificate course_certificate_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_certificate
    ADD CONSTRAINT course_certificate_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: course course_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course
    ADD CONSTRAINT course_pkey PRIMARY KEY (id);


--
-- Name: course_progress course_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_progress
    ADD CONSTRAINT course_progress_pkey PRIMARY KEY (id);


--
-- Name: course_progress course_progress_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_progress
    ADD CONSTRAINT course_progress_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: course_rating course_rating_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_rating
    ADD CONSTRAINT course_rating_pkey PRIMARY KEY (id);


--
-- Name: course_rating course_rating_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_rating
    ADD CONSTRAINT course_rating_user_id_course_id_key UNIQUE (user_id, course_id);


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
-- Name: exam_answer exam_answer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_answer
    ADD CONSTRAINT exam_answer_pkey PRIMARY KEY (id);


--
-- Name: exam_attempt exam_attempt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_attempt
    ADD CONSTRAINT exam_attempt_pkey PRIMARY KEY (id);


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
-- Name: idx_exam_answer_attempt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exam_answer_attempt ON public.exam_answer USING btree (attempt_id);


--
-- Name: idx_exam_attempt_user_content; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exam_attempt_user_content ON public.exam_attempt USING btree (user_id, content_id);


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
-- Name: ux_user_account_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_user_account_email ON public.user_account USING btree (email);


--
-- Name: ux_user_account_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_user_account_username ON public.user_account USING btree (username);


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
-- Name: course_certificate course_certificate_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_certificate
    ADD CONSTRAINT course_certificate_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempt(id) ON DELETE CASCADE;


--
-- Name: course_certificate course_certificate_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_certificate
    ADD CONSTRAINT course_certificate_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: course_certificate course_certificate_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_certificate
    ADD CONSTRAINT course_certificate_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


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
-- Name: course_progress course_progress_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_progress
    ADD CONSTRAINT course_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: course_progress course_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_progress
    ADD CONSTRAINT course_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


--
-- Name: course_rating course_rating_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_rating
    ADD CONSTRAINT course_rating_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(id) ON DELETE CASCADE;


--
-- Name: course_rating course_rating_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_rating
    ADD CONSTRAINT course_rating_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


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
-- Name: exam_answer exam_answer_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_answer
    ADD CONSTRAINT exam_answer_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempt(id) ON DELETE CASCADE;


--
-- Name: exam_answer exam_answer_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_answer
    ADD CONSTRAINT exam_answer_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.quiz_option(id) ON DELETE CASCADE;


--
-- Name: exam_answer exam_answer_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_answer
    ADD CONSTRAINT exam_answer_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_question(id) ON DELETE CASCADE;


--
-- Name: exam_attempt exam_attempt_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_attempt
    ADD CONSTRAINT exam_attempt_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_item(id) ON DELETE CASCADE;


--
-- Name: exam_attempt exam_attempt_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_attempt
    ADD CONSTRAINT exam_attempt_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE;


--
-- Name: exam_attempt exam_attempt_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_attempt
    ADD CONSTRAINT exam_attempt_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id) ON DELETE CASCADE;


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

\unrestrict fzT9ZpwXHmA2HlHUJaWZBIyX24QtBcEkEPGKdyjyN9PO345aQHy8GwqIjYi6sE8

