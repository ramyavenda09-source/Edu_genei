import logging
from typing import Dict, Any
from gemini_client import generate_gemini_content, is_api_configured

logger = logging.getLogger("edugenie.qna")

SYSTEM_PROMPT_QNA = """You are EduGenie, an expert, patient, and encouraging AI educational tutor for students.
Answer the student's academic question clearly and accurately. Use simple language.
If the topic is complex, explain it step by step and provide a relatable real-world example.
Format your answer with clear markdown headings, concise bullet points, bold key terms, and formatted formulas/code blocks where appropriate.
Keep answers student-friendly, inspiring, and easy to understand."""


def answer_question(question: str) -> Dict[str, Any]:
    """
    Generate a clear, accurate, student-friendly answer for an academic question.
    """
    if not question or not question.strip():
        return {
            "success": False,
            "error": "Empty question",
            "message": "Please enter an academic question to get an answer."
        }

    question_clean = question.strip()

    if not is_api_configured():
        return {
            "success": False,
            "error": "API Key Missing",
            "message": "Gemini API key is not configured. Please set GEMINI_API_KEY in the .env file."
        }

    user_prompt = f"""Academic Question from Student:
{question_clean}

Please provide a clear, accurate, and student-friendly answer following these guidelines:
- Direct, clear explanation
- Step-by-step breakdown if complex
- Relatable real-world example
- Key takeaway / quick summary
"""

    try:
        answer_text = generate_gemini_content(
            prompt=user_prompt,
            system_instruction=SYSTEM_PROMPT_QNA
        )
        return {
            "success": True,
            "question": question_clean,
            "answer": answer_text
        }
    except Exception as exc:
        logger.error(f"Error answering question: {exc}")
        return {
            "success": False,
            "error": "Generation Failed",
            "message": str(exc)
        }
