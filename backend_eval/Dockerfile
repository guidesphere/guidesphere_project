# backend_eval/Dockerfile
FROM python:3.11-slim

# Evitar preguntas en apt y cache de pip
ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1

# Sistema: ffmpeg (STT necesita extraer audio)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencias base del proyecto
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt || true

# Whisper rápido en CPU (versiones compatibles)
RUN pip install --no-cache-dir \
    faster-whisper==1.0.3 \
    "ctranslate2>=4,<5" \
    numpy

# Copiar código
COPY . /app

# Puerto interno
EXPOSE 8000

# Arranque del servicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
