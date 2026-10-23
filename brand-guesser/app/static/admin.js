// CHAINED admin ("kitchen"): upload, QA, shot list, schedule, catalog. Pipeline: docs/DATA.md §5.
"use strict";

const $ = (id) => document.getElementById(id);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "vars") for (const [n, x] of Object.entries(v)) el.style.setProperty(n, x);
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
async function api(path, body) {
  const opt = body === undefined ? {} : body instanceof Blob
    ? { method: "POST", body }
    : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const res = await fetch(path, opt);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
function toast(text, bad) {
  const t = $("toast");
  t.textContent = text; t.hidden = false;
  t.classList.toggle("bad", !!bad);
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, bad ? 4000 : 1800);
}
const fail = (e) => toast(e.message, true);
function lightbox(src) {
  const lb = h("div", { class: "lightbox", onclick: () => lb.remove() }, h("img", { src }));
  document.body.append(lb);
}
function localISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let CATALOG = null;     // {categories:[{..., items:[...]}], brands:[...]}
async function loadCatalog() {
  CATALOG = await api("/api/admin/catalog");
  return CATALOG;
}
const catById = (id) => CATALOG.categories.find((c) => c.id === id);

// ---------------------------------------------------------------- tabs
const TABS = { dash: showDash, upload: showUpload, qa: showQA, library: showLibrary, shots: showShots, schedule: showSchedule, catalog: showCatalog };
function go(tab) {
  for (const b of $("tabs").children) b.classList.toggle("on", b.dataset.tab === tab);
  for (const k of Object.keys(TABS)) $(`tab-${k}`).hidden = k !== tab;
  history.replaceState(null, "", `#${tab}`);
  TABS[tab]().catch(fail);
}
document.addEventListener("DOMContentLoaded", async () => {
  for (const b of $("tabs").children) b.onclick = () => go(b.dataset.tab);
  await loadCatalog().catch(fail);
  refreshQACount();
  go(TABS[location.hash.slice(1)] ? location.hash.slice(1) : "dash");
});
async function refreshQACount() {
  const { photos } = await api("/api/admin/photos?status=pending&limit=1000");
  $("qa-count").textContent = photos.length || "";
}

// ---------------------------------------------------------------- dashboard
async function showDash() {
  const o = await api("/api/admin/overview");
  const real = Object.entries(o.photos).filter(([k]) => !k.startsWith("demo:"));
  const count = (st) => real.filter(([k]) => k.endsWith(":" + st)).reduce((a, [, n]) => a + n, 0);
  const players = o.players.length ? o.players[o.players.length - 1].players : 0;
  $("dash-cards").replaceChildren(
    card(count("approved"), "approved photos"),
    card(count("pending"), "waiting for QA", count("pending") > 0),
    card(`${o.items_with_real_photos}/${o.items_playable}`, "items with a real photo"),
    card(o.categories_playable, "playable categories"),
    card(players, `players on ${o.players.length ? o.players[o.players.length - 1].date : "—"}`),
    card(o.settings.demo_photos === "1" ? "ON" : "off", "demo placeholders", o.settings.demo_photos === "1"),
  );
  $("set-name").value = o.settings.site_name;
  $("set-demo").checked = o.settings.demo_photos === "1";
  $("set-launch").value = o.settings.launch_date;
  $("set-save").onclick = async () => {
    try {
      await api("/api/admin/settings", { site_name: $("set-name").value, demo_photos: $("set-demo").checked });
      if ($("set-launch").value !== o.settings.launch_date) await api("/api/admin/settings", { launch_date: $("set-launch").value });
      toast("Saved"); showDash();
    } catch (e) { fail(e); }
  };
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(o.utc_today + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const by = Object.fromEntries(o.players.map((r) => [r.date, r.players]));
  const max = Math.max(1, ...Object.values(by));
  $("dash-players").replaceChildren(...days.map((d) =>
    h("div", { title: `${d}: ${by[d] || 0}`, vars: { "--h": ((by[d] || 0) / max) * 100 } }, h("span", {}, by[d] || ""))));
}
const card = (big, small, warn) => h("div", { class: `card${warn ? " warn" : ""}` }, h("b", {}, big), h("span", {}, small));

// ---------------------------------------------------------------- upload
let uploadWired = false;
async function showUpload(prefill) {
  const cat = $("up-cat"), brand = $("up-brand");
  if (!uploadWired) {
    uploadWired = true;
    cat.replaceChildren(...CATALOG.categories.map((c) => h("option", { value: c.id }, `${c.emoji} ${c.name}${c.enabled ? "" : " (disabled)"}`)));
    cat.onchange = fillBrands;
    $("up-taken").value = localISO();
    $("up-source").onchange = () => { $("up-ccfields").hidden = $("up-source").value === "own"; };
    $("up-newpurchase").onclick = () => { $("up-purchase").value = `P-${localISO().replaceAll("-", "")}-${Math.random().toString(36).slice(2, 6)}`; };
    $("up-newpurchase").click();
    $("up-files").onchange = (e) => uploadFiles([...e.target.files]).finally(() => { e.target.value = ""; });
    const drop = $("drop");
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); uploadFiles([...e.dataTransfer.files]); });
    fillBrands();
  }
  if (prefill && prefill.category_id) {
    cat.value = prefill.category_id; fillBrands(); brand.value = prefill.brand_id;
  }
}
function fillBrands() {
  const c = catById($("up-cat").value);
  $("up-brand").replaceChildren(...c.items.map((it) => h("option", { value: it.brand_id },
    `${it.brand}${it.status === "retired" ? " (retired)" : ""} · ${it.photos.approved || 0} approved`)));
}

async function toJpeg(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bmp) throw new Error(`${file.name}: not an image this browser can read`);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), hh = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = hh;
  canvas.getContext("2d").drawImage(bmp, 0, 0, w, hh);
  return new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("encode failed"))), "image/jpeg", 0.86));
}

async function uploadFiles(files) {
  const out = $("up-results");
  const src = $("up-source").value;
  for (const f of files) {
    const fig = h("figure", {}, h("img", { alt: "" }), h("figcaption", {}, "uploading…"));
    out.prepend(fig);
    try {
      const blob = await toJpeg(f);
      fig.querySelector("img").src = URL.createObjectURL(blob);
      const q = new URLSearchParams({
        category: $("up-cat").value, brand: $("up-brand").value, angle: $("up-angle").value,
        taken: $("up-taken").value, purchase: $("up-purchase").value, city: $("up-city").value,
        state: $("up-state").value.toUpperCase(), source: src, notes: $("up-notes").value,
      });
      if (src !== "own") { q.set("credit", $("up-credit").value); q.set("license", $("up-license").value); q.set("url", $("up-url").value); }
      const r = await api(`/api/admin/upload?${q}`, blob);
      fig.querySelector("figcaption").textContent = r.duplicate ? "duplicate, skipped" : "✓ queued for QA";
    } catch (e) {
      fig.querySelector("figcaption").textContent = e.message;
      fig.querySelector("figcaption").className = "err";
    }
  }
  refreshQACount();
}

// ---------------------------------------------------------------- QA
async function showQA() {
  const { photos } = await api("/api/admin/photos?status=pending&limit=200");
  $("qa-count").textContent = photos.length || "";
  const list = $("qa-list");
  if (!photos.length) { list.replaceChildren(h("p", { class: "hint" }, "Queue's empty. Go buy some fries.")); return; }
  list.replaceChildren(...photos.map(qaCard));
}
function qaCard(p) {
  const c = catById(p.category_id);
  let diff = p.est_difficulty || 0;
  const diffBtns = [1, 2, 3, 4, 5].map((n) => h("button", { class: n === diff ? "on" : "", title: ["", "giveaway", "easy", "medium", "hard", "boss"][n],
    onclick: () => { diff = n; for (const b of diffBtns) b.classList.toggle("on", Number(b.textContent) === n); } }, n));
  const brandSel = h("select", {}, c.items.map((it) => h("option", { value: it.brand_id, selected: it.brand_id === p.brand_id }, it.brand)));
  const compare = h("div", { class: "compare" });
  const el = h("div", { class: "qa-card" },
    h("img", { src: p.url, alt: "", onclick: () => lightbox(p.url) }),
    h("div", {},
      h("h3", {}, `${p.emoji} ${p.category}`),
      h("div", { class: "meta-line" }, [p.angle, p.taken_at, [p.city, p.state].filter(Boolean).join(", "), p.source, p.purchase_id, p.notes].filter(Boolean).join(" · ")),
      h("label", {}, "Brand (fix if mislabelled)", brandSel),
      h("label", {}, "Estimated difficulty (1 giveaway … 5 boss). Live % correct replaces it after 30 plays."),
      h("div", { class: "diff" }, diffBtns),
      h("div", { class: "btns" },
        h("button", { class: "primary small-btn approve", onclick: () => decide("approved") }, "Approve (A)"),
        h("button", { class: "primary small-btn reject", onclick: () => decide("rejected") }, "Reject (R)"),
        h("button", { class: "secondary small-btn", onclick: () => loadCompare() }, "Compare with other brands"),
      ),
      compare,
    ));
  el._decide = decide;
  el._diff = (n) => diffBtns[n - 1].click();
  async function decide(status) {
    try {
      await api("/api/admin/photo", { id: p.id, status, est_difficulty: diff || null, brand_id: brandSel.value });
      el.remove();
      const left = $("qa-list").children.length;
      $("qa-count").textContent = left || "";
      if (!left) showQA();
      toast(status === "approved" ? "Approved" : "Rejected");
    } catch (e) { fail(e); }
  }
  async function loadCompare() {
    const { photos } = await api(`/api/admin/photos?status=approved&category=${p.category_id}&limit=60`);
    compare.replaceChildren(...(photos.length ? photos : []).map((x) =>
      h("figure", {}, h("img", { src: x.url, alt: "", onclick: () => lightbox(x.url) }), h("figcaption", {}, x.brand))));
    if (!photos.length) compare.replaceChildren(h("span", { class: "hint" }, "No approved photos in this category yet."));
  }
  return el;
}
document.addEventListener("keydown", (e) => {
  if ($("tab-qa").hidden || ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  const first = $("qa-list").querySelector(".qa-card");
  if (!first) return;
  if (e.key === "a") first._decide("approved");
  else if (e.key === "r") first._decide("rejected");
  else if (/^[1-5]$/.test(e.key)) first._diff(Number(e.key));
});

// ---------------------------------------------------------------- library
let libWired = false;
async function showLibrary() {
  if (!libWired) {
    libWired = true;
    $("lib-cat").append(...CATALOG.categories.map((c) => h("option", { value: c.id }, `${c.emoji} ${c.name}`)));
    for (const id of ["lib-status", "lib-cat"]) $(id).onchange = () => showLibrary().catch(fail);
    $("lib-refresh").onclick = () => showLibrary().catch(fail);
  }
  const q = new URLSearchParams({ status: $("lib-status").value, category: $("lib-cat").value, limit: 500 });
  const { photos } = await api(`/api/admin/photos?${q}`);
  const list = $("lib-list");
  if (!photos.length) { list.replaceChildren(h("p", { class: "hint" }, "Nothing here yet.")); return; }
  list.replaceChildren(...photos.map((p) => h("div", { class: "lib-card" },
    h("img", { src: p.url, alt: "", onclick: () => lightbox(p.url) }),
    h("div", { class: "t" }, `${p.emoji} ${p.brand}`),
    h("div", { class: "m" }, `${p.category} · ${p.angle} · diff ${p.est_difficulty || "auto"}`),
    h("div", { class: "m" }, p.plays ? `${p.plays} plays · ${Math.round(p.pct * 100)}% correct` : "no live plays yet"),
    h("div", { class: "m" }, p.used.length ? `used ${p.used.join(", ")}` : "not used yet"),
    h("div", { class: "btns" },
      p.status !== "approved" && h("button", { class: "secondary", onclick: () => setStatus(p, "approved") }, "Approve"),
      p.status !== "rejected" && h("button", { class: "secondary", onclick: () => setStatus(p, "rejected") }, "Reject"),
      !p.used.length && h("button", { class: "secondary", onclick: () => del(p) }, "Delete"),
    ))));
}
async function setStatus(p, status) {
  try { await api("/api/admin/photo", { id: p.id, status }); toast("Updated"); showLibrary(); refreshQACount(); } catch (e) { fail(e); }
}
async function del(p) {
  if (!confirm("Delete this photo file for good?")) return;
  try { await api("/api/admin/photo", { id: p.id, delete: true }); toast("Deleted"); showLibrary(); } catch (e) { fail(e); }
}

// ---------------------------------------------------------------- shot list
let shotsWired = false;
async function showShots() {
  if (!shotsWired) {
    shotsWired = true;
    $("shots-refresh").onclick = () => showShots().catch(fail);
    $("shots-days").onchange = () => showShots().catch(fail);
    $("shots-gaponly").onchange = () => showShots().catch(fail);
  }
  const tbody = $("shots-table").querySelector("tbody");
  tbody.replaceChildren(h("tr", {}, h("td", { colspan: 6, class: "hint" }, "Simulating the schedule…")));
  const r = await api(`/api/admin/shotlist?days=${$("shots-days").value}`);
  $("shots-summary").replaceChildren(
    card(r.need, `photos needed for ${r.days} days`),
    card(r.have, "of those already approved"),
    card(r.gap, "still to shoot", r.gap > 0),
    card(Math.ceil(r.gap / 2.5), "purchases (≈ gap ÷ 2.5)"),
  );
  const rows = r.items.filter((x) => !$("shots-gaponly").checked || x.gap > 0);
  tbody.replaceChildren(...rows.map((x) => h("tr", {},
    h("td", {}, `${x.emoji} ${x.brand} `, h("span", { class: "hint" }, x.category), x.scope === "regional" && h("span", { class: "tag" }, "regional")),
    h("td", { class: "num" }, x.need), h("td", { class: "num" }, x.approved), h("td", { class: "num" }, x.pending),
    h("td", { class: `num ${x.gap ? "gap" : "ok"}` }, x.gap || "✓"),
    h("td", {}, x.gap ? h("button", { class: "secondary small-btn", onclick: () => { go("upload"); showUpload(x); } }, "Upload") : ""),
  )));
  if (!rows.length) tbody.replaceChildren(h("tr", {}, h("td", { colspan: 6 }, "Fully stocked for this window. 🎉")));
}

// ---------------------------------------------------------------- schedule
async function showSchedule() {
  $("sched-regen").onclick = async () => {
    try { const r = await api("/api/admin/regenerate", {}); toast(`Regenerated ${r.regenerated} day(s)`); showSchedule(); } catch (e) { fail(e); }
  };
  const r = await api("/api/admin/schedule?days=14");
  $("sched-list").replaceChildren(...r.days.map((d) => h("div", { class: `day${d.date === r.utc_today ? " today" : ""}` },
    h("h3", {}, `#${d.n} · ${d.date}`, d.date === r.utc_today && h("span", { class: "tag" }, "today (UTC)"),
      d.relaxed ? h("span", { class: "tag", title: "the photo bank was too thin for the full rules" }, `rules relaxed L${d.relaxed}`) : ""),
    h("div", { class: "rounds" }, d.rounds.map((x, i) => h("div", { class: "rnd" },
      h("img", { src: x.img, alt: "", onclick: () => lightbox(x.img) }),
      h("div", {}, `${i + 1}. ${x.emoji} ${x.category} · d${x.difficulty}`, x.demo && h("span", { class: "tag" }, "demo")),
      h("div", { class: "ans" }, x.answer),
      h("div", { class: "opts" }, x.options.filter((o) => o !== x.answer).join(" · ")),
      x.plays ? h("div", { class: "opts" }, `${x.plays} plays · ${Math.round(x.pct * 100)}% right`) : "",
    ))))));
}

// ---------------------------------------------------------------- catalog
let catWired = false;
async function showCatalog() {
  if (!catWired) {
    catWired = true;
    $("cat-search").oninput = renderCatalog;
    $("cat-addbrand").onclick = addBrand;
  }
  await loadCatalog();
  renderCatalog();
}
function renderCatalog() {
  const f = $("cat-search").value.trim().toLowerCase();
  const cats = CATALOG.categories.filter((c) => !f || c.name.toLowerCase().includes(f) || c.items.some((it) => it.brand.toLowerCase().includes(f)));
  $("cat-list").replaceChildren(...cats.map((c) => catBlock(c, f)));
}
function catBlock(c, f) {
  const enabled = h("input", { type: "checkbox", checked: !!c.enabled, onclick: (e) => e.stopPropagation(),
    onchange: (e) => saveCat(c, { enabled: e.target.checked }, e.target) });
  const diff = h("select", { onchange: (e) => saveCat(c, { difficulty: Number(e.target.value) }, e.target) },
    [1, 2, 3, 4, 5].map((n) => h("option", { value: n, selected: n === c.difficulty }, String(n))));
  const tells = h("input", { value: c.tells, onchange: (e) => saveCat(c, { tells: e.target.value }, e.target) });
  const missing = CATALOG.brands.filter((b) => !c.items.some((it) => it.brand_id === b.id));
  const add = h("select", { onchange: async (e) => {
    if (!e.target.value) return;
    try { await api("/api/admin/item/add", { category_id: c.id, brand_id: e.target.value }); toast("Added"); showCatalog(); } catch (er) { fail(er); }
  } }, h("option", { value: "" }, "+ add a brand to this category…"), missing.map((b) => h("option", { value: b.id }, b.name)));
  const real = c.items.reduce((a, it) => a + (it.photos.approved || 0), 0);
  return h("details", { class: `catblock${c.enabled ? "" : " off"}`, open: !!f },
    h("summary", {}, enabled, h("span", { class: "nm" }, `${c.emoji} ${c.name}`),
      h("span", { class: "tag" }, c.grp), h("span", { class: "tag" }, `${c.items.length} brands`), h("span", { class: "tag" }, `${real} photos`),
      c.launch ? h("span", { class: "tag" }, "launch set") : ""),
    h("div", { class: "catbody" },
      h("div", { class: "row3" }, h("label", {}, "Difficulty", diff), h("label", {}, "Add brand", add), h("label", {}, "Category tells (shown in the reveal if an item has none)", tells)),
      h("table", { class: "items" },
        h("thead", {}, h("tr", {}, ["Brand", "Menu name shown in reveal", "The tell", "Giveaway", "Status", "Recipe changed", "Photos"].map((t) => h("th", {}, t)))),
        h("tbody", {}, c.items.map((it) => itemRow(c, it)))),
    ));
}
function itemRow(c, it) {
  const save = (field) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    api("/api/admin/item", { category_id: c.id, brand_id: it.brand_id, [field]: v })
      .then(() => { e.target.classList.remove("saved"); void e.target.offsetWidth; e.target.classList.add("saved"); it[field] = v; })
      .catch(fail);
  };
  return h("tr", {},
    h("td", {}, it.brand, it.scope === "regional" && h("span", { class: "tag" }, "regional")),
    h("td", {}, h("input", { value: it.menu_name, placeholder: `e.g. ${c.name} (official menu name)`, onchange: save("menu_name") })),
    h("td", {}, h("input", { value: it.tell, placeholder: "e.g. cornmeal dust on the bottom", onchange: save("tell") })),
    h("td", { class: "c" }, h("input", { type: "checkbox", checked: !!it.giveaway, onchange: save("giveaway") })),
    h("td", {}, h("select", { onchange: save("status") }, ["current", "retired"].map((s) => h("option", { selected: s === it.status }, s)))),
    h("td", {}, h("input", { type: "date", value: it.recipe_changed_at || "", onchange: save("recipe_changed_at") })),
    h("td", { class: "c" }, `${it.photos.approved || 0}${it.photos.pending ? ` +${it.photos.pending}` : ""}`),
  );
}
async function saveCat(c, fields, el) {
  try {
    await api("/api/admin/category", { id: c.id, ...fields });
    Object.assign(c, fields);
    el.classList.remove("saved"); void el.offsetWidth; el.classList.add("saved");
    if ("enabled" in fields) el.closest(".catblock").classList.toggle("off", !fields.enabled);
  } catch (e) { fail(e); }
}
async function addBrand() {
  const name = prompt("Brand name (as players should see it):");
  if (!name) return;
  const id = prompt("Short id (a-z, 0-9, dashes):", name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  if (!id) return;
  const regional = confirm("Is it a regional chain? (OK = regional, Cancel = national)");
  try {
    await api("/api/admin/brand", { create: true, id, name, scope: regional ? "regional" : "national" });
    toast(`Added ${name}. Now add it to categories.`);
    showCatalog();
  } catch (e) { fail(e); }
}
