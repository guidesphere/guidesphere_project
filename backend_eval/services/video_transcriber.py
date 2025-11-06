# backend_eval/services/video_transcriber.py
import os
from typing import Optional

import whisper

# === Rutas base (igual estilo que doc_reader) ===

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Carpeta uploads del backend Node:
#   .../guidesphere/backend/uploads
BACKEND_UPLOADS_DIR = os.path.join(BASE_DIR, "backend", "uploads")

# Carpeta donde guardamos transcripciones (.txt) y PDFs:
#   .../guidesphere/backend/uploads/docs
DEFAULT_TRANSCRIPTS_DIR = os.path.join(BACKEND_UPLOADS_DIR, "docs")
TRANSCRIPTS_DIR = os.getenv("EVAL_TRANSCRIPTS_DIR", DEFAULT_TRANSCRIPTS_DIR)

# Carpeta de videos subidos:
#   .../guidesphere/backend/uploads/videos
DEFAULT_VIDEOS_DIR = os.path.join(BACKEND_UPLOADS_DIR, "videos")
VIDEOS_DIR = os.getenv("EVAL_UPLOADS_VIDEOS_DIR", DEFAULT_VIDEOS_DIR)

# === Modelo Whisper local ===
# Puedes cambiar "small" por "base", "medium" o "large" según tu máquina.
# "small" suele ir bien para pruebas y no es tan pesado.
_model: Optional[whisper.Whisper] = None


def _get_model() -> whisper.Whisper:
    global _model
    if _model is None:
        # fp16=False para funcionar bien en CPU y en muchas GPUs de Windows.
        _model = whisper.load_model("small")
    return _model


def _candidate_transcript_paths(content_id: str, video_uri: Optional[str]) -> list[str]:
    """
    Posibles rutas .txt para un video:
      - TRANSCRIPTS_DIR/<content_id>.txt
      - TRANSCRIPTS_DIR/<file_id>.txt  (nombre de archivo de video sin extensión)
    """
    candidates: list[str] = [
        os.path.join(TRANSCRIPTS_DIR, f"{content_id}.txt"),
    ]
    if video_uri:
        base_name = os.path.basename(video_uri)   # p.ej. 1762199490298.mp4
        stem, _ = os.path.splitext(base_name)     # -> 1762199490298
        candidates.append(os.path.join(TRANSCRIPTS_DIR, f"{stem}.txt"))
    return candidates


def _find_existing_transcript(content_id: str, video_uri: Optional[str]) -> Optional[str]:
    for path in _candidate_transcript_paths(content_id, video_uri):
        if os.path.exists(path):
            return path
    return None


def _read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def _write_text(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def transcribe_video_if_needed(
    *,
    content_id: str,
    video_path: str,
    video_uri: Optional[str] = None,
    language: str = "es",
) -> str:
    """
    Devuelve el texto de transcripción para un video, usando Whisper local.

    1) Si ya existe un .txt para ese content_id o file_id, lo lee y devuelve.
    2) Si no existe, transcribe el archivo de video con Whisper y guarda
       TRANSCRIPTS_DIR/<content_id>.txt para reutilizar en el futuro.
    """
    # 1) ¿Ya hay transcript?
    existing = _find_existing_transcript(content_id, video_uri)
    if existing and os.path.exists(existing):
        return _read_text(existing)

    # 2) Verificar archivo de video
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Archivo de video no encontrado: {video_path}")

    # 3) Transcribir con Whisper local
    model = _get_model()

    # Whisper usa ffmpeg por debajo; si falta, aquí dará error.
    result = model.transcribe(
        video_path,
        language=language,
        fp16=False,  # importante para CPU / Windows
    )

    text = result.get("text", "") or ""

    # 4) Guardar transcript para llamadas futuras
    out_path = os.path.join(TRANSCRIPTS_DIR, f"{content_id}.txt")
    _write_text(out_path, text)

    return text


# Exportables que usan otros módulos
__all__ = [
    "BACKEND_UPLOADS_DIR",
    "VIDEOS_DIR",
    "TRANSCRIPTS_DIR",
    "transcribe_video_if_needed",
]
