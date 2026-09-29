import logging
from typing import Dict, Any, List
from gemini_client import generate_gemini_content, clean_json_response, is_api_configured

logger = logging.getLogger("edugenie.learning_path")

SYSTEM_PROMPT_ROADMAP = """You are EduGenie, an expert curriculum designer and career mentor.
Create a personalized, practical, and highly motivating learning roadmap for the given topic and learner level.
Start from the appropriate fundamentals and progress toward advanced concepts.
Return strictly valid JSON adhering to this exact schema:
{
  "topic": "Topic Name",
  "level": "Beginner / Intermediate / Advanced",
  "estimated_timeline": "e.g., 6-8 Weeks (5 hrs/week)",
  "overview": "Concise summary of what the student will achieve.",
  "milestones": [
    {
      "step": 1,
      "title": "Milestone Title",
      "duration": "e.g., Weeks 1-2",
      "description": "Short milestone goal",
      "topics": ["Topic 1", "Topic 2", "Topic 3"],
      "practice_activities": ["Exercise 1", "Exercise 2"],
      "project": "Hands-on milestone project to build",
      "resources": [
        {"name": "Resource Name", "type": "Documentation / Course / Book / Platform"}
      ]
    }
  ],
  "capstone_project": {
    "title": "Capstone Project Title",
    "description": "Comprehensive project bringing everything together"
  },
  "pro_tips": [
    "Practical study advice or best practice"
  ]
}
Ensure there are 3 to 4 well-structured sequential milestones that are practical and easy to follow.
"""


def generate_learning_path(topic: str, level: str = "Beginner") -> Dict[str, Any]:
    """
    Generate a structured, personalized learning roadmap for a student.
    """
    if not topic or not topic.strip():
        return {
            "success": False,
            "error": "Empty topic",
            "message": "Please enter a topic to generate a learning path."
        }

    topic_clean = topic.strip()
    valid_levels = ["Beginner", "Intermediate", "Advanced"]
    selected_level = level.capitalize() if level and level.capitalize() in valid_levels else "Beginner"

    if not is_api_configured():
        return {
            "success": False,
            "error": "API Key Missing",
            "message": "Gemini API key is not configured. Please set GEMINI_API_KEY in the .env file."
        }

    prompt = f"""Create a personalized learning roadmap for:
Topic: "{topic_clean}"
Learner Level: "{selected_level}"

Include:
- Sequential milestones from appropriate baseline to mastery
- Core topics for each milestone
- Hands-on practice tasks
- Concrete milestone projects
- Top recommended learning resources
- Realistic timeline and capstone project

Return strictly valid JSON.
"""

    try:
        raw_response = generate_gemini_content(
            prompt=prompt,
            system_instruction=SYSTEM_PROMPT_ROADMAP,
            json_mode=True
        )
        data = clean_json_response(raw_response)

        # Validate structure
        milestones = data.get("milestones", [])
        if not isinstance(milestones, list) or len(milestones) == 0:
            raise ValueError("Roadmap response missing milestones list.")

        return {
            "success": True,
            "topic": data.get("topic", topic_clean),
            "level": selected_level,
            "timeline": data.get("estimated_timeline", "4-8 Weeks"),
            "overview": data.get("overview", f"Curated curriculum for {topic_clean}"),
            "milestones": milestones,
            "capstone_project": data.get("capstone_project", {}),
            "pro_tips": data.get("pro_tips", [])
        }

    except Exception as exc:
        logger.warning(f"Structured roadmap JSON failed, falling back to markdown generator: {exc}")
        try:
            fallback_prompt = f"""Create a personalized learning roadmap for the given topic and learner level. Start from the appropriate fundamentals and progress toward advanced concepts. Include topics, practice tasks, projects, resources and a realistic timeline.

Topic: {topic_clean}
Learner Level: {selected_level}

Please format with clear markdown headers, checklists, and bullet points."""

            text_response = generate_gemini_content(
                prompt=fallback_prompt,
                system_instruction="Create a comprehensive, easy-to-follow learning roadmap with topics, practice tasks, projects, resources, and timeline."
            )
            return {
                "success": True,
                "topic": topic_clean,
                "level": selected_level,
                "timeline": "Self-paced",
                "overview": f"Comprehensive roadmap for mastering {topic_clean}",
                "milestones": [],
                "raw_markdown": text_response
            }
        except Exception as fb_exc:
            logger.error(f"Fallback roadmap failed: {fb_exc}")
            return {
                "success": False,
                "error": "Roadmap Generation Failed",
                "message": str(fb_exc)
            }
