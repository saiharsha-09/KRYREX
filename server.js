const express = require("express");
const cors = require("cors");
const path = require("path");
const Groq = require("groq-sdk");
require("dotenv").config({
path: path.join(__dirname, ".env")
});
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
const groq = process.env.GROQ_API_KEY
? new Groq({ apiKey: process.env.GROQ_API_KEY })
: null;
// Open the existing KRYREX website
app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "index.html"));
});
// Check backend status
app.get("/api/health", (req, res) => {
res.json({
status: "ok",
project: "KRYREX",
ai: groq ? "configured" : "missing API key"
});
});
// Generate an AI study plan
app.post("/api/plan", async (req, res) => {
try {
const { subject, hours, level, goal } = req.body || {};
if (!subject || !hours || !level || !goal) {
return res.status(400).json({
error: "Please fill in all study planner fields."
});
}
if (!groq) {
return res.status(503).json({
error: "GROQ_API_KEY is missing from your .env file."
});
}
const completion = await groq.chat.completions.create({
model: "openai/gpt-oss-120b",
temperature: 0.6,
messages: [
{
role: "system",
content:
"You are KRYREX AI, a study planner. Create realistic personalized study plans with a daily timetable, breaks, practice, revision, and measurable goals. Use clear headings and practical steps."
},
{
role: "user",
content:
"Subject: " + String(subject).slice(0, 150) +
"\nHours per day: " + String(hours).slice(0, 30) +
"\nLevel: " + String(level).slice(0, 100) +
"\nGoal: " + String(goal).slice(0, 500) +
"\nCreate a daily schedule, specific tasks, revision strategy, and first step."
}
]
});
const plan = completion.choices[0].message.content;
res.json({ success: true, plan });
} catch (error) {
console.error("KRYREX AI error:", error.message);
res.status(500).json({
error: "AI plan failed. Please check your API key and try again."
});
}
});

// KRYREX 2.0 AI ROUTES

async function askKryrex(systemPrompt, userPrompt) {
  if (!groq) {
    const error = new Error("AI is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: systemPrompt + "\n\nOutput rules: Write clean, readable text with normal spaces between every word. Never join separate words. Match the user's requested output directly: if they ask for an email, provide the email itself; if they ask for an explanation, explain it; if they ask for code, provide code. Keep simple questions concise. Use Markdown headings and bullets only when helpful. Do not add an unrelated lesson, quiz, or extra sections unless requested. Check spacing and formatting before responding."
      },
      { role: "user", content: userPrompt }
    ]
  });

  const answer = completion.choices?.[0]?.message?.content;
  if (!answer) throw new Error("Empty AI response.");
  return answer;
}

function handleKryrexError(res, error, feature) {
  console.error("KRYREX " + feature + " error:", error.message);
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.statusCode === 503
      ? "AI is unavailable. Check the server configuration."
      : "The AI request failed. Please try again."
  });
}

// Student performance analysis
app.post("/api/analyze", async (req, res) => {
  try {
    const { student, subjects } = req.body || {};

    if (!Array.isArray(subjects) || subjects.length === 0 || subjects.length > 50) {
      return res.status(400).json({
        success: false,
        error: "Provide between 1 and 50 subject records."
      });
    }

    const data = JSON.stringify({
      student: student || {},
      subjects: subjects
    }).slice(0, 10000);

    const analysis = await askKryrex(
      "You are KRYREX AI Student Analyst. Identify strengths, weak areas, study priorities, and practical improvements. Be supportive, specific, and never shame the student. Clearly distinguish evidence from assumptions.",
      "Analyze this student data and return: Overall Assessment, Strengths, Weak Topics, Priority Actions, and a 7-day improvement plan. Data: " + data
    );

    res.json({ success: true, analysis });
  } catch (error) {
    handleKryrexError(res, error, "Student Analysis");
  }
});

// Identify weak topics from scores or confidence ratings
app.post("/api/weak-topics", async (req, res) => {
  try {
    const { topics } = req.body || {};

    if (!Array.isArray(topics) || topics.length === 0 || topics.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Provide between 1 and 100 topic records."
      });
    }

    const result = await askKryrex(
      "You are KRYREX AI, an educational diagnostic assistant. Use the supplied scores and confidence ratings to prioritize topics. Do not invent missing scores. Explain uncertainty when data is incomplete.",
      "Analyze these topics: " + JSON.stringify(topics).slice(0, 10000) +
      ". Return strongest topics, weakest topics, priority ranking, and a practical revision exercise for each weak topic."
    );

    res.json({ success: true, result });
  } catch (error) {
    handleKryrexError(res, error, "Weak Topics");
  }
});

// Reschedule unfinished or missed study tasks
app.post("/api/reschedule", async (req, res) => {
  try {
    const { examDate, hoursPerDay, tasks, missedTasks, constraints } = req.body || {};

    if (!examDate || !Array.isArray(tasks) || tasks.length === 0 || tasks.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Provide an exam date and a task list."
      });
    }

    if (!Number.isFinite(Number(hoursPerDay)) ||
        Number(hoursPerDay) <= 0 || Number(hoursPerDay) > 16) {
      return res.status(400).json({
        success: false,
        error: "Daily study hours must be greater than 0 and at most 16."
      });
    }

    const result = await askKryrex(
      "You are KRYREX AI Smart Rescheduler. Create realistic study schedules with breaks, revision, and practice. Prioritize overdue high-value tasks, avoid double-booking, and never schedule more than the user's available daily hours.",
      "Exam date: " + String(examDate).slice(0, 40) +
      "\nHours available per day: " + Number(hoursPerDay) +
      "\nAll tasks: " + JSON.stringify(tasks).slice(0, 7000) +
      "\nMissed tasks: " + JSON.stringify(missedTasks || []).slice(0, 4000) +
      "\nConstraints: " + JSON.stringify(constraints || {}).slice(0, 2000) +
      "\nReturn a day-by-day rescheduled plan, priorities, breaks, and a recovery strategy."
    );

    res.json({ success: true, schedule: result });
  } catch (error) {
    handleKryrexError(res, error, "Smart Rescheduling");
  }
});


function formatTimetableTimes(text) {
  return String(text).replace(/\b([01]?\d|2[0-3])\s*[: ]\s*([0-5]\d)\b(?!\s*(?:AM|PM)\b)/gi, (_, hh, mm) => {
    const hour = Number(hh);
    return `${hour % 12 || 12}:${mm} ${hour < 12 ? "AM" : "PM"}`;
  });
}

// Dedicated Study Timetable Creator
app.post("/api/timetable", async (req, res) => {
  try {
    const { subject, hours, startTime, examDate, tasks } = req.body || {};

    if (!subject || !hours || !startTime || !tasks) {
      return res.status(400).json({
        success: false,
        error: "Please fill in all required timetable fields."
      });
    }

    const answer = await askKryrex(
      "Create a clean, compact study timetable in Markdown table format only. No introduction, no paragraphs, no headings before the table. Use exactly these four columns: | Date | Time (AM/PM) | Duration | Task |. Use a Markdown separator row. Put one short activity in each row and order all rows chronologically. Use 12-hour times with exactly one AM or PM per time, for example 5:00 PM – 5:45 PM. Never use 24-hour times. Use the provided start time as the first activity's start. Keep the entire plan within the available daily study hours. Include focused study, a 5-minute break, and practice/revision. Keep task descriptions short and easy to understand. Do not invent an exam time. Output the table only.",
      "Subject: " + String(subject).slice(0, 500) +
      "\\nAvailable study hours per day: " + String(hours).slice(0, 10) +
      "\\nStart time: " + String(startTime).slice(0, 20) +
      "\\nExam date: " + String(examDate || "Not provided").slice(0, 30) +
      "\\nTopics and tasks:\\n" + String(tasks).slice(0, 4000)
    );

    res.json({ success: true, answer: formatTimetableTimes(answer) });
  } catch (error) {
    handleKryrexError(res, error, "Study Timetable Creator");
  }
});

// AI Doubt Solver
app.post("/api/doubt", async (req, res) => {
  try {
    const { question, subject, level, context } = req.body || {};

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter your question."
      });
    }

    const answer = await askKryrex(
      "You are KRYREX AI Doubt Solver, a helpful general-purpose assistant. Answer the user's actual request directly, across any subject or task. If they ask a question, answer it. If they ask for an email, provide the email itself. If they ask for code, provide the code. If they ask for a summary, provide the summary. Never generate a study timetable, study plan, exam schedule, student analysis, or weak-topic report unless the user explicitly requests that specific thing. Do not add unrelated sections, quizzes, or follow-up activities. Use clear headings or bullets only when useful. Keep normal spaces between all words and use readable paragraphs. Match the user's requested language and level.",
      "Subject: " + String(subject || "General").slice(0, 100) +
      "\\nStudent level: " + String(level || "Not specified").slice(0, 100) +
      "\\nContext: " + String(context || "").slice(0, 2000) +
      "\\nUser request: " + question.trim().slice(0, 5000)
    );

    res.json({ success: true, answer });
  } catch (error) {
    handleKryrexError(res, error, "Doubt Solver");
  }
});

// Exam countdown calculation
app.post("/api/exam-countdown", (req, res) => {
  const { examDate } = req.body || {};

  if (typeof examDate !== "string" || !examDate.trim()) {
    return res.status(400).json({
      success: false,
      error: "Please provide an exam date."
    });
  }

  const dateParts = examDate.split("-").map(Number);
  const [year, month, day] = dateParts;
  const target = new Date(year, month - 1, day);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(examDate) ||
    Number.isNaN(target.getTime()) ||
    target.getFullYear() !== year ||
    target.getMonth() !== month - 1 ||
    target.getDate() !== day
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid exam date."
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  res.json({
    success: true,
    daysRemaining: Math.ceil((target - today) / 86400000),
    examDate: examDate
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log("KRYREX backend running at http://localhost:" + PORT);
});
