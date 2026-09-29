import logging
from typing import Dict, Any
from gemini_client import generate_gemini_content, is_api_configured

logger = logging.getLogger("edugenie.summary")

SYSTEM_PROMPT_SUMMARY = """You are EduGenie, an expert academic editor and study skills coach.
Summarize the provided educational content while preserving the important concepts, facts, definitions, and examples.
Make it concise and useful for quick exam revision.
Remove unnecessary fluff, filler words, and repetition.
Format the summary with clean markdown structure:
1. ### Quick Overview (A brief 2-3 sentence executive synopsis)
2. ### Key Concepts & Definitions (Bold term + concise explanation)
3. ### High-Yield Exam Revision Points (Bulleted takeaways)
4. ### Important Formulas / Rules / Dates (if applicable)
Ensure the summary is clear, punchy, and instantly digestible for students."""


def summarize_text(text: str) -> Dict[str, Any]:
    """
    Summarize educational study material into concise, high-yield exam revision notes.
    """
    if not text or not text.strip():
        return {
            "success": False,
            "error": "Empty text",
            "message": "Please paste study material or a paragraph to summarize."
        }

    text_clean = text.strip()
    original_words = len(text_clean.split())

    if original_words < 5:
        return {
            "success": False,
            "error": "Text too short",
            "message": "Please provide a longer text or paragraph (at least a full sentence) to summarize."
        }

    if not is_api_configured():
        return {
            "success": False,
            "error": "API Key Missing",
            "message": "Gemini API key is not configured. Please set GEMINI_API_KEY in the .env file."
        }

    user_prompt = f"""Summarize the following educational content while preserving the important concepts, facts, definitions and examples. Make it concise and useful for revision.

Content to summarize:
\"\"\"
{text_clean}
\"\"\"
"""

    try:
        summary_result = generate_gemini_content(
            prompt=user_prompt,
            system_instruction=SYSTEM_PROMPT_SUMMARY
        )

        summary_words = len(summary_result.split())
        reduction_pct = max(0, round(((original_words - summary_words) / original_words) * 100)) if original_words > 0 else 0

        return {
            "success": True,
            "summary": summary_result,
            "stats": {
                "original_word_count": original_words,
                "summary_word_count": summary_words,
                "reduction_percentage": reduction_pct
            }
        }
    except Exception as exc:
        logger.error(f"Summarization error: {exc}")
        return {
            "success": False,
            "error": "Summarization Failed",
            "message": str(exc)
        }
