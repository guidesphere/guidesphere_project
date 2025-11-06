# backend_eval/test_transcribe_video.py

import os
from services.video_transcriber import (
    BACKEND_UPLOADS_DIR,
    transcribe_video_if_needed,
)

# OJO: ajusta estos dos valores a tu caso real:
CONTENT_ID = "230811d5-8476-48b1-8c7f-b6d689d77f7f"   # el content_id del video
FILE_NAME  = "1762271911802.mp4"                     # el nombre real del .mp4

# Ruta física al video según nuestra lógica:
video_path = os.path.join(BACKEND_UPLOADS_DIR, "videos", FILE_NAME)
video_uri  = f"/uploads/videos/{FILE_NAME}"

print("Usando video_path:", video_path)

text = transcribe_video_if_needed(
    content_id=CONTENT_ID,
    video_path=video_path,
    video_uri=video_uri,
    language="es",
)

print("Longitud de transcripción:", len(text))
print("Primeros 400 caracteres:\n")
print(text[:400])

# Comprobamos dónde quedó el .txt
from services.video_transcriber import TRANSCRIPTS_DIR
print("\nTranscripts dir:", TRANSCRIPTS_DIR)
txt_path = os.path.join(TRANSCRIPTS_DIR, f"{CONTENT_ID}.txt")
print("¿Existe el txt?:", os.path.exists(txt_path), "->", txt_path)
