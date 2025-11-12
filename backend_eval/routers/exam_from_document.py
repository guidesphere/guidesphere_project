# backend_eval/routers/exam_from_document.py
import os
import shutil
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

        # 2) Localizar el archivo físico del documento
        #    Antes de dockerizar, el core lo grababa en /docs o /uploads;
        #    ahora probamos todas las variantes razonables.
        docs_dir = "/app/docs"
        os.makedirs(docs_dir, exist_ok=True)

        candidate_paths: List[str] = []

        # a) Ruta tal y como viene en la columna uri (ej: /uploads/docs/xxxxx.pdf o /docs/xxxxx.pdf)
        candidate_paths.append(os.path.join("/app", doc_uri.lstrip("/")))

        # b) Si uri fuera relativo
        if not doc_uri.startswith("/"):
            candidate_paths.append(os.path.join(docs_dir, doc_uri))

        # c) Rutas típicas por doc_id y extensión
        for ext in [".pdf", ".docx", ".doc"]:
            candidate_paths.append(os.path.join(docs_dir, f"{doc_id}{ext}"))
            candidate_paths.append(os.path.join("/app/uploads", f"{doc_id}{ext}"))
            candidate_paths.append(os.path.join("/app/uploads/docs", f"{doc_id}{ext}"))

        source_path = None
        for p in candidate_paths:
            if os.path.exists(p):
                source_path = p
                break

        if not source_path:
            # Error real: no encontramos el documento en ninguna ruta razonable
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Documento no encontrado para doc_id={doc_id}. "
                    f"Probadas rutas: {', '.join(sorted(set(candidate_paths)))}"
                ),
            )

        # 3) Copiarlo a /app/docs con nombre doc_id.ext, que es lo que usa doc_reader
        _, ext = os.path.splitext(source_path)
        if not ext:
            ext = ".pdf"
        dest_path = os.path.join(docs_dir, f"{doc_id}{ext}")

        if not os.path.exists(dest_path):
            shutil.copyfile(source_path, dest_path)

        # 4) Extraer texto del documento (doc_reader mira en /app/docs/doc_id.ext)
        try:
            text = await get_text_from_document(doc_id)
        except FileNotFoundError:
            raise HTTPException(
                status_code=404,
                detail=f"Documento no encontrado para doc_id={doc_id} en {dest_path}.",
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

        # 5) Generar preguntas con el servicio de IA
        gen = await generate_questions(text=text, count=count)

        # 6) Guardar el quiz ligado al content_item (documento)
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
