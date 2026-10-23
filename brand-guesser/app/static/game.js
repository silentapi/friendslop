// CHAINED player client. No framework, no build step. Rules: docs/GAME.md.
"use strict";

const $ = (id) => document.getElementById(id);
const STORE_KEY = "chained:v1";

// ---------------------------------------------------------------- storage (device only)
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (_) {}
  if (!s || typeof s !== "object") s = {};
  s.history = s.history || {};          // date -> { live, picks: [reveal], done }
  if (!s.device) s.device = randomId();
  return s;
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (_) {}
}
function randomId() {
  const a = new Uint8Array(16);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
const S = load();
save();

// ---------------------------------------------------------------- dates
function localISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return localISO(new Date(y, m - 1, d + n));
}

// ---------------------------------------------------------------- api
async function api(path, body) {
  const res = await fetch(path, body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || res.statusText); e.status = res.status; throw e; }
  return data;
}

// ---------------------------------------------------------------- state
const today = localISO();
const params = new URLSearchParams(location.search);
let date = params.get("d") && /^\d{4}-\d{2}-\d{2}$/.test(params.get("d")) ? params.get("d") : today;
if (date > today) date = today;
const isToday = date === today;

let P = null;        // puzzle from the server
let rec = null;      // S.history[date]
let cur = 0;         // round index on screen
let reviewing = false;

// ---------------------------------------------------------------- boot
document.addEventListener("DOMContentLoaded", async () => {
  wireChrome();
  try {
    P = await api(`/api/puzzle?date=${date}`);
  } catch (e) {
    return showEmpty(e.status === 404 ? "No puzzle for this day" : "Couldn't load the puzzle",
      e.status === 404 ? "This date is before the game launched, or there aren't enough photos yet." : e.message);
  }
  document.title = `${P.site} #${P.n}`;
  $("site-name").textContent = P.site;
  $("puzzle-meta").textContent = `${isToday ? "" : "archive · "}#${P.n} · ${prettyDate(P.date)}`;
  if (P.demo) banner("Demo mode: placeholder photos. Upload real ones in /admin and this banner goes away.");
  else if (!isToday) banner("Archive replay: doesn't count toward your streak.");

  rec = S.history[date] || { live: isToday && P.live, picks: [], done: false };
  // a puzzle can't change once played, but guard against a regenerated one with fewer rounds
  rec.picks = rec.picks.slice(0, P.rounds.length);
  S.history[date] = rec;
  save();

  P.rounds.forEach((r) => { const i = new Image(); i.src = r.img; });   // preload all 5

  if (rec.done) return showDone();
  if (!S.seenHelp) { S.seenHelp = true; save(); $("dlg-help").showModal(); }
  cur = rec.picks.length;
  showRound();
});

function wireChrome() {
  $("btn-help").onclick = () => $("dlg-help").showModal();
  $("btn-stats").onclick = openStats;
  $("btn-archive").onclick = openArchive;
  $("btn-empty-archive").onclick = openArchive;
  $("btn-about").onclick = openAbout;
  $("btn-next").onclick = next;
  $("btn-share").onclick = share;
  $("btn-review").onclick = () => { reviewing = true; cur = 0; showRound(); };
  for (const d of document.querySelectorAll("dialog")) {
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });   // tap backdrop to close
  }
  document.addEventListener("keydown", (e) => {
    if (document.querySelector("dialog[open]") || $("view-game").hidden) return;
    const answered = !!rec.picks[cur];
    if (!answered && ["1", "2", "3", "4"].includes(e.key)) {
      const b = $("options").children[Number(e.key) - 1];
      if (b) b.click();
    } else if (answered && (e.key === "Enter" || e.key === "ArrowRight")) {
      e.preventDefault();
      next();
    } else if (reviewing && e.key === "ArrowLeft" && cur > 0) {
      cur--; showRound();
    }
  });
  setupZoom();
}

function show(view) {
  for (const v of ["view-game", "view-done", "view-empty"]) $(v).hidden = v !== view;
  window.scrollTo({ top: 0 });
}
function banner(text) { $("banner").textContent = text; $("banner").hidden = false; }
function showEmpty(title, body) {
  $("empty-title").textContent = title;
  $("empty-body").textContent = body;
  $("puzzle-meta").textContent = prettyDate(date);
  show("view-empty");
}
function toast(text) {
  const t = $("toast");
  t.textContent = text; t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, 2200);
}

// ---------------------------------------------------------------- a round
function showRound() {
  show("view-game");
  const r = P.rounds[cur];
  const pick = rec.picks[cur];
  const total = P.rounds.length;

  const prog = $("progress");
  prog.replaceChildren(...P.rounds.map((x, i) => {
    const li = document.createElement("li");
    li.textContent = x.emoji;
    const p = rec.picks[i];
    li.className = i === cur ? "current" : "";
    if (p) li.classList.add(p.right ? "right" : "wrong");
    li.title = x.category;
    return li;
  }));

  const label = $("round-label");
  label.replaceChildren();
  const left = document.createElement("span");
  left.textContent = `Round ${cur + 1} of ${total} · ${r.emoji} ${r.category}`;
  const right = document.createElement("span");
  if (cur === total - 1) { right.textContent = "Boss round"; right.className = "boss"; }
  label.append(left, right);

  const frame = $("photo-frame"), img = $("photo");
  frame.classList.remove("zoomed");
  frame.classList.add("loading");
  img.onload = () => frame.classList.remove("loading");
  img.src = r.img;
  img.alt = r.alt;

  const opts = $("options");
  opts.replaceChildren(...r.options.map((o, i) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.dataset.id = o.id;
    const fill = document.createElement("span"); fill.className = "fill";
    const k = document.createElement("span"); k.className = "k"; k.textContent = i + 1;
    const lbl = document.createElement("span"); lbl.className = "lbl"; lbl.textContent = o.name;
    b.append(fill, k, lbl);
    b.onclick = () => choose(o.id);
    return b;
  }));

  if (pick) paintReveal(pick, false);
  else $("reveal").hidden = true;
}

let busy = false;
async function choose(id) {
  if (busy || rec.picks[cur]) return;
  busy = true;
  for (const b of $("options").children) b.disabled = true;
  try {
    const res = await api("/api/answer", { date, round: cur, choice: id, device: S.device });
    rec.picks[cur] = res;
    if (rec.picks.length === P.rounds.length && rec.picks.every(Boolean)) rec.done = true;
    save();
    paintReveal(res, true);
    const li = $("progress").children[cur];
    li.classList.add(res.right ? "right" : "wrong");
    if (navigator.vibrate) navigator.vibrate(res.right ? 15 : [30, 40, 30]);
  } catch (e) {
    for (const b of $("options").children) b.disabled = false;
    toast(e.status === 429 ? "Easy there. Try again in a sec." : "Couldn't reach the server. Try again.");
  } finally {
    busy = false;
  }
}

function paintReveal(res, animate) {
  for (const b of $("options").children) {
    b.disabled = true;
    const id = b.dataset.id;
    const pct = res.pct[id] || 0;
    if (id === res.correct) b.classList.add("is-answer");
    else if (id === res.choice) b.classList.add("is-wrong");
    else b.classList.add("dim");
    if (res.total > 0) {
      const tag = document.createElement("span");
      tag.className = "pct";
      tag.textContent = `${Math.round(pct * 100)}%`;
      b.append(tag);
      const fill = b.querySelector(".fill");
      const w = `${Math.round(pct * 100)}%`;
      if (animate) requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = w; }));
      else fill.style.width = w;
    }
  }
  const v = $("verdict");
  v.textContent = res.right ? "✓ Correct" : `✗ It was ${res.brand}`;
  v.className = `verdict ${res.right ? "right" : "wrong"}`;
  const pctRight = res.pct[res.correct] || 0;
  $("crowd").textContent = res.total >= 5
    ? `${Math.round(pctRight * 100)}% got this · ${res.total.toLocaleString()} players`
    : res.total > 0 ? "one of the first to play this" : "";
  $("reveal-item").textContent = `${res.brand} · ${res.item}`;
  const tell = $("reveal-tell");
  tell.replaceChildren();
  if (res.tell || res.category_tells) {
    const b = document.createElement("b");
    b.textContent = res.tell ? "The tell: " : "How to tell them apart: ";
    tell.append(b, document.createTextNode(res.tell || res.category_tells));
  }
  const last = cur === P.rounds.length - 1;
  $("btn-next").textContent = reviewing ? (last ? "Back to receipt" : "Next →") : (last ? "See your receipt" : "Next →");
  $("reveal").hidden = false;
  if (animate) $("reveal").scrollIntoView({ behavior: "smooth", block: "nearest" });
  $("btn-next").focus({ preventScroll: true });
}

function next() {
  if (!rec.picks[cur]) return;
  if (cur < P.rounds.length - 1) { cur++; showRound(); return; }
  reviewing = false;
  showDone();
}

// ---------------------------------------------------------------- zoom
function setupZoom() {
  const frame = $("photo-frame"), img = $("photo");
  const origin = (e) => {
    const r = frame.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    img.style.setProperty("--ox", `${x}%`);
    img.style.setProperty("--oy", `${y}%`);
  };
  frame.addEventListener("click", (e) => {
    origin(e);
    frame.classList.toggle("zoomed");
    $("zoom-hint").hidden = true;
  });
  frame.addEventListener("pointermove", (e) => { if (frame.classList.contains("zoomed")) origin(e); });
}

// ---------------------------------------------------------------- receipt
async function showDone() {
  show("view-done");
  const rc = $("receipt");
  rc.replaceChildren();
  const el = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
  const score = rec.picks.filter((p) => p.right).length;

  rc.append(el("h2", null, P.site), el("div", "sub", `Puzzle #${P.n} · ${prettyDate(P.date)}`), el("hr"));
  P.rounds.forEach((r, i) => {
    const p = rec.picks[i];
    const line = el("div", "line");
    line.append(el("span", null, r.emoji), el("span", "what", r.category));
    const chosen = r.options.find((o) => o.id === p.choice);
    line.append(el("span", `who ${p.right ? "right" : "wrong"}`, chosen ? chosen.name : "?"));
    if (!p.right) line.append(el("span", "was", `it was ${p.brand}`));
    rc.append(line);
  });
  rc.append(el("hr"));
  const total = el("div", "total");
  total.append(el("span", null, "TOTAL"), el("span", null, `${score}/${P.rounds.length}`));
  rc.append(total);
  const crowd = el("div", "crowdline", "");
  rc.append(crowd);
  if (rec.live) {
    const st = streaks();
    rc.append(el("div", "crowdline", `streak ${st.current} · best ${st.best}`));
  }
  rc.append(el("div", "thanks", "*** THANK YOU · COME AGAIN ***"));

  if (rec.live) {
    try {
      const ds = await api(`/api/daystats?date=${date}&device=${S.device}`);
      if (ds.players > 1) {
        let t = `today's average ${ds.avg.toFixed(1)} · ${ds.players.toLocaleString()} players`;
        if (ds.beat != null) t += ` · you beat ${Math.round(ds.beat * 100)}%`;
        crowd.textContent = t;
      } else crowd.textContent = "you're one of the first to finish today";
    } catch (_) {}
  }
  tickCountdown();
}

function tickCountdown() {
  clearTimeout(tickCountdown.t);
  if ($("view-done").hidden) return;
  const now = new Date();
  const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((mid - now) / 1000));
  const p = (n) => String(n).padStart(2, "0");
  $("next-in").textContent = isToday
    ? `next puzzle in ${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`
    : "";
  if (isToday && s === 0) { setTimeout(() => location.reload(), 1500); return; }
  tickCountdown.t = setTimeout(tickCountdown, 1000);
}

function shareText() {
  const score = rec.picks.filter((p) => p.right).length;
  const grid = P.rounds.map((r, i) => `${r.emoji}${rec.picks[i].right ? "✅" : "❌"}`).join(" ");
  const last = rec.picks[rec.picks.length - 1];
  const bossPct = last && last.total >= 5 ? ` (${Math.round((last.pct[last.correct] || 0) * 100)}% got it)` : "";
  const lines = [`${P.site} #${P.n} 🧾 ${score}/${P.rounds.length}`, grid,
    `boss: ${P.rounds[P.rounds.length - 1].emoji} ${P.rounds[P.rounds.length - 1].category.toLowerCase()}${bossPct}`,
    location.origin];
  return lines.join("\n");
}

async function share() {
  const text = shareText();
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Receipt copied. Paste it in the group chat.");
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand("copy"); toast("Receipt copied."); } catch (_) { toast("Couldn't copy, sorry."); }
    ta.remove();
  }
}

// ---------------------------------------------------------------- stats
function streaks() {
  const played = Object.entries(S.history).filter(([, h]) => h.live && h.done).map(([d]) => d).sort();
  let best = 0, run = 0, prev = null;
  for (const d of played) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const last = played[played.length - 1];
  const current = last && (last === today || last === addDays(today, -1)) ? run : 0;
  return { current, best, played };
}

function openStats() {
  const st = streaks();
  const done = st.played.map((d) => S.history[d]);
  const scores = done.map((h) => h.picks.filter((p) => p.right).length);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "–";
  const row = $("stat-row");
  row.replaceChildren(...[["Played", st.played.length], ["Avg", avg], ["Streak", st.current], ["Best", st.best]].map(([k, v]) => {
    const d = document.createElement("div");
    const b = document.createElement("b"); b.textContent = v;
    const s = document.createElement("span"); s.textContent = k;
    d.append(b, s);
    return d;
  }));
  const n = Math.max(5, ...done.map((h) => h.picks.length));
  const counts = Array(n + 1).fill(0);
  scores.forEach((s) => counts[s]++);
  const max = Math.max(1, ...counts);
  const todayScore = S.history[today] && S.history[today].done ? S.history[today].picks.filter((p) => p.right).length : null;
  $("dist").replaceChildren(...counts.map((c, s) => s).reverse().map((s) => {
    const r = document.createElement("div"); r.className = "row";
    const k = document.createElement("span"); k.textContent = s;
    const bar = document.createElement("span");
    bar.className = `bar${s === todayScore ? " today" : ""}`;
    bar.style.setProperty("--w", Math.max(6, (counts[s] / max) * 100));
    bar.textContent = counts[s];
    r.append(k, bar);
    return r;
  }));
  $("dlg-stats").showModal();
}

async function openArchive() {
  const list = $("archive-list");
  list.replaceChildren();
  $("dlg-archive").showModal();
  try {
    const { days } = await api(`/api/archive?before=${today}`);
    if (!days.length) {
      const li = document.createElement("li"); li.className = "small"; li.textContent = "Nothing yet. Come back tomorrow.";
      list.append(li);
    }
    for (const d of days) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `/?d=${d.date}`;
      const h = S.history[d.date];
      const l = document.createElement("span"); l.textContent = `#${d.n} · ${prettyDate(d.date)}`;
      const r = document.createElement("span"); r.className = "score";
      r.textContent = h && h.done ? `${h.picks.filter((p) => p.right).length}/${h.picks.length}` : h ? "in progress" : "play →";
      a.append(l, r); li.append(a); list.append(li);
    }
  } catch (_) {
    const li = document.createElement("li"); li.className = "small"; li.textContent = "Couldn't load the archive.";
    list.append(li);
  }
}

async function openAbout() {
  $("dlg-about").showModal();
  const ul = $("credits");
  try {
    const { credits } = await api("/api/credits");
    ul.replaceChildren();
    if (!credits.length) {
      const li = document.createElement("li"); li.className = "small";
      li.textContent = "All photos are our own, shot for this game.";
      ul.append(li);
    }
    for (const c of credits) {
      const li = document.createElement("li");
      li.append(document.createTextNode(`${c.credit} · ${c.license}`));
      if (/^https?:\/\//.test(c.source_url)) {
        const a = document.createElement("a");
        a.href = c.source_url; a.rel = "noopener nofollow"; a.target = "_blank"; a.textContent = " source";
        li.append(a);
      }
      ul.append(li);
    }
  } catch (_) {}
}
