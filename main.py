import os
import logging
from typing import Optional
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import EduGenie AI Modules
import qna
import explanation_module
import quiz_module
import summary_module
import learning_path
from gemini_client import is_api_configured, DEFAULT_MODEL

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("edugenie.app")

# Initialize FastAPI application
app = FastAPI(
    title="EduGenie – AI Learning Assistant",
    description="Intelligent AI-powered educational dashboard for students",
    version="1.0.0"
)

# Enable CORS for maximum flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ==========================================
# Pydantic Request Models for API Endpoints
# ==========================================

class QARequest(BaseModel):
    question: str = Field(..., description="The student's academic question")


class ExplainRequest(BaseModel):
    topic: str = Field(..., description="The academic topic to explain")


class QuizRequest(BaseModel):
    content: str = Field(..., description="The topic or study material for the quiz")


class SummarizeRequest(BaseModel):
    text: str = Field(..., description="The study material or text to summarize")


class LearningPathRequest(BaseModel):
    topic: str = Field(..., description="The topic to learn")
    level: str = Field(default="Beginner", description="Learner level: Beginner, Intermediate, Advanced")


# ==========================================
# Core HTML Page Route
# ==========================================

@app.get("/", response_class=HTMLResponse)
async def serve_dashboard(request: Request):
    """
    Renders the modern EduGenie educational dashboard.
    """
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "api_configured": is_api_configured(),
            "default_model": DEFAULT_MODEL,
            "app_title": "EduGenie – AI Learning Assistant"
        }
    )



@app.get("/api/status")
async def get_system_status():
    """
    Status endpoint to inspect backend health and Gemini API readiness.
    """
    configured = is_api_configured()
    return {
        "status": "online",
        "api_configured": configured,
        "model": DEFAULT_MODEL,
        "features": [
            "Ask Question / Q&A",
            "Explain Topic",
            "Generate Quiz",
            "Summarize Material",
            "Personalized Learning Path"
        ]
    }


# ==========================================
# Feature Endpoints
# ==========================================

@app.post("/qa")
async def api_qa(payload: QARequest):
    """
    POST /qa: Answer student academic questions with step-by-step clarity.
    """
    try:
        result = qna.answer_question(payload.question)
        if not result.get("success"):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST if result.get("error") == "Empty question" else status.HTTP_200_OK,
                content=result
            )
        return result
    except Exception as exc:
        logger.error(f"Unexpected error in /qa: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": "Server Error", "message": "An unexpected error occurred."}
        )


@app.post("/explain")
async def api_explain(payload: ExplainRequest):
    """
    POST /explain: Beginner-friendly topic explanation with definition, key points, example, and summary.
    """
    try:
        result = explanation_module.explain_topic(payload.topic)
        if not result.get("success"):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST if result.get("error") == "Empty topic" else status.HTTP_200_OK,
                content=result
            )
        return result
    except Exception as exc:
        logger.error(f"Unexpected error in /explain: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": "Server Error", "message": "An unexpected error occurred."}
        )


@app.post("/quiz")
async def api_quiz(payload: QuizRequest):
    """
    POST /quiz: Generates exactly 3 MCQs with 4 options and correct answer.
    """
    try:
        result = quiz_module.generate_quiz(payload.content)
        if not result.get("success"):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST if result.get("error") == "Empty input" else status.HTTP_200_OK,
                content=result
            )
        return result
    except Exception as exc:
        logger.error(f"Unexpected error in /quiz: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": "Server Error", "message": "An unexpected error occurred."}
        )


@app.post("/summarize")
async def api_summarize(payload: SummarizeRequest):
    """
    POST /summarize: Condenses paragraphs into high-yield revision summaries.
    """
    try:
        result = summary_module.summarize_text(payload.text)
        if not result.get("success"):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST if "Empty" in result.get("error", "") else status.HTTP_200_OK,
                content=result
            )
        return result
    except Exception as exc:
        logger.error(f"Unexpected error in /summarize: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": "Server Error", "message": "An unexpected error occurred."}
        )


@app.post("/learn/recommendations")
async def api_learning_path(payload: LearningPathRequest):
    """
    POST /learn/recommendations: Generates a personalized learning roadmap.
    """
    try:
        result = learning_path.generate_learning_path(payload.topic, payload.level)
        if not result.get("success"):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST if result.get("error") == "Empty topic" else status.HTTP_200_OK,
                content=result
            )
        return result
    except Exception as exc:
        logger.error(f"Unexpected error in /learn/recommendations: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": "Server Error", "message": "An unexpected error occurred."}
        )


# ==========================================
# Run entrypoint
# ==========================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
