// ── CONFIG ──────────────────────────────────────────────────────────
// Change this password before sharing with your team.
const TEAM_PASSWORD = 'deck2025';

// ── STATE ────────────────────────────────────────────────────────────
let persons = [], results = {}, aggData = null, counter = 0;

// ── AUTH ──────────────────────────────────────────────────────────────
function checkPassword() {
  const val = document.getElementById('lock-input').value;
  if (val === TEAM_PASSWORD) {
    const lock = document.getElementById('lock-screen');
    lock.classList.add('fade-out');
    setTimeout(() => {
      lock.style.display = 'none';
      sessionStorage.getItem('ddi_key') ? showApp() : showSetup();
    }, 450);
  } else {
    const inp = document.getElementById('lock-input');
    inp.classList.add('error');
    document.getElementById('lock-err').textContent = 'Incorrect password.';
    setTimeout(() => inp.classList.remove('error'), 350);
    inp.value = '';
  }
}
document.getElementById('lock-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkPassword();
});

function showSetup() {
  const s = document.getElementById('setup-screen');
  s.classList.add('visible');
  s.classList.remove('fade-out');
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key.startsWith('sk-')) {
    document.getElementById('api-key-input').style.borderColor = 'var(--rose)';
    return;
  }
  sessionStorage.setItem('ddi_key', key);
  const setup = document.getElementById('setup-screen');
  setup.classList.add('fade-out');
  setTimeout(() => { setup.classList.remove('visible'); showApp(); }, 400);
}
document.getElementById('api-key-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveApiKey();
});

function showApp() {
  document.getElementById('app').classList.add('visible');
  if (persons.length === 0) { addPerson(); addPerson(); }
}

function lockApp() { sessionStorage.removeItem('ddi_key'); location.reload(); }

function clearApiKey() {
  sessionStorage.removeItem('ddi_key');
  document.getElementById('app').classList.remove('visible');
  showSetup();
}

// ── PERSONS ───────────────────────────────────────────────────────────
function initials(n) {
  return (n || '').trim().split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
}

function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addPerson() {
  counter++;
  persons.push({ id: 'p' + counter, name: '', transcript: '' });
  renderPersons();
}

function removePerson(id) {
  persons = persons.filter(p => p.id !== id);
  renderPersons();
}

function renderPersons() {
  const c = document.getElementById('persons-container');
  c.innerHTML = '';
  persons.forEach(p => {
    const d = document.createElement('div');
    d.className = 'person-card';
    d.innerHTML = `
      <div class="person-header">
        <div class="avatar" id="av-${p.id}">${p.name ? initials(p.name) : '?'}</div>
        <div style="flex:1;">
          <input class="name-input" placeholder="Rep name or alias" value="${esc(p.name)}"
            oninput="updateField('${p.id}','name',this.value)" />
          <div style="font-size:12px;color:var(--ink3);">Interview transcript</div>
        </div>
        <button class="remove-btn" onclick="removePerson('${p.id}')">✕</button>
      </div>
      <div class="transcript-label">
        Paste or drop transcript below
        <label class="upload-label">↑ Upload file<input type="file" accept=".txt,.md,.docx" style="display:none" onchange="fileChosen('${p.id}',this)"></label>
      </div>
      <div class="drop-zone" id="dz-${p.id}"
        ondragover="dzOver(event,'${p.id}')"
        ondragleave="dzLeave(event,'${p.id}')"
        ondrop="dzDrop(event,'${p.id}')">
        <textarea class="transcript-area"
          placeholder="Paste the full interview here — or drag and drop a .txt or .docx file."
          oninput="updateField('${p.id}','transcript',this.value)">${esc(p.transcript)}</textarea>
        <div class="drop-overlay"><span>Drop file to load transcript</span></div>
      </div>`;
    c.appendChild(d);
  });
  document.getElementById('person-count').textContent =
    `${persons.length} rep${persons.length !== 1 ? 's' : ''} added`;
}

function updateField(id, field, val) {
  const p = persons.find(x => x.id === id);
  if (!p) return;
  p[field] = val;
  if (field === 'name') {
    const av = document.getElementById('av-' + id);
    if (av) av.textContent = val ? initials(val) : '?';
  }
}

// ── FILE HANDLING ─────────────────────────────────────────────────────
function dzOver(e, id) {
  e.preventDefault();
  document.getElementById('dz-' + id).classList.add('drag-over');
}

function dzLeave(e, id) {
  const dz = document.getElementById('dz-' + id);
  if (!dz.contains(e.relatedTarget)) dz.classList.remove('drag-over');
}

function dzDrop(e, id) {
  e.preventDefault();
  document.getElementById('dz-' + id).classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(id, file);
}

function fileChosen(id, input) {
  if (input.files[0]) loadFile(id, input.files[0]);
  input.value = '';
}

async function loadFile(id, file) {
  const ext = file.name.split('.').pop().toLowerCase();
  let text = '';
  try {
    if (ext === 'docx') {
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      text = result.value;
    } else {
      text = await file.text();
    }
  } catch (err) {
    setStatus('Could not read file: ' + err.message, false);
    return;
  }
  updateField(id, 'transcript', text);
  const ta = document.querySelector('#dz-' + id + ' textarea');
  if (ta) ta.value = text;
}

// ── PROMPTS ───────────────────────────────────────────────────────────
const INDIVIDUAL_PROMPT = (name, transcript) => `You are analyzing a sales rep interview transcript to extract feedback about a demo deck. This rep has used the deck with real prospects.

Rep: ${name}

TRANSCRIPT:
${transcript}

The interviewer asked four questions, but the conversation may wander. Extract ALL deck-relevant feedback — both from the direct answers and anything mentioned in passing.

Return ONLY valid JSON (no markdown, no explanation):
{
  "summary": "2-3 sentence overview of this rep's overall perspective on the deck",
  "confusion_points": ["specific moment or slide where prospects get confused"],
  "company_size_fit": ["observation about how deck works for a specific size/type"],
  "objections_raised": ["objection that came up with prospects, as they actually said it or close to it"],
  "repeated_questions": ["question prospects keep asking during or after the demo"],
  "other_deck_insights": ["any other feedback relevant to refreshing the deck — pacing, missing content, ordering, tone, visuals, stories, anything"],
  "recommended_fixes": ["specific, actionable change to the deck based on this rep's feedback"],
  "notable": "one sentence capturing what is most distinctive about this rep's experience with the deck"
}

Be specific. Quote or closely paraphrase what the rep actually said where possible. 3-6 items per array.`;

const AGGREGATE_PROMPT = (n, allText) => `You are a senior sales enablement leader synthesizing feedback from ${n} sales reps about a demo deck. All reps have used the deck with real prospects.

${allText}

Extract patterns, prioritize ruthlessly, and surface everything needed to refresh the deck.

For each item in confusion_points, company_size_fit, objections_raised, repeated_questions, other_deck_insights, and recommended_fixes, estimate what percentage of the ${n} reps raised or would agree with that point (as a whole number 0-100).

Return ONLY valid JSON (no markdown, no explanation):
{
  "executive_summary": "3-4 sentence synthesis: overall health of the deck, biggest issues, and most important opportunities",
  "confusion_points": [{"text": "confusion point seen across multiple reps or notably severe — most common first", "pct": 75}],
  "company_size_fit": [{"text": "pattern about which company sizes/types the deck works well or poorly for", "pct": 60}],
  "objections_raised": [{"text": "objection that came up with multiple reps or is strategically important", "pct": 50}],
  "repeated_questions": [{"text": "question prospects keep asking — signals something missing or unclear in the deck", "pct": 80}],
  "other_deck_insights": [{"text": "cross-rep pattern not captured above that is relevant to a deck refresh", "pct": 40}],
  "recommended_fixes": [{"text": "specific, prioritized deck change — highest impact first. Be concrete: slide, section, or element to change and how", "pct": 70}],
  "high_priority_fixes": ["top 3 fixes that would have the most immediate impact on prospect engagement"],
  "rep_divergence": ["area where reps disagreed or had notably different experiences — useful context for stakeholders"]
}

4-7 items per array. Sort each category by pct descending. Be direct and specific.`;

// ── ANALYSIS ──────────────────────────────────────────────────────────
async function analyzeAll() {
  const valid = persons.filter(p => p.transcript.trim().length > 30);
  if (!valid.length) { setStatus('Add at least one transcript first.', false); return; }
  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  try {
    for (let i = 0; i < valid.length; i++) {
      const p = valid[i];
      setStatus(`Analyzing ${p.name || 'rep ' + (i + 1)} (${i + 1} of ${valid.length})…`, true);
      const r = await callClaude(INDIVIDUAL_PROMPT(p.name || 'Rep ' + (i + 1), p.transcript));
      results[p.id] = { ...p, ...r };
    }
    setStatus('Building aggregate report…', true);
    const allText = valid.map(p => `Rep: ${p.name || 'Rep'}\n${p.transcript}`).join('\n\n---\n\n');
    aggData = await callClaude(AGGREGATE_PROMPT(valid.length, allText));
    renderAggregate();
    renderIndividuals();
    setStatus(`Done. ${valid.length} rep${valid.length !== 1 ? 's' : ''} analyzed.`, false);
    showTab('aggregate');
  } catch (e) {
    setStatus('Error: ' + e.message, false);
  }
  btn.disabled = false;
}

async function callClaude(prompt) {
  const key = sessionStorage.getItem('ddi_key');
  if (!key) throw new Error('No API key. Reload and enter your key.');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error?.message || `API error ${r.status}`);
  }
  const data = await r.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```/g, '').trim());
}

function setStatus(msg, loading) {
  document.getElementById('status-bar').innerHTML = loading
    ? `<div class="spinner"></div><span>${msg}</span>`
    : `<span>${msg}</span>`;
}

// ── RENDER ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'confusion_points',    label: 'Where prospects get confused',   tagCls: 't-confusion', dotCls: 'dot-confusion', colCls: 'c-confusion' },
  { key: 'company_size_fit',    label: 'Company size & fit',             tagCls: 't-company',   dotCls: 'dot-company',   colCls: 'c-company'   },
  { key: 'objections_raised',   label: 'Objections that come up',        tagCls: 't-objection', dotCls: 'dot-objection', colCls: 'c-objection' },
  { key: 'repeated_questions',  label: 'Questions prospects keep asking', tagCls: 't-question',  dotCls: 'dot-question',  colCls: 'c-question'  },
  { key: 'other_deck_insights', label: 'Other deck insights',            tagCls: 't-extra',     dotCls: 'dot-extra',     colCls: 'c-extra'     },
  { key: 'recommended_fixes',   label: 'Recommended fixes',              tagCls: 't-fix',       dotCls: 'dot-fix',       colCls: 'c-fix'       },
];

const BAR_COLORS = {
  confusion_points:    'var(--rose)',
  company_size_fit:    'var(--slate)',
  objections_raised:   'var(--amber)',
  repeated_questions:  'var(--navy2)',
  other_deck_insights: 'var(--teal)',
  recommended_fixes:   'var(--gold)',
};

let currentView = 'long';

function setView(v) {
  currentView = v;
  document.getElementById('vtoggle-long').classList.toggle('active', v === 'long');
  document.getElementById('vtoggle-condensed').classList.toggle('active', v === 'condensed');
  if (aggData) renderAggregate();
}

function blockOf(label, items, tagCls, dotCls, colCls, asList = false) {
  if (!items?.length) return '';
  const isObj = items[0] && typeof items[0] === 'object';
  if (asList) {
    return `<div class="result-block">
      <div class="block-label ${colCls}"><div class="block-dot ${dotCls}"></div>${esc(label)}</div>
      <ul class="insight-list">${items.map(t => `<li style="color:var(--ink2);">${esc(isObj ? t.text : t)}</li>`).join('')}</ul>
    </div>`;
  }
  return `<div class="result-block">
    <div class="block-label ${colCls}"><div class="block-dot ${dotCls}"></div>${esc(label)}</div>
    <div class="tag-wrap">${items.map(t => `<span class="tag ${tagCls}">${esc(isObj ? t.text : t)}</span>`).join('')}</div>
  </div>`;
}

function pctBlockOf(label, items, catKey, dotCls, colCls) {
  if (!items?.length) return '';
  const barColor = BAR_COLORS[catKey] || 'var(--navy2)';
  const isObj = items[0] && typeof items[0] === 'object';
  const rows = items.map(t => {
    const text = isObj ? t.text : t;
    const pct  = isObj ? (t.pct || 0) : 0;
    return `<div class="pct-row">
      <div class="pct-label">${esc(text)}</div>
      <div class="pct-bar-wrap">
        <div class="pct-bar-bg"><div class="pct-bar-fill" style="width:${pct}%;background:${barColor};"></div></div>
        <div class="pct-num">${pct}%</div>
      </div>
    </div>`;
  }).join('');
  return `<div class="result-block">
    <div class="block-label ${colCls}"><div class="block-dot ${dotCls}"></div>${esc(label)}</div>
    ${rows}
  </div>`;
}

function renderAggregate() {
  const r = aggData;
  const condensed = currentView === 'condensed';

  let html = `<div class="result-block">
    <div class="block-label" style="color:var(--navy2);"><div class="block-dot" style="background:var(--navy2);"></div>Executive summary</div>
    <div class="prose">${esc(r.executive_summary || '')}</div>
  </div>`;

  if (r.high_priority_fixes?.length) {
    html += `<div class="result-block" style="border-color:#c8d5e8;background:var(--navy-light);">
      <div class="block-label" style="color:var(--navy);"><div class="block-dot" style="background:var(--navy);"></div>Top priority fixes <span class="priority-badge pri-high">High impact</span></div>
      <ul class="insight-list">${r.high_priority_fixes.map(t => `<li style="color:var(--navy2);">${esc(t)}</li>`).join('')}</ul>
    </div>`;
  }

  if (!condensed) {
    CATEGORIES.forEach(c => {
      const useList = ['objections_raised', 'repeated_questions', 'other_deck_insights', 'recommended_fixes'].includes(c.key);
      html += blockOf(c.label, r[c.key], c.tagCls, c.dotCls, c.colCls, useList);
    });
    if (r.rep_divergence?.length) {
      html += blockOf('Where reps disagreed', r.rep_divergence, 't-extra', 'dot-extra', 'c-extra', true);
    }
  } else {
    if (r.recommended_fixes?.length) {
      html += blockOf('Recommended fixes', r.recommended_fixes, 't-fix', 'dot-fix', 'c-fix', true);
    }
  }

  document.getElementById('agg-results').innerHTML = html;
  document.getElementById('agg-empty').style.display = 'none';
  document.getElementById('agg-content').style.display = 'block';
  buildConf(r);
}

function renderIndividuals() {
  const r = aggData;
  if (!r) return;
  let html = '';
  CATEGORIES.forEach(c => {
    html += pctBlockOf(c.label, r[c.key], c.key, c.dotCls, c.colCls);
  });
  document.getElementById('ind-results').innerHTML = html;
  document.getElementById('ind-empty').style.display = 'none';
  document.getElementById('ind-content').style.display = 'block';
}

// ── CONFIDENTIAL TEXT EXPORT ──────────────────────────────────────────
function buildConf(r) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let o = `DEMO DECK FEEDBACK REPORT — CONFIDENTIAL\n${date}\nRep names removed.\n\n`;
  o += `EXECUTIVE SUMMARY\n${r.executive_summary}\n\n`;
  if (r.high_priority_fixes?.length) {
    o += `TOP PRIORITY FIXES\n${r.high_priority_fixes.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n`;
  }
  const itemText = x => (x && typeof x === 'object') ? `${x.text} (${x.pct}% of reps)` : x;
  const sections = [
    ['WHERE PROSPECTS GET CONFUSED',      r.confusion_points],
    ['COMPANY SIZE & FIT',                r.company_size_fit],
    ['OBJECTIONS RAISED',                 r.objections_raised],
    ['QUESTIONS PROSPECTS KEEP ASKING',   r.repeated_questions],
    ['OTHER DECK INSIGHTS',               r.other_deck_insights],
    ['RECOMMENDED FIXES',                 r.recommended_fixes],
    ['WHERE REPS DISAGREED',              r.rep_divergence],
  ];
  sections.forEach(([label, arr]) => {
    if (arr?.length) o += `${label}\n${arr.map((x, i) => `${i + 1}. ${itemText(x)}`).join('\n')}\n\n`;
  });
  document.getElementById('conf-text').textContent = o.trim();
}

function toggleConf() {
  const el = document.getElementById('conf-panel');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function copyConf() {
  navigator.clipboard.writeText(document.getElementById('conf-text').textContent).then(() => {
    const b = document.querySelector('.copy-btn');
    b.textContent = 'Copied!';
    setTimeout(() => b.textContent = 'Copy to clipboard', 2000);
  });
}

// ── PDF DOWNLOAD ──────────────────────────────────────────────────────
function downloadPDF() {
  if (!aggData) { alert('Run the analysis first.'); return; }
  const btn = document.getElementById('pdf-btn');
  btn.textContent = 'Generating…';
  btn.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const PW = 612, PH = 792, ML = 48, MR = 48, MT = 52, CW = 612 - 48 - 48;
    let y = MT;

    const C = {
      navy:   [0,   56,  101], navy2:  [0,   91,  150],
      ink:    [24,  24,  26],  ink2:   [66,  66,  74], ink3: [136, 136, 150],
      paper2: [236, 234, 228], white:  [255, 255, 255],
      rose:   [92,  31,  31],  roseL:  [245, 232, 232],
      slate:  [42,  53,  69],  slateL: [234, 236, 240],
      amber:  [92,  61,  14],  amberL: [245, 237, 223],
      navy2L: [222, 238, 248],
      teal:   [0,   156, 222], tealL:  [221, 241, 251],
      gold:   [107, 79,  18],  goldL:  [247, 240, 224],
    };

    const BAR_CAT = {
      confusion_points:    { bar: C.rose,  bg: C.roseL  },
      company_size_fit:    { bar: C.slate, bg: C.slateL },
      objections_raised:   { bar: C.amber, bg: C.amberL },
      repeated_questions:  { bar: C.navy2, bg: C.navy2L },
      other_deck_insights: { bar: C.teal,  bg: C.tealL  },
      recommended_fixes:   { bar: C.gold,  bg: C.goldL  },
    };

    const CAT_LABELS = {
      confusion_points:    'Where Prospects Get Confused',
      company_size_fit:    'Company Size & Fit',
      objections_raised:   'Objections That Come Up',
      repeated_questions:  'Questions Prospects Keep Asking',
      other_deck_insights: 'Other Deck Insights',
      recommended_fixes:   'Recommended Fixes',
    };

    const setRGB  = arr => doc.setTextColor(arr[0], arr[1], arr[2]);
    const setFill = arr => doc.setFillColor(arr[0], arr[1], arr[2]);
    const setDraw = arr => doc.setDrawColor(arr[0], arr[1], arr[2]);

    function checkPage(need = 40) {
      if (y + need > PH - 40) { doc.addPage(); y = MT; }
    }

    function drawWrappedText(text, x, maxW, fontSize, color, lineH) {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(String(text || ''), maxW);
      setRGB(color);
      lines.forEach(line => { checkPage(lineH); doc.text(line, x, y); y += lineH; });
    }

    function sectionHeader(label, dotColor) {
      checkPage(30); y += 6;
      setFill(dotColor);
      doc.circle(ML + 5, y - 4, 3.5, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); setRGB(C.ink3);
      doc.text(label.toUpperCase(), ML + 14, y);
      y += 16; doc.setFont('helvetica', 'normal');
    }

    function divider() {
      checkPage(20); setDraw(C.paper2);
      doc.setLineWidth(0.5); doc.line(ML, y, PW - MR, y); y += 14;
    }

    // Header bar
    setFill(C.navy); doc.rect(0, 0, PW, 72, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); setRGB(C.white);
    doc.text('Demo Deck Intelligence', ML, 32);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); setRGB([180, 200, 220]);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Full Report  ·  ${dateStr}  ·  CONFIDENTIAL`, ML, 52);
    y = 96;

    // Executive summary
    sectionHeader('Executive Summary', C.navy2);
    doc.setFont('helvetica', 'normal');
    drawWrappedText(aggData.executive_summary || '', ML, CW, 10.5, C.ink2, 15);
    y += 8;

    // Top priority fixes
    if (aggData.high_priority_fixes?.length) {
      divider();
      sectionHeader('Top Priority Fixes', C.navy);
      const bItems = aggData.high_priority_fixes;
      doc.setFontSize(10);
      const itemLines = bItems.map(item => doc.splitTextToSize(item, CW - 30));
      const bH = itemLines.reduce((sum, lines) => sum + Math.max(18, lines.length * 13 + 4), 0) + 20;
      checkPage(bH + 10);
      setFill(C.navy2L); doc.roundedRect(ML, y - 4, CW, bH, 4, 4, 'F');
      bItems.forEach((item, i) => {
        const lines = itemLines[i];
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); setRGB(C.navy2);
        doc.text(`${i + 1}.`, ML + 10, y + 10);
        doc.setFont('helvetica', 'normal'); setRGB(C.navy);
        lines.forEach((ln, li) => doc.text(ln, ML + 24, y + 10 + li * 13));
        y += Math.max(18, lines.length * 13 + 4);
      });
      y += 10;
    }

    // Category sections with percentage bars
    const catKeys = ['confusion_points','company_size_fit','objections_raised','repeated_questions','other_deck_insights','recommended_fixes'];
    catKeys.forEach(key => {
      const items = aggData[key];
      if (!items?.length) return;
      const colors = BAR_CAT[key];
      divider();
      sectionHeader(CAT_LABELS[key], colors.bar);
      items.forEach(item => {
        const text = (item && typeof item === 'object') ? item.text : item;
        const pct  = (item && typeof item === 'object') ? (item.pct || 0) : 0;
        const textLines = doc.splitTextToSize(text, CW - 60);
        const blockH = textLines.length * 14 + 22;
        checkPage(blockH);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); setRGB(C.ink2);
        textLines.forEach((ln, li) => doc.text(ln, ML, y + li * 14));
        const barY = y + textLines.length * 14 + 4;
        const barW = CW - 60;
        setFill(colors.bg); doc.roundedRect(ML, barY, barW, 6, 3, 3, 'F');
        setFill(colors.bar); doc.roundedRect(ML, barY, Math.max(4, (pct / 100) * barW), 6, 3, 3, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setRGB(C.ink3);
        doc.text(`${pct}%`, ML + barW + 8, barY + 5);
        y += blockH;
      });
    });

    // Where reps disagreed
    if (aggData.rep_divergence?.length) {
      divider();
      sectionHeader('Where Reps Disagreed', C.ink3);
      aggData.rep_divergence.forEach(item => {
        const text = typeof item === 'object' ? item.text : item;
        const lines = doc.splitTextToSize(`• ${text}`, CW);
        const blockH = lines.length * 14 + 6;
        checkPage(blockH);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); setRGB(C.ink2);
        lines.forEach((ln, li) => doc.text(ln, ML, y + li * 14));
        y += blockH;
      });
    }

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      setFill(C.paper2); doc.rect(0, PH - 28, PW, 28, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setRGB(C.ink3);
      doc.text('CONFIDENTIAL — Demo Deck Intelligence', ML, PH - 10);
      doc.text(`${i} / ${pageCount}`, PW - MR, PH - 10, { align: 'right' });
    }

    doc.save('Demo_Deck_Intelligence_Report.pdf');
  } catch (e) {
    alert('PDF error: ' + e.message);
    console.error(e);
  }

  btn.textContent = '↓ Download PDF';
  btn.disabled = false;
}

// ── WORD DOC DOWNLOAD ─────────────────────────────────────────────────
const CATEGORIES_DOCX = [
  ['Where Prospects Get Confused', 'confusion_points'],
  ['Company Size & Fit',           'company_size_fit'],
  ['Objections That Come Up',      'objections_raised'],
  ['Questions Prospects Keep Asking', 'repeated_questions'],
  ['Other Deck Insights',          'other_deck_insights'],
  ['Recommended Fixes',            'recommended_fixes'],
];

async function downloadDocx() {
  if (!aggData) { alert('Run the analysis first.'); return; }
  const btn = document.getElementById('docx-btn');
  btn.textContent = 'Generating…'; btn.disabled = true;
  try {
    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType, PageBreak,
    } = docx;

    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const agg  = aggData;
    const reps = Object.values(results);
    const NAVY = '003865', INK2 = '42424a', INK3 = '888896';
    const FILLS = {
      confusion: 'f5eaea', company: 'eaecf0', objection: 'f5eddf',
      question: 'e8edf5', extra: 'ddf1fb', fix: 'f7f0e0', priority: 'dce6f1',
    };

    const b0 = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const noBord = { top: b0, bottom: b0, left: b0, right: b0 };
    const sp = (n = 100) => new Paragraph({ children: [new TextRun('')], spacing: { before: 0, after: n } });

    const h1 = text => new Paragraph({
      children: [new TextRun({ text, bold: true, size: 34, color: NAVY, font: 'Georgia' })],
      spacing: { before: 300, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
    });

    const lbl = text => new Paragraph({
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 17, color: INK3, font: 'Arial', characterSpacing: 80 })],
      spacing: { before: 160, after: 70 },
    });

    const body = text => new Paragraph({
      children: [new TextRun({ text, size: 22, color: INK2, font: 'Arial' })],
      spacing: { before: 0, after: 80 }, alignment: AlignmentType.JUSTIFIED,
    });

    const bul = (text, color = INK2) => new Paragraph({
      numbering: { reference: 'bul', level: 0 },
      children: [new TextRun({ text, size: 22, color, font: 'Arial' })],
      spacing: { before: 40, after: 40 },
    });

    const itemStr = x => (x && typeof x === 'object') ? `${x.text} (${x.pct}% of reps)` : x;

    function rows(items, fill) {
      if (!items?.length) return [];
      const W = 2800, tableRows = [], strs = items.map(itemStr);
      for (let i = 0; i < strs.length; i += 3) {
        const row = strs.slice(i, i + 3);
        while (row.length < 3) row.push('');
        tableRows.push(new TableRow({
          children: row.map(item => new TableCell({
            borders: noBord, width: { size: W, type: WidthType.DXA },
            shading: { fill: item ? fill : 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 110, right: 110 },
            children: [new Paragraph({ children: [new TextRun({ text: item || '', size: 18, font: 'Arial', color: item ? INK2 : 'FFFFFF' })] })],
          })),
        }));
      }
      return [new Table({ width: { size: 8400, type: WidthType.DXA }, columnWidths: [W, W, W], rows: tableRows }), sp(80)];
    }

    function listSection(heading, items) {
      if (!items?.length) return [];
      return [h1(heading), ...items.map(i => bul(itemStr(i))), sp()];
    }

    function tagSection(heading, items, fill) {
      if (!items?.length) return [];
      return [h1(heading), ...rows(items, fill), sp()];
    }

    const children = [
      new Paragraph({ children: [new TextRun({ text: 'Demo Deck Feedback Report', bold: true, size: 48, color: NAVY, font: 'Georgia' })], spacing: { before: 0, after: 80 } }),
      new Paragraph({ children: [new TextRun({ text: `Confidential  ·  ${date}  ·  ${reps.length} rep${reps.length !== 1 ? 's' : ''} interviewed`, size: 21, color: INK3, font: 'Arial' })], spacing: { before: 0, after: 0 } }),
      new Paragraph({ children: [new TextRun('')], border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC', space: 1 } }, spacing: { before: 160, after: 160 } }),

      h1('Executive Summary'), body(agg.executive_summary || ''), sp(),

      ...(agg.high_priority_fixes?.length ? [
        h1('Top Priority Fixes'),
        new Paragraph({ children: [new TextRun({ text: 'Highest-impact changes to make first.', size: 20, color: INK3, italics: true, font: 'Arial' })], spacing: { before: 0, after: 100 } }),
        ...agg.high_priority_fixes.map(i => bul(i, NAVY)),
        sp(),
      ] : []),

      ...tagSection('Where Prospects Get Confused',     agg.confusion_points,   FILLS.confusion),
      ...tagSection('Company Size & Fit',               agg.company_size_fit,   FILLS.company),
      ...listSection('Objections That Come Up',         agg.objections_raised),
      ...listSection('Questions Prospects Keep Asking', agg.repeated_questions),
      ...listSection('Other Deck Insights',             agg.other_deck_insights),
      ...listSection('Recommended Fixes',               agg.recommended_fixes),
      ...(agg.rep_divergence?.length ? listSection('Where Reps Disagreed', agg.rep_divergence) : []),

      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ children: [new TextRun({ text: 'Percentage Breakdown by Category', bold: true, size: 42, color: NAVY, font: 'Georgia' })], spacing: { before: 0, after: 80 } }),
      new Paragraph({ children: [new TextRun({ text: 'Estimated % of reps who raised each theme', size: 20, color: INK3, font: 'Arial' })], spacing: { before: 0, after: 0 } }),
      new Paragraph({ children: [new TextRun('')], border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC', space: 1 } }, spacing: { before: 160, after: 160 } }),

      ...CATEGORIES_DOCX.flatMap(([heading, key]) => {
        const items = agg[key];
        if (!items?.length) return [];
        return [
          h1(heading),
          ...items.map(item => {
            const text = (item && typeof item === 'object') ? item.text : item;
            const pct  = (item && typeof item === 'object') ? item.pct : null;
            return new Paragraph({
              children: [new TextRun({ text: pct !== null ? `${text}  —  ${pct}%` : text, size: 22, color: INK2, font: 'Arial' })],
              spacing: { before: 40, after: 40 },
            });
          }),
          sp(),
        ];
      }),
    ];

    const wordDoc = new Document({
      numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
      sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
    });

    const buf  = await Packer.toBuffer(wordDoc);
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url  = URL.createObjectURL(blob);
    const a    = window.document.createElement('a');
    a.href = url; a.download = 'Demo_Deck_Feedback_Report.docx'; a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
  btn.textContent = '↓ Download Word report';
  btn.disabled = false;
}

// ── NAV ───────────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => {
    if (t.getAttribute('onclick').includes("'" + name + "'")) t.classList.add('active');
  });
}
