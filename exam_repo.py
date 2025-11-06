import uuid, asyncpg
from typing import List, Dict
DB_DSN = "postgresql://postgres:postgres@db:5432/guidesphere"
async def _get_conn(): return await asyncpg.connect(dsn=DB_DSN)
async def save_generated_quiz(source_doc_id: str, title: str, questions: List[Dict], fingerprint: str) -> str:
    conn = await _get_conn()
    try:
        course_id = await conn.fetchval("SELECT id FROM course LIMIT 1")
        if not course_id: raise RuntimeError("No hay cursos para asociar el quiz.")
        ci_title = f"Doc {source_doc_id}"
        content_id = await conn.fetchval("SELECT id FROM content_item WHERE title = $1 LIMIT 1", ci_title)
        if not content_id:
            content_id = str(uuid.uuid4())
            await conn.execute("""
                INSERT INTO content_item
                  (id, course_id, section_id, type, title, description, position, duration_sec, created_by, created_at)
                VALUES ($1, $2, NULL, 'document', $3, '', 1, NULL, NULL, NOW());
            """, content_id, course_id, ci_title)
        new_quiz_id = str(uuid.uuid4())
        quiz_id = await conn.fetchval("""
            INSERT INTO quiz (id, content_id, time_limit_sec, attempts_allowed, randomize_order)
            VALUES ($1, $2, NULL, 3, FALSE)
            ON CONFLICT (content_id) DO UPDATE
            SET time_limit_sec = EXCLUDED.time_limit_sec,
                attempts_allowed = EXCLUDED.attempts_allowed,
                randomize_order = EXCLUDED.randomize_order
            RETURNING id;
        """, new_quiz_id, content_id)
        await conn.execute("""DELETE FROM quiz_option WHERE question_id IN (SELECT id FROM quiz_question WHERE quiz_id = $1)""", quiz_id)
        await conn.execute("DELETE FROM quiz_question WHERE quiz_id = $1", quiz_id)
        for q in (questions or []):
            q_id = str(uuid.uuid4())
            await conn.execute("INSERT INTO quiz_question (id, quiz_id, prompt) VALUES ($1, $2, $3);", q_id, quiz_id, q.get("prompt",""))
            for opt in q.get("options", []):
                o_id = str(uuid.uuid4())
                await conn.execute("""INSERT INTO quiz_option (id, question_id, label, is_correct) VALUES ($1,$2,$3,$4);""",
                                   o_id, q_id, (opt.get("label") or opt.get("text") or ""), bool(opt.get("is_correct")))
        return quiz_id
    finally:
        await conn.close()
