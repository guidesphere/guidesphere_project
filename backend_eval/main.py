# backend_eval/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import evaluations, exams, exam_submit
from routers.exam_fixed import router as exam_fixed_router
from routers.exam_from_document import router as exam_from_document_router
from routers.exam_from_video import router as exam_from_video_router
from routers.exam_view import router as exam_view_router
from routers.course_rating import router as course_rating_router
from routers.certificates import router as certificates_router
from routers.admin_stats import router as admin_stats_router

app = FastAPI(title="GuideSphere Eval API")

# CORS abierto para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}

# Routers principales
app.include_router(evaluations.router)
app.include_router(exams.router)
app.include_router(exam_fixed_router)
app.include_router(exam_from_document_router)
app.include_router(exam_from_video_router)
app.include_router(exam_view_router)

# ⚠️ Usamos SOLO el submit viejo que el frontend entiende
app.include_router(exam_submit.router)

# OJO: NO incluimos aún exam_submission.router
# Lo dejamos listo para usar más adelante con certificados, etc.
app.include_router(course_rating_router)
app.include_router(certificates_router)
app.include_router(admin_stats_router)

