# backend_eval/routers/exam_submit.py

from __future__ import annotations

from typing import Dict, List, Optional, Tuple
import uuid

import asyncpg
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from repositories.exam_repo import DB_DSN

router = APIRouter(prefix="/exam", tags=["exam-submit"])

PASS_THRESHOLD = 60.0  # porcentaje mínimo para aprobar


class SubmitPayload(BaseModel):
    content_id: str
    answers: Dict[str, str]  # {question_id: option_id}


class OptionOut(BaseModel):
    id: str
    text: str
    is_correct: bool


class QuestionResult(BaseModel):
    question_id: str
    prompt: str
    selected_option_id: str | None
    correct_option_id: str | None
    is_correct: bool
    options: List[OptionOut]


class SubmitResult(BaseModel):
    ok: bool
    total_questions: int
    correct_count: int
    score_percent: float
    details: List[QuestionResult]
    passed: bool | None = None


async def _table_exists(conn: asyncpg.Connection, table_name: str) -> bool:
    """Verifica si existe una tabla en public."""
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
    Si existe course_certificate y el usuario aprobó, crea un certificado
    para el curso asociado al content_id (una sola vez por user+course).
    Cualquier error aquí se ignora para no romper el submit.
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

        # ¿Ya tiene certificado para este curso?
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
        # Aquí podrías hacer logging.error(...) si tienes logging.
        return


@router.post("/submit", response_model=SubmitResult)
async def submit_exam(
    payload: SubmitPayload,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """
    Corrige el examen (como antes), devuelve el detalle de preguntas, y si
    existen las tablas exam_attempt/exam_answer, guarda el intento.
    Si score >= PASS_THRESHOLD y viene X-User-Id, intenta emitir certificado.
    """
    content_id = payload.content_id
    answers = payload.answers or {}

    conn = await asyncpg.connect(dsn=DB_DSN)
    try:
        quiz_id = await conn.fetchval(
            "SELECT id FROM quiz WHERE content_id=$1 LIMIT 1", content_id
        )
        if not quiz_id:
            raise HTTPException(
                status_code=404,
                detail="No existe quiz para este contenido.",
            )

        rows = await conn.fetch(
            """
            SELECT
              qq.id     AS qid,
              qq.prompt AS prompt,
              qo.id     AS oid,
              qo.label  AS text,
              qo.is_correct AS is_correct
            FROM quiz_question qq
            LEFT JOIN quiz_option qo ON qo.question_id = qq.id
            WHERE qq.quiz_id = $1
            ORDER BY qq.prompt, qo.label
            """,
            quiz_id,
        )

        # Agrupar por pregunta + hallar correcta
        questions: Dict[str, Dict] = {}
        for r in rows:
            qid = str(r["qid"])
            if qid not in questions:
                questions[qid] = {
                    "prompt": r["prompt"],
                    "options": [],
                    "correct": None,
                }
            if r["oid"] is not None:
                oid = str(r["oid"])
                is_ok = bool(r["is_correct"])
                questions[qid]["options"].append(
                    {"id": oid, "text": r["text"], "is_correct": is_ok}
                )
                if is_ok:
                    questions[qid]["correct"] = oid

        details: List[QuestionResult] = []
        correct_count = 0

        # Respuestas para guardar en BD
        answer_records: List[Tuple[str, str, bool]] = []

        for qid, q in questions.items():
            selected = answers.get(qid)
            correct = q["correct"]
            is_correct = (selected == correct) if (selected and correct) else False
            if is_correct:
                correct_count += 1

            if selected is not None:
                answer_records.append((qid, selected, is_correct))

            details.append(
                QuestionResult(
                    question_id=qid,
                    prompt=q["prompt"],
                    selected_option_id=selected,
                    correct_option_id=correct,
                    is_correct=is_correct,
                    options=[OptionOut(**o) for o in q["options"]],
                )
            )

        total = len(details)
        score = (correct_count / total * 100.0) if total else 0.0
        passed = score >= PASS_THRESHOLD

        # Guardar intento/respuestas SI existen las tablas
        has_attempt = await _table_exists(conn, "exam_attempt")
        has_answer = await _table_exists(conn, "exam_answer")

        attempt_id: Optional[str] = None

        if has_attempt and has_answer:
            attempt_id = str(uuid.uuid4())
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO exam_attempt
                        (id, user_id, quiz_id, content_id, score_percent, passed)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    attempt_id,
                    x_user_id,  # puede ser None
                    quiz_id,
                    content_id,
                    score,
                    passed,
                )

                for qid, oid, is_ok in answer_records:
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
                        is_ok,
                    )

                # Emitir certificado si procede
                if passed and x_user_id and attempt_id:
                    await _maybe_issue_certificate(
                        conn,
                        user_id=x_user_id,
                        content_id=content_id,
                        attempt_id=attempt_id,
                        score_percent=score,
                    )

        return SubmitResult(
            ok=True,
            total_questions=total,
            correct_count=correct_count,
            score_percent=round(score, 2),
            details=details,
            passed=passed,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluando examen: {e}")
    finally:
        await conn.close()
