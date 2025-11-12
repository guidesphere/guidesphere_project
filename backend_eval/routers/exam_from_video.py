# backend_eval/routers/exam_from_video.py
import os
import shutil
from typing import Optional

import asyncpg
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from repositories.exam_repo import save_generated_quiz, DB_DSN
from services.quiz_generator import generate_questions
from services.video_transcriber import (
    VIDEOS_DIR,
    transcribe_video_if_needed,
)

router = APIRouter()

# Mínimo de caracteres de texto para poder generar preguntas
MIN_TEXT_LEN = 80


class CreateFromVideoResponse(BaseModel):
    ok: bool
    quiz_id: str


@router.post("/exam/from-video/{content_id}", response_model=CreateFromVideoResponse)
async def create_exam_from_video(
    content_id: str,
    count: int = Query(5, ge=3, le=10),
):
    """
    Genera (o reemplaza) el examen para un contenido de tipo 'video'.

    Flujo:
      1) Verifica que el content_id exista y sea video.
      2) Busca el media_asset para obtener la URI del archivo.
      3) Copia el archivo real desde /uploads/... a VIDEOS_DIR si es necesario.
      4) Transcribe el audio con Whisper (creando/leyendo el .txt).
      5) Si el texto es suficiente, genera preguntas y guarda el quiz.
    """
    # --- 1) Validar que el contenido exista y sea video ---
    conn = await asyncpg.connect(dsn=DB_DSN)
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM content_item WHERE id = $1 AND type = 'video'",
            content_id,
        )
        if not exists:
            raise HTTPException(
                status_code=404,
                detail=f"content_id inexistente o no es video: {content_id}",
            )

        # --- 2) Obtener la URI del archivo de video en media_asset ---
        row = await conn.fetchrow(
            "SELECT uri FROM media_asset WHERE content_id = $1 LIMIT 1",
            content_id,
        )
        if not row or not row["uri"]:
            raise HTTPException(
                status_code=404,
                detail="No se encontró el archivo de video para este contenido.",
            )

        video_uri: str = row["uri"]  # ejemplo: /uploads/videos/1762271911802.mp4

    finally:
        await conn.close()

    # --- 3) Localizar/corregir la ruta al archivo de video ---
    # El backend core guarda el archivo bajo /uploads/..., así que
    # construimos la ruta real dentro del contenedor.
    source_path = os.path.join("/app", video_uri.lstrip("/"))

    if not os.path.exists(source_path):
        # El frontend interpreta 404 como "video 404"
        raise HTTPException(
            status_code=404,
            detail=f"Video no encontrado en {source_path}.",
        )

    # Aseguramos que el archivo también exista en VIDEOS_DIR, que es donde
    # el servicio de transcripción espera encontrarlo.
    os.makedirs(VIDEOS_DIR, exist_ok=True)
    base_name = os.path.basename(source_path)  # 1762271911802.mp4
    video_path = os.path.join(VIDEOS_DIR, base_name)

    if not os.path.exists(video_path):
        shutil.copyfile(source_path, video_path)

    # --- 4) Transcribir con Whisper (si hace falta) ---
    try:
        text = transcribe_video_if_needed(
            content_id=content_id,
            video_path=video_path,
            video_uri=video_uri,
            language="es",
        )
    except FileNotFoundError:
        # El frontend interpreta 404 como "video 404"
        raise HTTPException(
            status_code=404,
            detail=f"Video no encontrado en {video_path}.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error transcribiendo video: {e}",
        )

    if not text or len(text.strip()) < MIN_TEXT_LEN:
        # El frontend interpreta 422 como "video 422"
        raise HTTPException(
            status_code=422,
            detail=(
                "No hay transcripción suficiente para este video. "
                "Revisa el audio o intenta con un video más largo."
            ),
        )

    # --- 5) Generar preguntas y guardar el quiz ligado al content_id ---
    gen = await generate_questions(text=text, count=count)

    quiz_id = await save_generated_quiz(
        source_doc_id=content_id,
        title=f"Auto-quiz video {content_id}",
        questions=gen["questions"],
        fingerprint=gen.get("fingerprint"),
        content_id=content_id,
    )

    return CreateFromVideoResponse(ok=True, quiz_id=str(quiz_id))
