# backend_eval/repositories/exam_repo.py
import os
import uuid
from typing import List, Dict

import asyncpg

# ==========================================================
# CONFIGURACIÓN DE CONEXIÓN A POSTGRES
# ==========================================================
# Prioridad:
#   1) EVAL_DB_DSN
#   2) DATABASE_URL
#   3) Construido desde DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASS
#
# En Docker:
#   DB_HOST = db
#   DB_PORT = 5432
#   DB_NAME = guidesphere
#   DB_USER = postgres
#   DB_PASS = postgres
# ==========================================================

DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "guidesphere")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")

DEFAULT_DSN = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

DB_DSN = os.getenv(
    "EVAL_DB_DSN",
    os.getenv("DATABASE_URL", DEFAULT_DSN),
)


async def _get_conn():
    """Crea una conexión nueva a PostgreSQL usando asyncpg."""
    return await asyncpg.connect(dsn=DB_DSN)


# ==========================================================
# FUNCIÓN PRINCIPAL: GUARDAR QUIZ GENERADO
# ==========================================================
async def save_generated_quiz(
    *,
    source_doc_id: str,
    title: str,
    questions: List[Dict],
    fingerprint: str | None,
    content_id: str,  # ← llega desde el frontend y debe existir en content_item
) -> str:
    """
    Crea (o reemplaza) el quiz asociado a content_id con las preguntas generadas.
    NO crea content_item; exige que content_id exista en content_item.
    """
    quiz_id = str(uuid.uuid4())
    conn = await _get_conn()

    try:
        # 0) Validar que el content_id exista
        exists = await conn.fetchval(
            "SELECT 1 FROM content_item WHERE id = $1",
            content_id,
        )
        if not exists:
            raise RuntimeError(f"content_id inexistente: {content_id}")

        # 1) Si ya hay un quiz para ese content_id, reemplazarlo
        prev_quiz_id = await conn.fetchval(
            "SELECT id FROM quiz WHERE content_id = $1",
            content_id,
        )
        if prev_quiz_id:
            await conn.execute(
                "DELETE FROM quiz WHERE id = $1",
                prev_quiz_id,
            )

        # 2) Crear el nuevo quiz
        await conn.execute(
            """
            INSERT INTO quiz (id, content_id, time_limit_sec, attempts_allowed, randomize_order)
            VALUES ($1, $2, NULL, 3, FALSE)
            """,
            quiz_id,
            content_id,
        )

        # 3) Insertar preguntas y opciones
        for q in (questions or []):
            q_id = str(uuid.uuid4())
            await conn.execute(
                "INSERT INTO quiz_question (id, quiz_id, prompt) VALUES ($1, $2, $3)",
                q_id,
                quiz_id,
                q.get("prompt", "") or "",
            )

            for opt in q.get("options", []):
                o_id = str(uuid.uuid4())
                await conn.execute(
                    """
                    INSERT INTO quiz_option (id, question_id, label, is_correct)
                    VALUES ($1, $2, $3, $4)
                    """,
                    o_id,
                    q_id,
                    (opt.get("label") or opt.get("text") or ""),
                    bool(opt.get("is_correct")),
                )

        return quiz_id

    finally:
        await conn.close()
