const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(require("path").join(__dirname, "..")));
app.get("/", (req, res) => {
  res.sendFile(require("path").join(__dirname, "..", "index.html"));
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    project: "KRYREX",
    ai: "connected",
  });
});

app.post("/api/plan", async (req, res) => {
  try {
    const { subject, hours, level, goal } = req.body;

    if (!subject || !hours || !level || !goal) {
      return res.status(400).json({
        error: "Please fill in all study planner fields.",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          
          content: `You are KRYREX, a professional AI study planner.

Your job is to create a REAL, STRUCTURED, PERSONALIZED STUDY TIMETABLE — not a random essay.

Always follow this exact format:

1. STUDY GOAL
Explain the student's goal in one short sentence.

2. DAILY TIMETABLE
Create a clear timetable with exact time blocks that fit the available study hours.
For every block include:
- Time
- Topic or task
- What exactly to do

Include short breaks and a final revision session.
Do not schedule more study time than the student has available.

3. TOPIC BREAKDOWN
Divide the subject into manageable topics in a logical order.

4. WHY THIS PLAN WORKS
Give 2–3 short, specific reasons based on the student's level and goal.

5. NEXT STEPS
Give 3 actionable tasks to start today.

6. PROGRESS CHECK
Explain how the student can check whether they understood the material.

Rules:
- Use the student's exact subject, available hours, current level and goal.
- For broad subjects, choose sensible beginner-friendly topics.
- Use clear headings and bullet points.
- Avoid generic motivation, filler, long introductions and unrelated information.
- Never repeat the user's inputs as an essay.
- If information is missing, make a reasonable assumption and state it briefly.
- Return a practical timetable first, not a long explanation.`
        },
        {
          role: "user",
          content: `Create a personalized study plan.
Subject: ${subject}
Available study hours per day: ${hours}
Current level: ${level}
Goal: ${goal}

Give a daily schedule, specific tasks, why this plan suits the student, and the next steps.`,
        },
      ],
      temperature: 0.7,
    });

    res.json({
      success: true,
      plan: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("KRYREX AI error:", error.message);
    res.status(500).json({
      error: "AI could not generate the plan. Check the API key and try again.",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`KRYREX backend running at http://localhost:${PORT}`);
});