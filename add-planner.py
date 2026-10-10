from pathlib import Path
import shutil


p = Path.home() / "KRYREX" / "index.html"
s = p.read_text()

if 'id="ai-planner"' in s:
    print("Planner already exists.")
    raise SystemExit

backup = p.with_name("index.html.backup")
shutil.copy2(p, backup)

css = """
.planner-section{position:relative;z-index:2;padding:70px 6%;background:#090806;border-block:1px solid #80643b}
.planner-shell{max-width:800px;margin:auto;padding:28px;border:1px solid #80643b;border-radius:18px;background:#0b0b0d}
.planner-shell h2{font-size:clamp(30px,5vw,48px)}
.planner-shell h2 span{color:#e6bd72}
.planner-form{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.planner-field{display:flex;flex-direction:column;gap:8px}
.planner-field label{color:#e6bd72;font-size:11px;letter-spacing:2px}
.planner-field input,.planner-field select,.planner-field textarea{box-sizing:border-box;width:100%;padding:13px;background:#090909;color:white;border:1px solid #51432d;border-radius:8px}
.planner-field textarea{min-height:80px}
.planner-field.full,.planner-form button{grid-column:1/-1}
.planner-form button{padding:15px;border:0;border-radius:30px;background:linear-gradient(90deg,#f2d99e,#c99442);font-weight:bold;cursor:pointer}
#plannerStatus{color:#e6bd72;margin-top:15px}
#plannerResult{display:none;white-space:pre-wrap;line-height:1.7;color:#eee;border:1px solid #51432d;padding:18px;margin-top:15px;overflow-wrap:anywhere}
#plannerResult.show{display:block}
@media(max-width:600px){.planner-form{grid-template-columns:1fr}.planner-field.full,.planner-form button{grid-column:auto}}
"""

html = """
<section class="planner-section" id="ai-planner">
<div class="planner-shell">
<p style="color:#e6bd72;letter-spacing:3px">KRYREX INTELLIGENCE</p>
<h2>Your goals.<br><span>Engineered into a plan.</span></h2>
<p style="color:#aaa">Your personal AI study planner.</p>
<form class="planner-form" id="plannerForm">
<div class="planner-field"><label>SUBJECT</label><input name="subject" placeholder="Python, Physics..." required></div>
<div class="planner-field"><label>HOURS PER DAY</label><select name="hours"><option>1 hour</option><option selected>2 hours</option><option>3 hours</option><option>4 hours</option><option>5+ hours</option></select></div>
<div class="planner-field"><label>LEVEL</label><select name="level"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
<div class="planner-field full"><label>YOUR GOAL</label><textarea name="goal" placeholder="What do you want to achieve?" required></textarea></div>
<button id="planSubmit" type="submit">GENERATE MY AI STUDY PLAN ↗</button>
</form>
<div id="plannerStatus" role="status"></div>
<div id="plannerResult"></div>
</div>
</section>
"""

js = """
document.getElementById('plannerForm').addEventListener('submit', async function(e) {
e.preventDefault();
const form = new FormData(this);
const button = document.getElementById('planSubmit');
const status = document.getElementById('plannerStatus');
const result = document.getElementById('plannerResult');
button.disabled = true;
button.textContent = 'GENERATING...';
status.textContent = 'KRYREX AI is thinking...';
result.classList.remove('show');
try {
const response = await fetch('/api/plan', {
method: 'POST',
headers: {'Content-Type': 'application/json'},
body: JSON.stringify({
subject: form.get('subject'),
hours: form.get('hours'),
level: form.get('level'),
goal: form.get('goal')
})
});
const data = await response.json();
if (!response.ok || !data.success) throw new Error(data.error || 'Request failed');
result.textContent = data.plan;
result.classList.add('show');
status.textContent = 'YOUR PLAN IS READY';
} catch (err) {
status.textContent = err.message;
} finally {
button.disabled = false;
button.textContent = 'GENERATE MY AI STUDY PLAN ↗';
}
});
"""

for marker in ("</style>", '<section class="final" id="contact">', "</script>"):
    if marker not in s:
        raise SystemExit("Required HTML section missing. Original file unchanged.")

s = s.replace("</style>", css + "\n</style>", 1)
s = s.replace('<section class="final" id="contact">', html + '\n<section class="final" id="contact">', 1)
s = s.replace("</script>", js + "\n</script>", 1)

p.write_text(s)
print("KRYREX AI planner added successfully.")
print("Backup saved:", backup)
