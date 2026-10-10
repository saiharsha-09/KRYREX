from pathlib import Path
import shutil

p = Path("index.html")
s = p.read_text()
backup = Path("index.html.pre-upgrade")
if not backup.exists():
    shutil.copy2(p, backup)

css = r"""
/* KRYREX glass study workspace */
#plannerResult.show{display:block;white-space:normal;border:0;padding:0;background:transparent}
.kx-workspace{display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);gap:18px;margin-top:20px}
.kx-panel{min-width:0;padding:22px;border:1px solid #b99a624d;border-radius:20px;background:linear-gradient(145deg,#ffffff0b,#ffffff03);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 18px 55px #0006}
.kx-eyebrow{font-size:10px;letter-spacing:2.5px;color:#e6bd72;text-transform:uppercase}
.kx-panel h3{font-size:21px;margin:10px 0 18px;color:#f8edda}
.kx-task{display:flex;gap:11px;align-items:flex-start;padding:13px;margin:9px 0;border:1px solid #ffffff12;border-radius:12px;background:#ffffff05;color:#ddd;font-size:13px;line-height:1.6;cursor:pointer}
.kx-task input{accent-color:#e6bd72;margin-top:4px;flex-shrink:0}
.kx-task:has(input:checked){color:#a99b81;background:#e6bd720b}
.kx-track{height:5px;background:#ffffff12;border-radius:9px;overflow:hidden;margin:12px 0}
.kx-track div{height:100%;width:0;background:linear-gradient(90deg,#b78536,#ffe4a3);transition:width .3s}
.kx-lesson{min-height:220px;padding:22px 0;animation:kxIn .25s ease}
.kx-lesson h4{font-size:clamp(21px,3vw,30px);line-height:1.25;color:#f7dfac;margin:12px 0}
.kx-lesson p{font-size:14px;line-height:1.9;color:#c9c4ba;white-space:pre-wrap}
.kx-nav{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:14px}
.kx-nav button,.kx-sound{border:1px solid #b99a6270;background:#ffffff08;color:#f4d79d;border-radius:30px;padding:11px 15px;cursor:pointer}
.kx-nav button:disabled{opacity:.3;cursor:default}
.kx-count{font-size:11px;color:#aaa}
.kx-sound{font-size:10px;letter-spacing:1px;margin-top:12px}
@keyframes kxIn{from{opacity:.3;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:650px){.kx-workspace{grid-template-columns:1fr}.kx-panel{padding:17px}}
"""

start = s.find("function renderChecklist(plan) {")
end = s.find("document.getElementById('plannerForm').addEventListener", start)
if start < 0 or end < 0:
    raise SystemExit("Could not locate planner code. Original file unchanged.")

js = r'''function renderChecklist(plan) {
  const result = document.getElementById('plannerResult');
  result.replaceChildren();

  const lines = String(plan).split(/\r?\n/);
  const schedule = [];
  const topics = [];
  let section = '';
  let currentTopic = null;

  function clean(line) {
    return line.trim()
      .replace(/^#{1,6}\s*/, '')
      .replace(/^\*\*(.*?)\*\*$/, '$1')
      .replace(/^\s*(?:[-*•]\s+)+/, '')
      .replace(/\*\*/g, '').trim();
  }

  function heading(text) {
    return /^(?:\d+[.)]\s*)?(?:STUDY GOAL|DAILY TIMETABLE|TOPIC BREAKDOWN|WHY THIS PLAN WORKS|NEXT STEPS|PROGRESS CHECK)\s*:?\s*$/i.test(text);
  }

  for (const raw of lines) {
    const text = clean(raw);
    if (!text || /^[-_=*.\s]{3,}$/.test(text)) continue;
    if (heading(text)) {
      section = text.replace(/^\d+[.)]\s*/, '').replace(/:$/, '').toUpperCase();
      currentTopic = null;
      continue;
    }
    const time = text.match(/^((?:\d{1,2}(?::\d{2})?\s*(?:AM|PM)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)?))\s*[:|—-]?\s*(.*)$/i);
    if (time) {
      schedule.push({time:time[1].trim(),text:time[2].trim() || 'Study session'});
      continue;
    }
    const bullet = /^[-*•]\s+/.test(raw) || /^\d+[.)]\s+/.test(raw);
    if (section.includes('TOPIC BREAKDOWN')) {
      if (bullet || !currentTopic) {
        currentTopic = {title:text.replace(/^\d+[.)]\s*/, ''),body:[]};
        topics.push(currentTopic);
      } else {
        currentTopic.body.push(text);
      }
    } else if (section.includes('DAILY TIMETABLE')) {
      schedule.push({time:'Study task',text});
    } else if (!section || section.includes('STUDY GOAL')) {
      if (topics.length === 0) topics.push({title:'Your study goal',body:[]});
      topics[0].body.push(text);
    } else if (topics.length) {
      topics[topics.length-1].body.push(text);
    }
  }

  if (!schedule.length) {
    schedule.push({time:'SESSION 01',text:'Review the goal and learn the first concept'});
    schedule.push({time:'SESSION 02',text:'Practise questions and review your notes'});
  }
  if (!topics.length) {
    topics.push({title:'Understand the basics',body:['Start with the fundamental ideas.','Practise one example, then explain the concept in your own words.']});
  }

  const workspace = document.createElement('div');
  workspace.className = 'kx-workspace';
  workspace.innerHTML = `
    <section class="kx-panel">
      <div class="kx-eyebrow">01 / Your schedule</div>
      <h3>Study timetable</h3>
      <div class="kx-count" id="kx-progress">0 of ${schedule.length} completed</div>
      <div class="kx-track"><div id="kx-fill"></div></div>
      <div id="kx-tasks"></div>
    </section>
    <section class="kx-panel">
      <div class="kx-eyebrow">02 / Learn step by step</div>
      <h3>Topic briefing</h3>
      <div class="kx-count" id="kx-topic-count"></div>
      <article class="kx-lesson" id="kx-lesson" aria-live="polite"></article>
      <div class="kx-nav">
        <button type="button" id="kx-prev">← Previous</button>
        <button type="button" id="kx-next">Next →</button>
      </div>
      <button type="button" class="kx-sound" id="kx-sound">SOUND: OFF</button>
    </section>`;
  result.appendChild(workspace);

  const tasks = workspace.querySelector('#kx-tasks');
  const fill = workspace.querySelector('#kx-fill');
  const progress = workspace.querySelector('#kx-progress');
  const lesson = workspace.querySelector('#kx-lesson');
  const topicCount = workspace.querySelector('#kx-topic-count');
  const prev = workspace.querySelector('#kx-prev');
  const next = workspace.querySelector('#kx-next');
  const soundButton = workspace.querySelector('#kx-sound');
  let soundOn = false;
  let topicIndex = 0;
  let audio;

  function tone(freq, duration) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.045, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch (_) {}
  }

  function updateProgress() {
    const boxes = tasks.querySelectorAll('input');
    const done = tasks.querySelectorAll('input:checked').length;
    progress.textContent = `${done} of ${boxes.length} completed`;
    fill.style.width = `${boxes.length ? done / boxes.length * 100 : 0}%`;
  }

  schedule.forEach((item, index) => {
    const label = document.createElement('label');
    label.className = 'kx-task';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.addEventListener('change', () => {
      updateProgress();
      tone(box.checked ? 740 : 420, 0.12);
      if (box.checked && tasks.querySelectorAll('input:checked').length === schedule.length) {
        tone(660, 0.18);
        setTimeout(() => tone(880, 0.24), 160);
      }
    });
    const text = document.createElement('span');
    text.textContent = `${item.time}  ·  ${item.text}`;
    label.append(box, text);
    tasks.appendChild(label);
  });

  function showTopic() {
    const topic = topics[topicIndex];
    lesson.replaceChildren();
    const title = document.createElement('h4');
    title.textContent = topic.title;
    lesson.appendChild(title);
    const body = topic.body.length ? topic.body : ['Focus on this concept, make short notes, and try one practice question.'];
    body.forEach(line => {
      const p = document.createElement('p');
      p.textContent = line;
      lesson.appendChild(p);
    });
    topicCount.textContent = `TOPIC ${topicIndex+1} OF ${topics.length}`;
    prev.disabled = topicIndex === 0;
    next.disabled = topicIndex === topics.length-1;
  }

  prev.addEventListener('click', () => {
    if (topicIndex > 0) { topicIndex--; showTopic(); tone(500,0.1); }
  });
  next.addEventListener('click', () => {
    if (topicIndex < topics.length-1) { topicIndex++; showTopic(); tone(620,0.1); }
  });
  soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    soundButton.textContent = `SOUND: ${soundOn ? 'ON' : 'OFF'}`;
    if (soundOn) tone(660,0.12);
  });
  updateProgress();
  showTopic();
}

'''
s = s[:start] + js + s[end:]
if '/* KRYREX glass study workspace */' not in s:
    s = s.replace('</style>', css + '\n</style>', 1)
p.write_text(s)
print("KRYREX workspace upgraded. Backup: index.html.pre-upgrade")
