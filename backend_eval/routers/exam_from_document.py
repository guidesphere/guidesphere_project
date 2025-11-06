# backend_eval/routers/exam_from_document.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict
import asyncpg

from services.doc_reader import get_text_from_document
from services.quiz_generator import generate_questions
from repositories.exam_repo import save_generated_quiz, DB_DSN

router = APIRouter()

MIN_TEXT_LEN = 50


class CreateFromDocResponse(BaseModel):
    ok: bool
    quiz_id: str


class ExamOption(BaseModel):
    id: str
    text: str
    is_correct: bool


class ExamQuestion(BaseModel):
    id: str
    prompt: str
    options: List[ExamOption]


class ExamByContentResponse(BaseModel):
    ok: bool
    quiz_id: str
    questions: List[ExamQuestion]


@router.post("/exam/from-document/{doc_id}", response_model=CreateFromDocResponse)
async def create_exam_from_document(
    doc_id: str,
    # El frontend envía ?contentId=..., lo mapeamos a content_id
    content_id: str = Query(..., alias="contentId"),
    count: int = Query(5, ge=3, le=10),
):
    try:
        # 1) Validar que el content_id exista y tenga un document_asset
        conn = await asyncpg.connect(dsn=DB_DSN)
        try:
            row = await conn.fetchrow(
                """
                SELECT ci.id, ci.type, ci.title, da.uri
                FROM content_item ci
                LEFT JOIN document_asset da ON da.content_id = ci.id
                WHERE ci.id = $1
                """,
                content_id,
            )
        finally:
            await conn.close()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"content_id inexistente: {content_id}",
            )

        doc_uri = row["uri"]
        if not doc_uri:
            raise HTTPException(
                status_code=404,
                detail="No hay documento asociado a este contenido.",
            )

        # 2) Extraer texto del documento (doc_id viene del fileId: 1762199478782)
        try:
            text = await get_text_from_document(doc_id)
        except FileNotFoundError:
            raise HTTPException(
                status_code=404,
                detail=f"Documento no encontrado para doc_id={doc_id}.",
            )
        except Exception as e:
            # Cualquier error específico del lector se considera 422 (input inválido)
            raise HTTPException(
                status_code=422,
                detail=f"No se pudo leer el documento ({e}).",
            )

        if not text or len(text.strip()) < MIN_TEXT_LEN:
            raise HTTPException(
                status_code=422,
                detail=(
                    "El documento no tiene texto suficiente para generar un examen "
                    f"(mínimo {MIN_TEXT_LEN} caracteres)."
                ),
            )

        # 3) Generar preguntas con el servicio de IA
        gen = await generate_questions(text=text, count=count)

        # 4) Guardar el quiz ligado al content_item (documento)
        quiz_id = await save_generated_quiz(
            source_doc_id=doc_id,
            title=f"Auto-quiz documento {doc_id}",
            questions=gen["questions"],
            fingerprint=gen.get("fingerprint"),
            content_id=content_id,
        )

        return CreateFromDocResponse(ok=True, quiz_id=str(quiz_id))

    except HTTPException:
        raise
    except Exception as e:
        # Errores realmente inesperados
        raise HTTPException(status_code=500, detail=f"Error generando examen: {e}")


@router.get("/exam/by-content/{content_id}", response_model=ExamByContentResponse)
async def exam_by_content(content_id: str):
    conn = await asyncpg.connect(dsn=DB_DSN)
    try:
        # Buscar un quiz asociado a ese content_id
        quiz_id = await conn.fetchval(
            "SELECT id FROM quiz WHERE content_id = $1 LIMIT 1",
            content_id,
        )
        if not quiz_id:
            raise HTTPException(
                status_code=404,
                detail="No existe un quiz para este contenido.",
            )

        rows = await conn.fetch(
            """
            SELECT
              qq.id      AS qid,
              qq.prompt,
              qo.id      AS oid,
              qo.label   AS text,
              qo.is_correct
            FROM quiz_question qq
            LEFT JOIN quiz_option qo ON qo.question_id = qq.id
            WHERE qq.quiz_id = $1
            ORDER BY qq.prompt, qo.label
            """,
            quiz_id,
        )

        by_q: Dict[str, Dict] = {}
        for r in rows:
            qid = str(r["qid"])
            if qid not in by_q:
                by_q[qid] = {
                    "id": qid,
                    "prompt": r["prompt"],
                    "options": [],
                }
            if r["oid"] is not None:
                by_q[qid]["options"].append(
                    {
                        "id": str(r["oid"]),
                        "text": r["text"],
                        "is_correct": bool(r["is_correct"]),
                    }
                )

        return {
            "ok": True,
            "quiz_id": str(quiz_id),
            "questions": list(by_q.values()),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error consultando examen: {e}",
        )
    finally:
        await conn.close()
