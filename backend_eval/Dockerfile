# Imagen base ligera de Python
FROM python:3.11-slim

# Configuración de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Crear directorio de trabajo
WORKDIR /app

# Copiar e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del proyecto
COPY . .

# Puerto interno de FastAPI
EXPOSE 8000

# Comando de inicio del servidor
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
