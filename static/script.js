/**
 * EduGenie – AI Learning Assistant Frontend Logic
 * Modern, responsive, interactive client script.
 */

// Global State
const appState = {
  currentSection: 'dashboard-section',
  quizData: null,
  quizAnswers: {},
  quizScore: 0,
  theme: localStorage.getItem('edugenie-theme') || 'dark'
};

// ==========================================
// Initialization & Theme Setup
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  document.documentElement.setAttribute('data-theme', appState.theme);

  // Set Marked options if library loaded
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  // Setup Keyboard Shortcuts (Ctrl+Enter to submit)
  setupKeyboardShortcuts();

  // Check initial API status
  checkApiStatus();
});

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const nextTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  appState.theme = nextTheme;
  localStorage.setItem('edugenie-theme', nextTheme);
  showToast(`Switched to ${nextTheme} mode`, 'info');
}

async function checkApiStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const pill = document.getElementById('apiStatusPill');
    if (pill) {
      if (data.api_configured) {
        pill.className = 'status-pill status-active';
        pill.querySelector('.status-text').textContent = 'Gemini AI Active';
      } else {
        pill.className = 'status-pill status-warning';
        pill.querySelector('.status-text').textContent = 'API Key Needed';
      }
    }
  } catch (err) {
    console.warn('Status check unreachable:', err);
  }
}

// ==========================================
// Navigation Controller
// ==========================================
function navigateTo(sectionId) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active-section');
  });

  // Show target section
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add('active-section');
    appState.currentSection = sectionId;
  }

  // Update navbar button states
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-target') === sectionId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Scroll smoothly to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDashboardHome() {
  navigateTo('dashboard-section');
}

// ==========================================
// Toast Notification System
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Utility: copy text to clipboard
async function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage, 'success');
  } catch (err) {
    // Fallback for older browsers
    const temp = document.createElement('textarea');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    showToast(successMessage, 'success');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(text) {
  if (typeof marked !== 'undefined') {
    return marked.parse(text || '');
  }
  return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
}

// ==========================================
// 1. Q&A / Ask Questions Module
// ==========================================
function setQnaPrompt(prompt) {
  const el = document.getElementById('qnaInput');
  el.value = prompt;
  el.focus();
}

function clearQna() {
  document.getElementById('qnaInput').value = '';
  document.getElementById('qnaResultCard').innerHTML = `
    <div class="empty-placeholder">
      <div class="placeholder-icon">💡</div>
      <h3>Your answer will appear here</h3>
      <p>Ask any academic question above and EduGenie will craft a tailored explanation with examples.</p>
    </div>
  `;
  document.getElementById('qnaResultCard').classList.add('empty-state');
}

async function submitQnA() {
  const inputEl = document.getElementById('qnaInput');
  const question = inputEl.value.trim();

  if (!question) {
    showToast('Please type an academic question first.', 'error');
    inputEl.focus();
    return;
  }

  const resultCard = document.getElementById('qnaResultCard');
  const submitBtn = document.getElementById('qnaSubmitBtn');

  submitBtn.disabled = true;
  resultCard.classList.remove('empty-state');
  resultCard.innerHTML = `
    <div class="loading-box">
      <div class="spinner-orb"></div>
      <div class="loading-text">EduGenie is crafting your answer...</div>
      <div class="loading-subtext">Consulting academic models for step-by-step clarity</div>
    </div>
  `;

  try {
    const res = await fetch('/qa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const data = await res.json();

    if (!data.success) {
      resultCard.innerHTML = `
        <div class="empty-placeholder">
          <div class="placeholder-icon">⚠️</div>
          <h3 style="color: var(--error)">Could Not Complete Request</h3>
          <p>${escapeHtml(data.message || 'An error occurred while communicating with Gemini AI.')}</p>
          <div style="margin-top: 1rem">
            <button class="btn btn-secondary" onclick="submitQnA()">Try Again</button>
          </div>
        </div>
      `;
      showToast(data.message || 'Failed to generate answer', 'error');
      return;
    }

    const answerHtml = renderMarkdown(data.answer);

    resultCard.innerHTML = `
      <div class="result-header-bar">
        <div class="result-badge">
          <span>✨</span> EduGenie Solution
        </div>
        <div class="result-actions">
          <button class="action-icon-btn" onclick="copyQnaAnswer()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Answer</span>
          </button>
          <button class="action-icon-btn" onclick="submitQnA()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            <span>Regenerate</span>
          </button>
        </div>
      </div>
      <div class="formatted-answer" id="qnaAnswerText">
        ${answerHtml}
      </div>
    `;

    // Store raw text for copying
    resultCard.dataset.rawAnswer = data.answer;
    showToast('Explanation ready!', 'success');

  } catch (err) {
    resultCard.innerHTML = `
      <div class="empty-placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3 style="color: var(--error)">Connection Error</h3>
        <p>Could not connect to EduGenie server. Make sure the FastAPI backend is running.</p>
      </div>
    `;
    showToast('Server connection failed', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

function copyQnaAnswer() {
  const card = document.getElementById('qnaResultCard');
  const text = card.dataset.rawAnswer || card.innerText;
  copyToClipboard(text, 'Answer copied to clipboard!');
}

// ==========================================
// 2. Explain Topic Module
// ==========================================
function setExplainTopic(topic) {
  const el = document.getElementById('explainInput');
  el.value = topic;
  el.focus();
}

function clearExplain() {
  document.getElementById('explainInput').value = '';
  document.getElementById('explainResultCard').innerHTML = `
    <div class="empty-placeholder">
      <div class="placeholder-icon">📖</div>
      <h3>Topic breakdown ready to generate</h3>
      <p>Enter any topic above to view a definition, core key points, everyday analogy, and revision summary.</p>
    </div>
  `;
  document.getElementById('explainResultCard').classList.add('empty-state');
}

async function submitExplain() {
  const inputEl = document.getElementById('explainInput');
  const topic = inputEl.value.trim();

  if (!topic) {
    showToast('Please enter a topic to explain.', 'error');
    inputEl.focus();
    return;
  }

  const resultCard = document.getElementById('explainResultCard');
  const submitBtn = document.getElementById('explainSubmitBtn');

  submitBtn.disabled = true;
  resultCard.classList.remove('empty-state');
  resultCard.innerHTML = `
    <div class="loading-box">
      <div class="spinner-orb"></div>
      <div class="loading-text">Simplifying "${escapeHtml(topic)}"...</div>
      <div class="loading-subtext">Structuring definitions, key points, analogies & recap</div>
    </div>
  `;

  try {
    const res = await fetch('/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });

    const data = await res.json();

    if (!data.success) {
      resultCard.innerHTML = `
        <div class="empty-placeholder">
          <div class="placeholder-icon">⚠️</div>
          <h3 style="color: var(--error)">Explanation Failed</h3>
          <p>${escapeHtml(data.message || 'Unable to explain this topic right now.')}</p>
          <div style="margin-top: 1rem">
            <button class="btn btn-secondary" onclick="submitExplain()">Try Again</button>
          </div>
        </div>
      `;
      showToast(data.message || 'Explanation failed', 'error');
      return;
    }

    // Build structured output cards
    let contentHtml = '';

    if (data.full_text) {
      // Markdown fallback
      contentHtml = `<div class="formatted-answer">${renderMarkdown(data.full_text)}</div>`;
    } else {
      const keyPointsList = (data.key_points || [])
        .map(pt => `<li>${escapeHtml(pt)}</li>`)
        .join('');

      contentHtml = `
        <div class="explanation-blocks">
          <!-- 1. Definition -->
          <div class="explain-box box-def">
            <div class="box-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg>
              <span>Simple Definition</span>
            </div>
            <p style="font-size: 1rem; font-weight: 500;">${escapeHtml(data.definition)}</p>
          </div>

          <!-- 2. Key Points -->
          <div class="explain-box box-points">
            <div class="box-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              <span>Key Points to Remember</span>
            </div>
            <ul class="explain-points-list">
              ${keyPointsList}
            </ul>
          </div>

          <!-- 3. Real World Example -->
          <div class="explain-box box-example">
            <div class="box-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
              <span>Real-World Example / Analogy</span>
            </div>
            <p style="font-style: italic;">${escapeHtml(data.example)}</p>
          </div>

          <!-- 4. Quick Summary -->
          <div class="explain-box box-summary">
            <div class="box-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
              <span>Quick Revision Summary</span>
            </div>
            <p>${escapeHtml(data.summary)}</p>
          </div>
        </div>
      `;
    }

    resultCard.innerHTML = `
      <div class="result-header-bar">
        <div class="result-badge">
          <span>📚</span> Topic: ${escapeHtml(data.topic)}
        </div>
        <div class="result-actions">
          <button class="action-icon-btn" onclick="copyExplainText()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          </button>
          <button class="action-icon-btn" onclick="submitExplain()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            <span>Try Again</span>
          </button>
        </div>
      </div>
      ${contentHtml}
    `;

    // Save formatted representation for copy
    const rawToCopy = `TOPIC: ${data.topic}\n\nDEFINITION:\n${data.definition}\n\nKEY POINTS:\n${(data.key_points || []).join('\n')}\n\nEXAMPLE:\n${data.example}\n\nSUMMARY:\n${data.summary}`;
    resultCard.dataset.rawExplanation = rawToCopy;
    showToast('Topic explained successfully!', 'success');

  } catch (err) {
    resultCard.innerHTML = `
      <div class="empty-placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3 style="color: var(--error)">Connection Error</h3>
        <p>Could not reach EduGenie server. Please check your connection.</p>
      </div>
    `;
    showToast('Connection error', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

function copyExplainText() {
  const card = document.getElementById('explainResultCard');
  const text = card.dataset.rawExplanation || card.innerText;
  copyToClipboard(text, 'Explanation copied to clipboard!');
}

// ==========================================
// 3. Quiz Generator Module
// ==========================================
function setQuizTopic(topic) {
  const el = document.getElementById('quizInput');
  el.value = topic;
  el.focus();
}

function clearQuiz() {
  document.getElementById('quizInput').value = '';
  document.getElementById('quizResultCard').innerHTML = `
    <div class="empty-placeholder">
      <div class="placeholder-icon">🎯</div>
      <h3>Test your knowledge</h3>
      <p>Provide a topic or paste material above to generate a 3-question MCQ quiz with immediate scoring.</p>
    </div>
  `;
  document.getElementById('quizResultCard').classList.add('empty-state');
  appState.quizData = null;
  appState.quizAnswers = {};
  appState.quizScore = 0;
}

async function submitQuiz() {
  const inputEl = document.getElementById('quizInput');
  const content = inputEl.value.trim();

  if (!content) {
    showToast('Please enter a topic or paste material for the quiz.', 'error');
    inputEl.focus();
    return;
  }

  const resultCard = document.getElementById('quizResultCard');
  const submitBtn = document.getElementById('quizSubmitBtn');

  submitBtn.disabled = true;
  resultCard.classList.remove('empty-state');
  resultCard.innerHTML = `
    <div class="loading-box">
      <div class="spinner-orb"></div>
      <div class="loading-text">Generating 3-Question MCQ Quiz...</div>
      <div class="loading-subtext">Formulating plausible options, answers, and explanations</div>
    </div>
  `;

  // Reset quiz state
  appState.quizAnswers = {};
  appState.quizScore = 0;

  try {
    const res = await fetch('/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });

    const data = await res.json();

    if (!data.success || !data.questions || data.questions.length === 0) {
      resultCard.innerHTML = `
        <div class="empty-placeholder">
          <div class="placeholder-icon">⚠️</div>
          <h3 style="color: var(--error)">Quiz Generation Failed</h3>
          <p>${escapeHtml(data.message || 'Could not generate quiz questions.')}</p>
          <div style="margin-top: 1rem">
            <button class="btn btn-secondary" onclick="submitQuiz()">Try Again</button>
          </div>
        </div>
      `;
      showToast(data.message || 'Failed to create quiz', 'error');
      return;
    }

    appState.quizData = data.questions;
    renderQuizUI();
    showToast('Quiz ready! Good luck!', 'success');

  } catch (err) {
    resultCard.innerHTML = `
      <div class="empty-placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3 style="color: var(--error)">Connection Error</h3>
        <p>Could not connect to EduGenie server.</p>
      </div>
    `;
    showToast('Quiz request failed', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

function renderQuizUI() {
  const resultCard = document.getElementById('quizResultCard');
  const questions = appState.quizData || [];
  const answeredCount = Object.keys(appState.quizAnswers).length;

  let questionsHtml = '';
  const letters = ['A', 'B', 'C', 'D'];

  questions.forEach((q, qIndex) => {
    const isAnswered = appState.quizAnswers.hasOwnProperty(qIndex);
    const userAnswer = appState.quizAnswers[qIndex];

    let optionsHtml = '';
    q.options.forEach((opt, optIndex) => {
      let optionClass = 'quiz-option-btn';
      let disabledAttr = '';

      if (isAnswered) {
        disabledAttr = 'disabled';
        if (opt === q.answer) {
          optionClass += ' correct-choice';
        } else if (opt === userAnswer) {
          optionClass += ' wrong-choice';
        }
      }

      optionsHtml += `
        <button class="${optionClass}" ${disabledAttr} onclick="selectQuizAnswer(${qIndex}, '${escapeHtml(opt)}')">
          <span class="option-letter">${letters[optIndex] || '•'}</span>
          <span class="option-text">${escapeHtml(opt)}</span>
        </button>
      `;
    });

    let explanationHtml = '';
    if (isAnswered && q.explanation) {
      const isCorrect = userAnswer === q.answer;
      explanationHtml = `
        <div class="quiz-explanation-box">
          <strong>${isCorrect ? '✅ Correct!' : '❌ Incorrect.'}</strong>
          ${escapeHtml(q.explanation)}
        </div>
      `;
    }

    questionsHtml += `
      <div class="quiz-card" id="questionCard-${qIndex}">
        <div class="quiz-question-title">
          <span class="question-num">Q${qIndex + 1}.</span>
          <span>${escapeHtml(q.question)}</span>
        </div>
        <div class="quiz-options-grid">
          ${optionsHtml}
        </div>
        ${explanationHtml}
      </div>
    `;
  });

  // Final summary if all answered
  let finalCardHtml = '';
  if (answeredCount === questions.length) {
    const pct = Math.round((appState.quizScore / questions.length) * 100);
    let message = 'Keep practicing, you will master it!';
    if (pct === 100) message = 'Outstanding! Perfect Score! 🏆';
    else if (pct >= 66) message = 'Great job! Strong understanding! 🌟';

    finalCardHtml = `
      <div class="quiz-final-card">
        <div class="final-score-circle">${appState.quizScore}/${questions.length}</div>
        <div class="final-message">${message}</div>
        <p class="final-subtext">You scored ${pct}% on this quiz.</p>
        <button class="btn btn-primary" onclick="submitQuiz()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
          <span>Retake / Generate New Quiz</span>
        </button>
      </div>
    `;
  }

  resultCard.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-score-header">
        <div>
          <span class="quiz-progress-text">Answered ${answeredCount} of ${questions.length}</span>
        </div>
        <div class="score-badge">
          Score: ${appState.quizScore} / ${questions.length}
        </div>
      </div>
      <div class="quiz-questions-list">
        ${questionsHtml}
      </div>
      ${finalCardHtml}
    </div>
  `;
}

function selectQuizAnswer(qIndex, selectedOption) {
  if (appState.quizAnswers.hasOwnProperty(qIndex)) return;

  const question = appState.quizData[qIndex];
  appState.quizAnswers[qIndex] = selectedOption;

  if (selectedOption === question.answer) {
    appState.quizScore += 1;
    showToast('Correct answer! +1 point', 'success');
  } else {
    showToast(`Incorrect! The correct answer was "${question.answer}"`, 'error');
  }

  renderQuizUI();
}

// ==========================================
// 4. Summarizer Module
// ==========================================
function updateWordCount() {
  const text = document.getElementById('summaryInput').value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  document.getElementById('inputWordCount').textContent = `${words} words`;
}

function loadSampleSummaryText() {
  const sample = `Photosynthesis is a crucial biological process utilized by green plants, algae, and cyanobacteria to convert light energy from the sun into chemical energy. This chemical energy is stored in carbohydrate molecules, particularly glucose and starches, which are synthesized from water (absorbed via roots) and carbon dioxide (absorbed via stomata in leaves). Photosynthesis occurs primarily inside chloroplasts containing chlorophyll, the green pigment that absorbs light photons. The overall process releases oxygen gas as a vital byproduct, supporting aerobic respiration across virtually all planetary ecosystems. The reaction is divided into light-dependent reactions (which generate ATP and NADPH) and the Calvin cycle (light-independent reactions, which fix carbon into sugar). Without photosynthesis, Earth's atmospheric oxygen would deplete, disrupting global food webs.`;
  const el = document.getElementById('summaryInput');
  el.value = sample;
  updateWordCount();
  el.focus();
}

function clearSummary() {
  document.getElementById('summaryInput').value = '';
  updateWordCount();
  document.getElementById('summaryResultCard').innerHTML = `
    <div class="empty-placeholder">
      <div class="placeholder-icon">📝</div>
      <h3>Concise revision summary will appear here</h3>
      <p>Paste notes on the left to extract core definitions, facts, and exam takeaways.</p>
    </div>
  `;
  document.getElementById('summaryResultCard').classList.add('empty-state');
}

async function submitSummary() {
  const inputEl = document.getElementById('summaryInput');
  const text = inputEl.value.trim();

  if (!text) {
    showToast('Please paste text or study notes to summarize.', 'error');
    inputEl.focus();
    return;
  }

  const resultCard = document.getElementById('summaryResultCard');
  const submitBtn = document.getElementById('summarySubmitBtn');

  submitBtn.disabled = true;
  resultCard.classList.remove('empty-state');
  resultCard.innerHTML = `
    <div class="loading-box">
      <div class="spinner-orb"></div>
      <div class="loading-text">EduGenie is condensing your notes...</div>
      <div class="loading-subtext">Preserving key definitions and filtering out repetition</div>
    </div>
  `;

  try {
    const res = await fetch('/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await res.json();

    if (!data.success) {
      resultCard.innerHTML = `
        <div class="empty-placeholder">
          <div class="placeholder-icon">⚠️</div>
          <h3 style="color: var(--error)">Summarization Failed</h3>
          <p>${escapeHtml(data.message || 'Unable to summarize provided text.')}</p>
          <div style="margin-top: 1rem">
            <button class="btn btn-secondary" onclick="submitSummary()">Try Again</button>
          </div>
        </div>
      `;
      showToast(data.message || 'Summarization failed', 'error');
      return;
    }

    const stats = data.stats || {};
    const summaryHtml = renderMarkdown(data.summary);

    resultCard.innerHTML = `
      <div class="result-header-bar">
        <div class="result-badge">
          <span>⚡</span> Exam-Ready Summary
        </div>
        <div class="result-actions">
          <button class="action-icon-btn" onclick="copySummaryText()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Summary</span>
          </button>
          <button class="action-icon-btn" onclick="submitSummary()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            <span>Re-summarize</span>
          </button>
        </div>
      </div>

      <div class="summary-stats-bar">
        <div class="summary-stat-pill">
          <span>Original:</span>
          <strong>${stats.original_word_count || 0} words</strong>
        </div>
        <div class="summary-stat-pill">
          <span>Summary:</span>
          <strong>${stats.summary_word_count || 0} words</strong>
        </div>
        <div class="summary-stat-pill">
          <span>Compression:</span>
          <strong>${stats.reduction_percentage || 0}% more concise</strong>
        </div>
      </div>

      <div class="formatted-answer">
        ${summaryHtml}
      </div>
    `;

    resultCard.dataset.rawSummary = data.summary;
    showToast('Summary generated!', 'success');

  } catch (err) {
    resultCard.innerHTML = `
      <div class="empty-placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3 style="color: var(--error)">Connection Error</h3>
        <p>Could not reach the server.</p>
      </div>
    `;
    showToast('Connection failed', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

function copySummaryText() {
  const card = document.getElementById('summaryResultCard');
  const text = card.dataset.rawSummary || card.innerText;
  copyToClipboard(text, 'Summary copied to clipboard!');
}

// ==========================================
// 5. Learning Path Module
// ==========================================
function setLearnTopic(topic) {
  const el = document.getElementById('learnTopicInput');
  el.value = topic;
  el.focus();
}

function updateLevelPills(radio) {
  document.querySelectorAll('.level-pill').forEach(pill => {
    pill.classList.remove('active');
  });
  radio.closest('.level-pill').classList.add('active');
}

function clearLearn() {
  document.getElementById('learnTopicInput').value = '';
  document.getElementById('learnResultCard').innerHTML = `
    <div class="empty-placeholder">
      <div class="placeholder-icon">🗺️</div>
      <h3>Your roadmap is ready to build</h3>
      <p>Pick a topic and skill level on the left to receive a custom curriculum with practical milestones and projects.</p>
    </div>
  `;
  document.getElementById('learnResultCard').classList.add('empty-state');
}

async function submitLearningPath() {
  const inputEl = document.getElementById('learnTopicInput');
  const topic = inputEl.value.trim();

  if (!topic) {
    showToast('Please enter a topic to create a roadmap.', 'error');
    inputEl.focus();
    return;
  }

  const levelRadio = document.querySelector('input[name="learnerLevel"]:checked');
  const level = levelRadio ? levelRadio.value : 'Beginner';

  const resultCard = document.getElementById('learnResultCard');
  const submitBtn = document.getElementById('learnSubmitBtn');

  submitBtn.disabled = true;
  resultCard.classList.remove('empty-state');
  resultCard.innerHTML = `
    <div class="loading-box">
      <div class="spinner-orb"></div>
      <div class="loading-text">Designing ${escapeHtml(level)} Roadmap for "${escapeHtml(topic)}"...</div>
      <div class="loading-subtext">Sequencing milestones, practice drills, capstone project & curated resources</div>
    </div>
  `;

  try {
    const res = await fetch('/learn/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level })
    });

    const data = await res.json();

    if (!data.success) {
      resultCard.innerHTML = `
        <div class="empty-placeholder">
          <div class="placeholder-icon">⚠️</div>
          <h3 style="color: var(--error)">Roadmap Failed</h3>
          <p>${escapeHtml(data.message || 'Unable to build roadmap right now.')}</p>
          <div style="margin-top: 1rem">
            <button class="btn btn-secondary" onclick="submitLearningPath()">Try Again</button>
          </div>
        </div>
      `;
      showToast(data.message || 'Roadmap generation failed', 'error');
      return;
    }

    let roadmapBodyHtml = '';

    if (data.raw_markdown) {
      // Fallback markdown format
      roadmapBodyHtml = `<div class="formatted-answer">${renderMarkdown(data.raw_markdown)}</div>`;
    } else {
      const milestones = data.milestones || [];
      let stepsHtml = '';

      milestones.forEach((m, idx) => {
        const topicsList = (m.topics || [])
          .map((t, tIdx) => `
            <label class="topic-check-item" onclick="toggleTopicDone(this)">
              <input type="checkbox">
              <span>${escapeHtml(t)}</span>
            </label>
          `)
          .join('');

        const resourcesHtml = (m.resources || [])
          .map(r => `<span class="resource-tag">📖 ${escapeHtml(typeof r === 'string' ? r : r.name)}</span>`)
          .join('');

        stepsHtml += `
          <div class="roadmap-step">
            <div class="step-marker"></div>
            <div class="step-header">
              <div class="step-title">Stage ${idx + 1}: ${escapeHtml(m.title)}</div>
              <div class="step-duration">${escapeHtml(m.duration || '2 Weeks')}</div>
            </div>
            ${m.description ? `<p class="step-desc">${escapeHtml(m.description)}</p>` : ''}

            <div class="topics-checklist">
              ${topicsList}
            </div>

            ${m.project ? `
              <div class="step-project-card">
                <strong>🛠️ Milestone Project:</strong>
                <span>${escapeHtml(m.project)}</span>
              </div>
            ` : ''}

            ${resourcesHtml ? `
              <div class="step-resources">
                ${resourcesHtml}
              </div>
            ` : ''}
          </div>
        `;
      });

      // Capstone project card
      let capstoneHtml = '';
      if (data.capstone_project && data.capstone_project.title) {
        capstoneHtml = `
          <div class="capstone-card">
            <div class="capstone-title">🏆 Capstone Project: ${escapeHtml(data.capstone_project.title)}</div>
            <p style="font-size: 0.9rem; color: var(--text-muted);">${escapeHtml(data.capstone_project.description || '')}</p>
          </div>
        `;
      }

      roadmapBodyHtml = `
        <div class="roadmap-overview-box">
          <div class="roadmap-header-stats">
            <span class="roadmap-badge">${escapeHtml(data.level)}</span>
            <span class="roadmap-time">⏱️ Estimated: ${escapeHtml(data.timeline)}</span>
          </div>
          <p style="font-size: 0.92rem; color: var(--text-muted);">${escapeHtml(data.overview)}</p>
        </div>

        <div class="roadmap-timeline">
          ${stepsHtml}
        </div>

        ${capstoneHtml}
      `;
    }

    resultCard.innerHTML = `
      <div class="result-header-bar">
        <div class="result-badge">
          <span>🗺️</span> ${escapeHtml(data.topic)} Roadmap
        </div>
        <div class="result-actions">
          <button class="action-icon-btn" onclick="copyRoadmapText()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Roadmap</span>
          </button>
          <button class="action-icon-btn" onclick="submitLearningPath()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            <span>Rebuild</span>
          </button>
        </div>
      </div>
      ${roadmapBodyHtml}
    `;

    resultCard.dataset.rawRoadmap = JSON.stringify(data, null, 2);
    showToast('Learning path assembled!', 'success');

  } catch (err) {
    resultCard.innerHTML = `
      <div class="empty-placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3 style="color: var(--error)">Connection Error</h3>
        <p>Could not connect to EduGenie server.</p>
      </div>
    `;
    showToast('Roadmap connection failed', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

function toggleTopicDone(labelEl) {
  const checkbox = labelEl.querySelector('input[type="checkbox"]');
  if (checkbox) {
    if (checkbox.checked) {
      labelEl.classList.add('completed');
    } else {
      labelEl.classList.remove('completed');
    }
  }
}

function copyRoadmapText() {
  const card = document.getElementById('learnResultCard');
  copyToClipboard(card.innerText, 'Roadmap text copied to clipboard!');
}

// ==========================================
// Keyboard Shortcuts
// ==========================================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const activeElement = document.activeElement;
      if (activeElement) {
        if (activeElement.id === 'qnaInput') submitQnA();
        else if (activeElement.id === 'explainInput') submitExplain();
        else if (activeElement.id === 'quizInput') submitQuiz();
        else if (activeElement.id === 'summaryInput') submitSummary();
        else if (activeElement.id === 'learnTopicInput') submitLearningPath();
      }
    }
  });
}
