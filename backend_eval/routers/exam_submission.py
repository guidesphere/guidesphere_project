# backend_eval/routers/exam_submission.py

from __future__ import annotations

from typing import List, Optional, Dict

import asyncpg
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import uuid

from repositories.exam_repo import DB_DSN

router = APIRouter()

PASS_THRESHOLD = 60.0  # porcentaje mínimo para aprobar


# =============================
#  Modelos de entrada / salida
# =============================

class SubmittedAnswer(BaseModel):
    question_id: str
    option_id: str


class SubmitExamRequest(BaseModel):
    content_id: str
    quiz_id: str
    answers: List[SubmittedAnswer]


class SubmitExamResponse(BaseModel):
    ok: bool
    attempt_id: str
    score_percent: float
    passed: bool


# =============================
#  Helpers opcionales (certificado)
# =============================

async def _table_exists(conn: asyncpg.Connection, table_name: str) -> bool:
    """
    Verifica si existe una tabla en el esquema public.
    Usamos to_regclass para no romper si no existe.
    """
    row = await conn.fetchrow(
        "SELECT to_regclass($1) AS oid",
        f"public.{table_name}",
    )
    return bool(row and row["oid"])


async def _maybe_issue_certificate(
    conn: asyncpg.Connection,
    *,
    user_id: str,
    content_id: str,
    attempt_id: str,
    score_percent: float,
) -> None:
    """
    Si existe la tabla course_certificate y el usuario aprobó, genera
    un registro de certificado para el curso correspondiente al content_id.

    Cualquier error aquí se ignora silenciosamente para no romper el flujo
    principal de corrección.
    """
    try:
        # ¿Existe la tabla de certificados?
        if not await _table_exists(conn, "course_certificate"):
            return

        # Obtener course_id desde content_item
        course_id = await conn.fetchval(
            "SELECT course_id FROM content_item WHERE id = $1",
            content_id,
        )
        if not course_id:
            return

        # ¿Ya tenía certificado?
        exists = await conn.fetchval(
            """
            SELECT 1
            FROM course_certificate
            WHERE user_id = $1 AND course_id = $2
            """,
            user_id,
            course_id,
        )
        if exists:
            return

        # Crear certificado
        await conn.execute(
            """
            INSERT INTO course_certificate
                (user_id, course_id, attempt_id, score_percent)
            VALUES ($1, $2, $3, $4)
            """,
            user_id,
            course_id,
            attempt_id,
            score_percent,
        )
    except Exception:
        # Aquí podrías hacer logging.error(...) si tienes logging configurado.
        return


# =============================
#  Endpoint principal
# =============================

@router.post("/exam/submit", response_model=SubmitExamResponse)
async def submit_exam(
    payload: SubmitExamRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """
    Corrige el examen, guarda intento + respuestas y devuelve nota.

    Espera:
      - Header:  X-User-Id  (user_id del alumno)
      - Body (JSON):
        {
          "content_id": "...",
          "quiz_id": "...",
          "answers": [
            { "question_id": "...", "option_id": "..." },
            ...
          ]
        }

    Respuesta:
        {
          "ok": true,
          "attempt_id": "...",
          "score_percent": 80.0,
          "passed": true
        }

    Además:
      - Inserta un registro en exam_attempt
      - Inserta exam_answer por cada pregunta respondida
      - Si score_percent >= PASS_THRESHOLD y existe la tabla
        course_certificate, crea un certificado para ese curso
        (una sola vez por user_id + course_id).
    """

    if not x_user_id:
        raise HTTPException(status_code=400, detail="Falta header X-User-Id")

    user_id = x_user_id
    content_id = payload.content_id
    quiz_id = payload.quiz_id

    conn = await asyncpg.connect(dsn=DB_DSN)
    try:
        # 1) Validar que el quiz pertenece a ese content_id
        row = await conn.fetchrow(
            "SELECT id FROM quiz WHERE id = $1 AND content_id = $2",
            quiz_id,
            content_id,
        )
        if not row:
            raise HTTPException(
                status_code=400,
                detail="Quiz no corresponde a este contenido.",
            )

        # 2) Cargar mapa de opciones correctas por pregunta
        rows = await conn.fetch(
            """
            SELECT qq.id AS qid, qo.id AS oid, qo.is_correct
            FROM quiz_question qq
            JOIN quiz_option   qo ON qo.question_id = qq.id
            WHERE qq.quiz_id = $1
            """,
            quiz_id,
        )
        if not rows:
            raise HTTPException(
                status_code=400,
                detail="El quiz no tiene preguntas configuradas.",
            )

        correct_by_q: Dict[str, Dict[str, bool]] = {}
        for r in rows:
            qid = str(r["qid"])
            oid = str(r["oid"])
            is_corr = bool(r["is_correct"])
            correct_by_q.setdefault(qid, {})
            correct_by_q[qid][oid] = is_corr

        # 3) Calcular nota
        total_q = len({str(r["qid"]) for r in rows})
        if total_q == 0:
            raise HTTPException(status_code=400, detail="Quiz vacío.")

        correct_count = 0
        answer_records: List[tuple[str, str, bool]] = []

        # normalizamos respuestas por pregunta
        answers_by_q: Dict[str, SubmittedAnswer] = {
            a.question_id: a for a in payload.answers
        }

        for qid in correct_by_q.keys():
            ans = answers_by_q.get(qid)
            if not ans:
                # No respondió esta pregunta -> se considera incorrecta
                continue

            is_corr = correct_by_q[qid].get(ans.option_id, False)
            if is_corr:
                correct_count += 1

            answer_records.append(
                (qid, ans.option_id, is_corr)
            )

        score_percent = 0.0
        if total_q > 0:
            score_percent = round(100.0 * correct_count / total_q, 2)

        passed = score_percent >= PASS_THRESHOLD

        # 4) Guardar intento + respuestas en una transacción
        attempt_id = str(uuid.uuid4())
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO exam_attempt
                    (id, user_id, quiz_id, content_id, score_percent, passed)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                attempt_id,
                user_id,
                quiz_id,
                content_id,
                score_percent,
                passed,
            )

            for qid, oid, is_corr in answer_records:
                await conn.execute(
                    """
                    INSERT INTO exam_answer
                        (id, attempt_id, question_id, option_id, is_correct)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    str(uuid.uuid4()),
                    attempt_id,
                    qid,
                    oid,
                    is_corr,
                )

            # 5) Si aprobó, intentamos emitir certificado (si existe tabla)
            if passed:
                await _maybe_issue_certificate(
                    conn,
                    user_id=user_id,
                    content_id=content_id,
                    attempt_id=attempt_id,
                    score_percent=score_percent,
                )

        return SubmitExamResponse(
            ok=True,
            attempt_id=attempt_id,
            score_percent=score_percent,
            passed=passed,
        )

    except HTTPException:
        # Re-lanzamos para que FastAPI respete el status_code original
        raise
    except Exception as e:
        # Error inesperado -> 500
        raise HTTPException(
            status_code=500,
            detail=f"Error evaluando examen: {e}",
        )
    finally:
        await conn.close()
