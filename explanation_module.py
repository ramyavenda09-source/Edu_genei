import logging
from typing import Dict, Any, List
from gemini_client import generate_gemini_content, clean_json_response, is_api_configured

logger = logging.getLogger("edugenie.explain")

SYSTEM_PROMPT_EXPLAIN = """You are EduGenie, an expert educational mentor dedicated to making difficult academic topics crystal clear for beginners.
Explain the requested topic in simple, engaging language without unnecessary technical jargon.
Structure your output as valid JSON with the following exact keys:
- "topic": The topic name
- "definition": A clear, beginner-friendly 1-2 sentence definition
- "key_points": A list of 3-5 concise, essential bullet points explaining core concepts
- "example": A relatable, everyday real-world analogy or example that cements the concept
- "summary": A 1-2 sentence quick recap for quick revision
"""


def explain_topic(topic: str) -> Dict[str, Any]:
    """
    Explain a difficult topic for a beginner with definition, key points, example, and summary.
    """
    if not topic or not topic.strip():
        return {
            "success": False,
            "error": "Empty topic",
            "message": "Please enter a topic to explain."
        }

    topic_clean = topic.strip()

    if not is_api_configured():
        return {
            "success": False,
            "error": "API Key Missing",
            "message": "Gemini API key is not configured. Please set GEMINI_API_KEY in the .env file."
        }

    prompt = f"""Explain the following topic to a beginner:
Topic: "{topic_clean}"

Follow this exact structure and return strictly valid JSON:
{{
  "topic": "{topic_clean}",
  "definition": "Simple, beginner-friendly definition",
  "key_points": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ],
  "example": "Relatable real-world example or analogy",
  "summary": "Short 1-2 sentence summary for quick revision"
}}
"""

    try:
        raw_response = generate_gemini_content(
            prompt=prompt,
            system_instruction=SYSTEM_PROMPT_EXPLAIN,
            json_mode=True
        )
        data = clean_json_response(raw_response)

        # Validate required fields
        definition = data.get("definition", "")
        key_points = data.get("key_points", [])
        if not isinstance(key_points, list):
            key_points = [str(key_points)]
        example = data.get("example", "")
        summary = data.get("summary", "")

        return {
            "success": True,
            "topic": data.get("topic", topic_clean),
            "definition": definition,
            "key_points": key_points,
            "example": example,
            "summary": summary
        }
    except Exception as exc:
        logger.warning(f"Structured JSON explanation failed, falling back to text format: {exc}")
        # Graceful fallback: text generation
        try:
            fallback_prompt = f"""Explain the following topic to a beginner:
Topic: {topic_clean}

Please include:
### Simple Definition
A simple, beginner-friendly definition.

### Key Points
- 3 to 5 concise key points.

### Real-World Example
A relatable everyday example or analogy.

### Short Summary
A 1-2 sentence quick recap for revision.
Avoid unnecessary technical jargon."""

            text_response = generate_gemini_content(
                prompt=fallback_prompt,
                system_instruction="Explain the topic clearly to a beginner with definition, key points, example, and summary."
            )
            return {
                "success": True,
                "topic": topic_clean,
                "definition": f"Detailed explanation for {topic_clean}",
                "key_points": ["Review the full breakdown below"],
                "example": "See comprehensive breakdown in the explanation card.",
                "summary": "Comprehensive overview provided.",
                "full_text": text_response
            }
        except Exception as fb_exc:
            logger.error(f"Fallback explanation also failed: {fb_exc}")
            return {
                "success": False,
                "error": "Explanation Failed",
                "message": str(fb_exc)
            }
