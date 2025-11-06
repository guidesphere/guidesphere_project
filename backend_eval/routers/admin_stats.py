# backend_eval/routers/admin_stats.py
from __future__ import annotations

from typing import List, Optional

import asyncpg
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from repositories.exam_repo import DB_DSN

router = APIRouter(prefix="/admin/stats", tags=["admin-stats"])


# ===== modelos de salida =====

class TopItem(BaseModel):
    course_id: str
    title: str
    value: float


class StatsOverview(BaseModel):
    total_users: int
    total_students: int
    total_professors: int
    total_courses: int
    total_enrollments: int
    total_exam_attempts: int
    total_certificates: int
    top_enrolled: List[TopItem]
    top_rated: List[TopItem]


# ===== helpers internos =====

async def _get_conn() -> asyncpg.Connection:
    return await asyncpg.connect(dsn=DB_DSN)


async def _table_exists(conn: asyncpg.Connection, table_name: str) -> bool:
    row = await conn.fetchrow(
        "SELECT to_regclass($1) AS oid",
        f"public.{table_name}",
    )
    return bool(row and row["oid"])


async def _count_rows(conn: asyncpg.Connection, table_name: str) -> int:
    """
    Devuelve COUNT(*) de una tabla si existe; si no existe, devuelve 0.
    """
    if not await _table_exists(conn, table_name):
        return 0
    row = await conn.fetchrow(f"SELECT COUNT(*) AS c FROM {table_name}")
    return int(row["c"] or 0)


@router.get("/overview", response_model=StatsOverview)
async def get_admin_stats_overview(
    x_user_id: str = Header(..., alias="X-User-Id"),
):
    """
    Devuelve estadísticas globales para panel de administración.
    Solo accesible para role = 'admin' o 'superadmin'.
    """
    conn = await _get_conn()
    try:
        # 1) Verificar rol
        role = await conn.fetchval(
            "SELECT role FROM user_account WHERE id = $1",
            x_user_id,
        )
        role_lc = (role or "").lower()
        if role_lc not in ("admin", "superadmin"):
            raise HTTPException(status_code=403, detail="No autorizado")

        # 2) Totales básicos
        total_users = await _count_rows(conn, "user_account")
        # estos asumen que role tiene estos valores en tu esquema
        total_students = await conn.fetchval(
            "SELECT COUNT(*) FROM user_account WHERE role = 'student'"
        )
        total_professors = await conn.fetchval(
            "SELECT COUNT(*) FROM user_account WHERE role = 'professor'"
        )
        total_courses = await _count_rows(conn, "course")
        total_exam_attempts = await _count_rows(conn, "exam_attempt")
        total_certificates = await _count_rows(conn, "course_certificate")

        total_students = int(total_students or 0)
        total_professors = int(total_professors or 0)

        # 3) Matriculas: soporta 'enrollment' o 'course_enrollment'
        enrollment_table: Optional[str] = None
        if await _table_exists(conn, "enrollment"):
            enrollment_table = "enrollment"
        elif await _table_exists(conn, "course_enrollment"):
            enrollment_table = "course_enrollment"

        total_enrollments = 0
        top_enrolled: List[TopItem] = []

        if enrollment_table:
            row = await conn.fetchrow(
                f"SELECT COUNT(*) AS c FROM {enrollment_table}"
            )
            total_enrollments = int(row["c"] or 0)

            rows = await conn.fetch(
                f"""
                SELECT
                  c.id   AS course_id,
                  c.title,
                  COUNT(e.*) AS total
                FROM course c
                JOIN {enrollment_table} e ON e.course_id = c.id
                GROUP BY c.id, c.title
                ORDER BY total DESC
                LIMIT 5
                """
            )
            top_enrolled = [
                TopItem(
                    course_id=str(r["course_id"]),
                    title=r["title"],
                    value=float(r["total"] or 0),
                )
                for r in rows
            ]

        # 4) Top cursos por rating promedio (si existe course_rating)
        top_rated: List[TopItem] = []
        if await _table_exists(conn, "course_rating"):
            rows = await conn.fetch(
                """
                SELECT
                  c.id   AS course_id,
                  c.title,
                  AVG(cr.rating)::numeric(4,2) AS avg_rating
                FROM course c
                JOIN course_rating cr ON cr.course_id = c.id
                GROUP BY c.id, c.title
                HAVING COUNT(cr.*) >= 1
                ORDER BY avg_rating DESC
                LIMIT 5
                """
            )
            top_rated = [
                TopItem(
                    course_id=str(r["course_id"]),
                    title=r["title"],
                    value=float(r["avg_rating"] or 0.0),
                )
                for r in rows
            ]

        return StatsOverview(
            total_users=total_users,
            total_students=total_students,
            total_professors=total_professors,
            total_courses=total_courses,
            total_enrollments=total_enrollments,
            total_exam_attempts=total_exam_attempts,
            total_certificates=total_certificates,
            top_enrolled=top_enrolled,
            top_rated=top_rated,
        )

    finally:
        await conn.close()
