# backend_eval/routers/certificates.py
from __future__ import annotations

from typing import List, Optional
from datetime import datetime

import asyncpg
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from repositories.exam_repo import DB_DSN

router = APIRouter(prefix="/certificates", tags=["certificates"])


class CertificateItem(BaseModel):
    id: str
    course_id: str
    course_title: str
    score_percent: float
    issued_at: datetime


class CertificatesResponse(BaseModel):
    ok: bool
    items: List[CertificateItem]


@router.get("/me", response_model=CertificatesResponse)
async def get_my_certificates(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
):
    """
    Devuelve los certificados del usuario actual.
    - Preferimos X-User-Id.
    - Si no viene, intentamos resolverlo por X-User-Email.
    """

    if not x_user_id and not x_user_email:
        raise HTTPException(
            status_code=400,
            detail="Falta el header X-User-Id o X-User-Email",
        )

    conn = await asyncpg.connect(dsn=DB_DSN)
    try:
        user_id = x_user_id

        # Si no tenemos id pero sí email, lo buscamos
        if not user_id and x_user_email:
            user_id = await conn.fetchval(
                "SELECT id FROM user_account WHERE email = $1",
                x_user_email,
            )
            if not user_id:
                raise HTTPException(
                    status_code=404,
                    detail="Usuario no encontrado para ese email.",
                )

        rows = await conn.fetch(
            """
            SELECT
              cc.id,
              cc.course_id,
              c.title AS course_title,
              cc.score_percent,
              cc.issued_at
            FROM course_certificate cc
            JOIN course c ON c.id = cc.course_id
            WHERE cc.user_id = $1
            ORDER BY cc.issued_at DESC
            """,
            user_id,
        )

        items = [
            CertificateItem(
                id=str(r["id"]),
                course_id=str(r["course_id"]),
                course_title=r["course_title"],
                score_percent=float(r["score_percent"]),
                issued_at=r["issued_at"],
            )
            for r in rows
        ]

        return CertificatesResponse(ok=True, items=items)
    finally:
        await conn.close()
