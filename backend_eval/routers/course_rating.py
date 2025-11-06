# backend_eval/routers/course_rating.py

from __future__ import annotations

from typing import Optional, List

import asyncpg
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from repositories.exam_repo import DB_DSN

router = APIRouter(prefix="/course-rating", tags=["course-rating"])


class RatingPayload(BaseModel):
    rating: int          # 1–5
    comment: Optional[str] = None


class RatingOut(BaseModel):
    ok: bool
    rating: int
    comment: Optional[str] = None


class RatingSummary(BaseModel):
    course_id: str
    avg_rating: float
    ratings_count: int
    user_rating: Optional[int] = None
    user_comment: Optional[str] = None


async def _get_conn() -> asyncpg.Connection:
    return await asyncpg.connect(dsn=DB_DSN)


@router.post("/{course_id}", response_model=RatingOut)
async def set_course_rating(
    course_id: str,
    payload: RatingPayload,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """
    Crea o actualiza la calificación de un curso para el usuario actual.

    Requiere:
      - Header: X-User-Id (id de user_account)
      - Body: { "rating": 1..5, "comment": "..." }
    """
    if not x_user_id:
        raise HTTPException(status_code=400, detail="Falta header X-User-Id")

    if not (1 <= payload.rating <= 5):
        raise HTTPException(
            status_code=400, detail="rating debe estar entre 1 y 5."
        )

    conn = await _get_conn()
    try:
        # Verificar que el curso existe
        exists = await conn.fetchval(
            "SELECT 1 FROM course WHERE id = $1",
            course_id,
        )
        if not exists:
            raise HTTPException(
                status_code=404, detail="Curso inexistente."
            )

        # UPSERT: si ya existe (user_id, course_id), actualiza; si no, crea
        await conn.execute(
            """
            INSERT INTO course_rating (user_id, course_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, course_id)
            DO UPDATE SET rating = EXCLUDED.rating,
                          comment = EXCLUDED.comment,
                          updated_at = now()
            """,
            x_user_id,
            course_id,
            payload.rating,
            payload.comment,
        )

        return RatingOut(
            ok=True,
            rating=payload.rating,
            comment=payload.comment,
        )

    finally:
        await conn.close()


@router.get("/{course_id}/summary", response_model=RatingSummary)
async def get_course_rating_summary(
    course_id: str,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """
    Devuelve resumen de ratings de un curso:
      - promedio
      - cantidad de ratings
      - rating del usuario actual (si viene X-User-Id)
    """
    conn = await _get_conn()
    try:
        row = await conn.fetchrow(
            """
            SELECT
              AVG(rating)::numeric(3,2) AS avg_rating,
              COUNT(*)                  AS ratings_count
            FROM course_rating
            WHERE course_id = $1
            """,
            course_id,
        )

        avg_rating = float(row["avg_rating"]) if row["avg_rating"] is not None else 0.0
        ratings_count = int(row["ratings_count"])

        user_rating = None
        user_comment = None

        if x_user_id:
            urow = await conn.fetchrow(
                """
                SELECT rating, comment
                FROM course_rating
                WHERE course_id = $1 AND user_id = $2
                """,
                course_id,
                x_user_id,
            )
            if urow:
                user_rating = int(urow["rating"])
                user_comment = urow["comment"]

        return RatingSummary(
            course_id=course_id,
            avg_rating=avg_rating,
            ratings_count=ratings_count,
            user_rating=user_rating,
            user_comment=user_comment,
        )

    finally:
        await conn.close()
