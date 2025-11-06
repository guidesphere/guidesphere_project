# backend_eval/routers/exam_view.py
from fastapi import APIRouter, HTTPException
import asyncpg, os

router = APIRouter(prefix="/exam", tags=["exam-view"])
DB_DSN = os.getenv("DB_DSN", "postgresql://postgres:postgres@db:5432/guidesphere")

@router.get("/{content_id}")
async def get_exam_by_content(content_id: str):
    conn = await asyncpg.connect(dsn=DB_DSN)
    try:
        quiz = await conn.fetchrow("SELECT id FROM quiz WHERE content_id=$1 LIMIT 1", content_id)
        if not quiz:
            raise HTTPException(status_code=404, detail="No hay quiz para ese content_id")
        qrows = await conn.fetch("""
          SELECT q.id as qid, q.prompt, o.id as oid, o.label, o.is_correct
          FROM quiz_question q
          LEFT JOIN quiz_option o ON o.question_id = q.id
          WHERE q.quiz_id=$1
          ORDER BY q.prompt, o.label
        """, quiz["id"])
        items = {}
        for r in qrows:
            q = items.setdefault(str(r["qid"]), {"question_id": str(r["qid"]), "prompt": r["prompt"], "options": []})
            if r["oid"]:
                q["options"].append({"option_id": str(r["oid"]), "label": r["label"]})
        return {"quiz_id": str(quiz["id"]), "content_id": content_id, "questions": list(items.values())}
    finally:
        await conn.close()
