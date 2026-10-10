<WritingBlock id="62741" variant="document">```js
const express = require("express");
const cors = require("cors");
const path = require("path");
const Groq = require("groq-sdk");
require("dotenv").config({
path: path.join(__dirname, "../.env")
});
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
const groq = process.env.GROQ_API_KEY
? new Groq({ apiKey: process.env.GROQ_API_KEY })
: null;
// Open the existing KRYREX website
app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "../index.html"));
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log("KRYREX backend running at http://localhost:" + PORT);
});