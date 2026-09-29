import logging
from typing import Dict, Any, List
from gemini_client import generate_gemini_content, clean_json_response, is_api_configured

logger = logging.getLogger("edugenie.quiz")

SYSTEM_PROMPT_QUIZ = """You are EduGenie, an expert educational assessment creator.
Create exactly 3 multiple-choice questions (MCQs) from the provided topic or study material.
Rules:
1. Generate exactly 3 questions.
2. Each question must have exactly 4 distinct options.
3. Include the exact correct answer which MUST match one of the 4 options verbatim.
4. Add a brief 1-sentence explanation of why the answer is correct to help the student learn.
5. Return strictly valid JSON with no extraneous text.

JSON format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answer": "Option A",
      "explanation": "Brief explanation of why Option A is correct."
    }
  ]
}
"""


def generate_quiz(content: str) -> Dict[str, Any]:
    """
    Generate exactly 3 multiple-choice questions with 4 options each and a correct answer.
    """
    if not content or not content.strip():
        return {
            "success": False,
            "error": "Empty input",
            "message": "Please enter a topic or paste study material to generate a quiz."
        }

    content_clean = content.strip()

    if not is_api_configured():
        return {
            "success": False,
            "error": "API Key Missing",
            "message": "Gemini API key is not configured. Please set GEMINI_API_KEY in the .env file."
        }

    prompt = f"""Create exactly 3 MCQs from the provided topic/material. Each question must have exactly 4 options and one correct answer. Return valid JSON only.

Topic or Material:
{content_clean}
"""

    try:
        raw_response = generate_gemini_content(
            prompt=prompt,
            system_instruction=SYSTEM_PROMPT_QUIZ,
            json_mode=True
        )
        data = clean_json_response(raw_response)

        raw_questions = data.get("questions", [])
        if not isinstance(raw_questions, list) or len(raw_questions) == 0:
            raise ValueError("Quiz response did not contain a valid list of questions.")

        validated_questions = []
        for i, q in enumerate(raw_questions[:3]):
            q_text = q.get("question", f"Question {i+1}").strip()
            raw_options = q.get("options", [])

            # Ensure options is a list of strings
            if isinstance(raw_options, dict):
                options = [str(v) for v in raw_options.values()]
            elif isinstance(raw_options, list):
                options = [str(opt).strip() for opt in raw_options]
            else:
                options = ["Option A", "Option B", "Option C", "Option D"]

            # Ensure exactly 4 options
            while len(options) < 4:
                options.append(f"Additional Option {len(options) + 1}")
            options = options[:4]

            answer = str(q.get("answer", "")).strip()

            # If answer is just a letter like "A", "B", "C", "D", map it to the corresponding option
            letter_map = {"a": 0, "b": 1, "c": 2, "d": 3}
            if answer.lower() in letter_map and letter_map[answer.lower()] < len(options):
                answer = options[letter_map[answer.lower()]]
            elif answer not in options:
                # Find best matching option or default to first
                matching = [opt for opt in options if answer.lower() in opt.lower() or opt.lower() in answer.lower()]
                answer = matching[0] if matching else options[0]

            explanation = q.get("explanation", f"'{answer}' is the correct answer based on educational principles.")

            validated_questions.append({
                "id": i + 1,
                "question": q_text,
                "options": options,
                "answer": answer,
                "explanation": explanation
            })

        if not validated_questions:
            raise ValueError("Could not extract valid questions from the AI response.")

        return {
            "success": True,
            "topic": content_clean[:100],
            "questions": validated_questions
        }

    except Exception as exc:
        logger.error(f"Quiz generation error: {exc}")
        return {
            "success": False,
            "error": "Quiz Generation Failed",
            "message": f"Unable to generate quiz at this time: {str(exc)}"
        }
