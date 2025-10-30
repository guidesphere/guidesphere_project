from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import evaluations, exams
from routers.exam_fixed import router as exam_fixed_router

app = FastAPI(title="GuideSphere Eval API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

app.include_router(evaluations.router)
app.include_router(exams.router)
app.include_router(exam_fixed_router)
