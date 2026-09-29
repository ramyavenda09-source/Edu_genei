# 🎓 EduGenie – AI Learning Assistant

**EduGenie** is a complete, modern, responsive AI-powered educational web application designed to help students master academic concepts, ask questions, generate interactive quizzes, summarize study material, and build personalized learning paths.

Powered by **Google Gemini AI**, **Python FastAPI**, and **Jinja2**, EduGenie provides an intuitive, high-performance study companion with a sleek, distraction-free educational interface.

---

## 🌟 Key Features

| Feature | Description |
| :--- | :--- |
| ❓ **Ask Question (Q&A)** | Enter any academic question to receive student-friendly step-by-step explanations with relatable real-world examples. |
| 📖 **Explain a Topic** | Breaks down difficult topics into a simple beginner definition, core key takeaways, relatable everyday analogies, and a quick revision summary. |
| 🎯 **Quiz Generator** | Generates exactly 3 multiple-choice questions (4 options each) from any topic or pasted study material, featuring instant feedback and score tracking. |
| 📝 **Study Summarizer** | Condenses lengthy chapters and articles into high-yield exam revision notes, complete with word count reduction statistics. |
| 🗺️ **Learning Path** | Creates customized step-by-step roadmaps for Beginner, Intermediate, or Advanced levels, including timeline estimates, milestones, practice tasks, projects, and resources. |

---

## 🛠️ Technology Stack

- **Backend**: Python 3.10+ / 3.14+, FastAPI, Uvicorn
- **AI Integration**: Google GenAI SDK (`google-genai` / `google-generativeai`) with automated multi-model failover (`gemini-3.8-flash`, `gemini-flash-latest`, `gemini-3.5-flash`)
- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System, Glassmorphism, Dark/Light Themes), Modern Vanilla JavaScript (Fetch API)
- **Templating**: Jinja2
- **Markdown Rendering**: Marked.js

---

## 📂 Project Structure

```text
EduGenie/
│
├── main.py                   # FastAPI server entrypoint and route definitions
├── qna.py                    # Academic Q&A module using Gemini
├── explanation_module.py     # Beginner topic explanation module
├── quiz_module.py            # 3-MCQ quiz generator with validation
├── summary_module.py         # Study material revision summarizer
├── learning_path.py          # Structured learning roadmap generator
├── gemini_client.py          # Centralized Gemini AI client with fallback resilience
├── requirements.txt          # Python dependencies
├── .env.example              # Example environment configuration
├── .env                      # Active environment configuration (git-ignored)
├── .gitignore                # Git ignore rules protecting keys and cache
├── README.md                 # Setup guide and documentation
│
├── templates/
│   └── index.html            # Main Jinja2 dashboard template
│
└── static/
    ├── style.css             # Responsive styling, color tokens, animations
    └── script.js             # Client interactivity, API fetch handling, Quiz engine
```

---

## 🚀 Quickstart & Setup Instructions

### 1. Prerequisites
- Python 3.10 or newer (tested with Python 3.14)
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 2. Clone / Open the Project
Open terminal in the project directory:
```bash
cd c:\Users\ramya\project
```

### 3. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` (or configure `.env` directly):
```bash
# Windows PowerShell
Copy-Item .env.example .env
```
Inside `.env`, ensure your API key is specified:
```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-3.8-flash
```

### 5. Run the Server
Launch the FastAPI development server with hot-reload enabled:
```bash
uvicorn main:app --reload
```
Or run directly via python:
```bash
python main.py
```

### 6. Open in Browser
Visit:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 🔌 API Endpoints

All endpoints accept JSON payloads and return structured responses:

### 1. `POST /qa`
- **Request Body**:
  ```json
  { "question": "Why does ice float on liquid water?" }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "question": "Why does ice float on liquid water?",
    "answer": "### Why Ice Floats..."
  }
  ```

### 2. `POST /explain`
- **Request Body**:
  ```json
  { "topic": "Recursion in programming" }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "topic": "Recursion in programming",
    "definition": "A technique where a function solves a problem by calling itself.",
    "key_points": ["Base case is required", "Call stack management", "Breaks problems into sub-problems"],
    "example": "Russian nesting dolls (Matryoshka)",
    "summary": "Recursion solves complex problems by solving smaller instances of the same problem."
  }
  ```

### 3. `POST /quiz`
- **Request Body**:
  ```json
  { "content": "Photosynthesis and Plant Biology" }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "questions": [
      {
        "id": 1,
        "question": "Which pigment absorbs sunlight during photosynthesis?",
        "options": ["Chlorophyll", "Hemoglobin", "Melanin", "Keratin"],
        "answer": "Chlorophyll",
        "explanation": "Chlorophyll is the green pigment in chloroplasts responsible for photon absorption."
      }
    ]
  }
  ```

### 4. `POST /summarize`
- **Request Body**:
  ```json
  { "text": "Detailed excerpt from textbook..." }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "summary": "### Quick Overview\n...",
    "stats": {
      "original_word_count": 240,
      "summary_word_count": 85,
      "reduction_percentage": 65
    }
  }
  ```

### 5. `POST /learn/recommendations`
- **Request Body**:
  ```json
  {
    "topic": "Python Programming",
    "level": "Beginner"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "topic": "Python Programming",
    "level": "Beginner",
    "timeline": "6-8 Weeks",
    "milestones": [ ... ],
    "capstone_project": { ... }
  }
  ```

---

## 🔒 Security & Robustness

- **Zero Key Leaks**: The Gemini API key is kept strictly on the backend and is never sent to the client.
- **Failover Architecture**: In the event of high demand or temporary 503 spikes on a specific model, EduGenie automatically falls back through active models (`gemini-3.8-flash` ➔ `gemini-flash-latest` ➔ `gemini-3.5-flash`).
- **Resilient Parsing**: LLM JSON outputs are sanitized with code fence strippers and regex extractors to guarantee schema conformance.
- **Graceful Error Handling**: Network failures and rate limits render friendly, actionable warnings in the UI instead of crashing the server.

---

## 🎨 UI/UX Features

- **Adaptive Dark / Light Mode** with user preference persistence.
- **Instant Clipboard Actions** with toast notifications.
- **Interactive Quiz Engine**: Visual feedback with green/red states, live score tracking, and end-of-quiz mastery card.
- **Interactive Roadmaps**: Progress checkboxes so students can track completed milestones.
- **Keyboard Shortcuts**: `Ctrl + Enter` (or `Cmd + Enter`) anywhere inside input fields to trigger AI generation.

---

## 📄 License
MIT License. Built for education and student empowerment.
