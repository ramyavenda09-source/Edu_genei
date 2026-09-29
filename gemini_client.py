import os
import time
import json
import logging
import re
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger("edugenie.gemini")

# Priority list of modern, active models
# Priority list of modern, active models with high quota availability and speed
AVAILABLE_MODELS = [
    os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite"),
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.8-flash"
]
DEFAULT_MODEL = AVAILABLE_MODELS[0]



def get_api_key() -> Optional[str]:
    """Retrieve Gemini API key from environment variables."""
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


def is_api_configured() -> bool:
    """Check if a valid non-empty API key is present."""
    key = get_api_key()
    return bool(key and key.strip() and not key.startswith("YOUR_") and len(key.strip()) > 10)


def get_genai_client():
    """Create and return an initialized Google GenAI client."""
    key = get_api_key()
    if not key or not key.strip():
        raise ValueError(
            "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file."
        )

    from google import genai
    return genai.Client(api_key=key.strip())


def generate_gemini_content(
    prompt: str,
    system_instruction: Optional[str] = None,
    json_mode: bool = False,
    model: Optional[str] = None
) -> str:
    """
    Generate content using the official Google GenAI SDK.
    Supports system instructions and JSON structured responses.
    Includes automated failover and backoff for maximum resilience.
    """
    if not is_api_configured():
        raise ValueError(
            "Gemini API Key is missing. Please provide your GEMINI_API_KEY in the .env file."
        )

    client = get_genai_client()
    from google.genai import types

    config_kwargs = {}
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction
    if json_mode:
        config_kwargs["response_mime_type"] = "application/json"

    config = types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

    # Determine unique candidate models sequence
    models_to_try = [model] if model else []
    for m in AVAILABLE_MODELS:
        if m and m not in models_to_try:
            models_to_try.append(m)

    last_error: Optional[Exception] = None

    for candidate_model in models_to_try:
        # Attempt with candidate model
        try:
            response = client.models.generate_content(
                model=candidate_model,
                contents=prompt,
                config=config
            )
            if response and response.text:
                return response.text.strip()
        except Exception as exc:
            last_error = exc
            err_str = str(exc)
            logger.warning(
                f"Model '{candidate_model}' failed: {err_str[:120]}"
            )

            # If invalid API key or 403, don't keep cycling models
            if "API_KEY_INVALID" in err_str or "invalid api key" in err_str.lower() or "PERMISSION_DENIED" in err_str:
                raise RuntimeError("Invalid Gemini API key. Please check GEMINI_API_KEY in your .env file.") from exc

            # For 429 (rate/quota limit), 503 (high demand), or 404 (not found), continue to try next model in fallback list
            continue

    # If all models exhausted
    if last_error:
        err_msg = str(last_error)
        if "503" in err_msg or "UNAVAILABLE" in err_msg:
            raise RuntimeError(
                "Gemini AI service is currently experiencing high demand. Please try again in a few moments."
            )
        elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            raise RuntimeError(
                "Gemini API rate limit or quota exceeded across models. Please wait a moment and try again."
            )
        raise RuntimeError(f"Gemini AI error: {err_msg}")
    
    raise RuntimeError("Unable to generate response from Gemini. Please try again.")


def clean_json_response(raw_text: str) -> Dict[str, Any]:
    """
    Robust JSON parser for LLM outputs.
    Strips markdown code fences (```json ... ```) and extracts valid JSON.
    """
    cleaned = raw_text.strip()

    # Strip markdown fences if present
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Regex extraction of JSON block
        json_match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        raise ValueError("Could not parse valid JSON from the AI response.")
