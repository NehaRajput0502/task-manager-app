/* =====================================================
   coditbyneha — Task Manager · app.js
   Features: due dates, search & tags, drag reorder,
   export/import, insights, keyboard shortcuts.
   ===================================================== */

// ===== STATE =====
let tasks = JSON.parse(localStorage.getItem("coditbyneha-tasks") || "[]")
  .map((t) => ({ tags: [], due: null, time: "", priority: "medium", done: false, ...t }));
let filter = "all";
let query = "";
let activeTag = null;
let showInsights = false;

// drag state
let draggedId = null;

const FILTERS = ["all", "active", "completed", "overdue"];
const PRIO_COLORS = { low: "var(--green)", medium: "var(--amber)", high: "var(--red)" };

// ===== ELEMENTS =====
const $ = (id) => document.getElementById(id);
const taskInput = $("taskInput");
const prioritySelect = $("prioritySelect");
const dueInput = $("dueInput");
const addBtn = $("addBtn");
const taskList = $("taskList");
const emptyState = $("emptyState");
const greeting = $("greeting");
const subtitle = $("subtitle");
const progressFill = $("progressFill");
const progressPct = $("progressPct");
const composerDot = $("composerDot");
const themeToggle = $("themeToggle");
const themeIcon = $("themeIcon");
const themeText = $("themeText");
const searchInput = $("searchInput");
const insightsBtn = $("insightsBtn");
const insightsPanel = $("insightsPanel");
const exportBtn = $("exportBtn");
const importBtn = $("importBtn");
const importFile = $("importFile");
const helpBtn = $("helpBtn");
const helpModal = $("helpModal");
const helpClose = $("helpClose");
const tagbar = $("tagbar");
const tagbarLabel = $("tagbarLabel");
const tagbarClear = $("tagbarClear");
const filterBtns = document.querySelectorAll(".filter");

// insights nodes
const insRing = $("insRing"), insPct = $("insPct");
const insTotal = $("insTotal"), insActive = $("insActive"), insDone = $("insDone"), insOverdue = $("insOverdue");
const barLow = $("barLow"), barMed = $("barMed"), barHigh = $("barHigh");
const cntLow = $("cntLow"), cntMed = $("cntMed"), cntHigh = $("cntHigh");

// ===== THEME =====
let dark = localStorage.getItem("coditbyneha-dark");
if (dark === null) dark = window.matchMedia("(prefers-color-scheme: dark)").matches ? "true" : "false";
applyTheme();
themeToggle.addEventListener("click", () => {
  dark = dark === "true" ? "false" : "true";
  localStorage.setItem("coditbyneha-dark", dark);
  applyTheme();
});
function applyTheme() {
  const isDark = dark === "true";
  document.documentElement.classList.toggle("dark", isDark);
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  themeText.textContent = isDark ? "Light" : "Dark";
}

// ===== COMPOSER DOT =====
function syncDot() { composerDot.style.background = PRIO_COLORS[prioritySelect.value]; }
prioritySelect.addEventListener("change", syncDot);
syncDot();

// ===== TAGS + DUE HELPERS =====
function parseInput(raw) {
  const tags = [];
  const text = raw
    .replace(/#(\w[\w-]*)/g, (_, tag) => { tags.push(tag.toLowerCase()); return ""; })
    .replace(/\s+/g, " ")
    .trim();
  return { text, tags: [...new Set(tags)] };
}
function rawText(t) {
  return t.tags.length ? `${t.text} ${t.tags.map((x) => "#" + x).join(" ")}` : t.text;
}
function todayMidnight() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function dueState(due) {
  if (!due) return null;
  const d = new Date(due + "T00:00:00");
  const diff = Math.round((d - todayMidnight()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return "future";
}
function dueLabel(due) {
  const st = dueState(due);
  if (st === "overdue") return "Overdue";
  if (st === "today") return "Today";
  if (st === "tomorrow") return "Tomorrow";
  return new Date(due + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" });
}

// ===== ADD =====
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });
function addTask() {
  const { text, tags } = parseInput(taskInput.value);
  if (!text) {
    const c = $("composer");
    c.classList.add("shake");
    setTimeout(() => c.classList.remove("shake"), 300);
    taskInput.focus();
    return;
  }
  tasks.unshift({
    id: Date.now(),
    text,
    tags,
    priority: prioritySelect.value,
    due: dueInput.value || null,
    done: false,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
  save();
  render();
  taskInput.value = "";
  dueInput.value = "";
  taskInput.focus();
}

// ===== ACTIONS =====
function toggleDone(id) {
  const t = tasks.find((t) => t.id === id);
  if (t) { t.done = !t.done; save(); render(); }
}
function deleteTask(id) {
  const li = document.querySelector(`[data-id="${id}"]`);
  if (li) {
    li.style.opacity = "0";
    li.style.transform = "translateX(24px)";
    setTimeout(() => { tasks = tasks.filter((t) => t.id !== id); save(); render(); }, 150);
  } else {
    tasks = tasks.filter((t) => t.id !== id); save(); render();
  }
}
function startEdit(id) {
  const t = tasks.find((t) => t.id === id);
  const textEl = document.querySelector(`[data-id="${id}"] .task__text`);
  const li = document.querySelector(`[data-id="${id}"]`);
  if (!t || !textEl) return;
  if (li) li.setAttribute("draggable", "false");
  const original = rawText(t);
  textEl.innerHTML = '<input class="edit-field" maxlength="160" />';
  const input = textEl.querySelector("input");
  input.value = original;
  input.focus();
  input.select();
  const commit = () => {
    const { text, tags } = parseInput(input.value);
    if (text) { t.text = text; t.tags = tags; }
    save();
    render();
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") { input.removeEventListener("blur", commit); render(); }
  });
}

// ===== TAGS FILTER =====
function filterByTag(tag) { activeTag = tag; render(); }
tagbarClear.addEventListener("click", () => { activeTag = null; render(); });

// ===== SEARCH =====
searchInput.addEventListener("input", () => { query = searchInput.value.trim().toLowerCase(); render(); });

// ===== FILTERS =====
function setFilter(f) {
  filter = f;
  filterBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.filter === f));
  render();
}
function cycleFilter() { setFilter(FILTERS[(FILTERS.indexOf(filter) + 1) % FILTERS.length]); }
filterBtns.forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.filter)));

// ===== INSIGHTS =====
function toggleInsights() {
  showInsights = !showInsights;
  insightsPanel.hidden = !showInsights;
  insightsBtn.classList.toggle("active", showInsights);
  if (showInsights) renderInsights();
}
insightsBtn.addEventListener("click", toggleInsights);
function renderInsights() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const active = total - done;
  const overdue = tasks.filter((t) => !t.done && dueState(t.due) === "overdue").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  insRing.style.setProperty("--pct", pct);
  insPct.textContent = pct + "%";
  insTotal.textContent = total;
  insActive.textContent = active;
  insDone.textContent = done;
  insOverdue.textContent = overdue;
  const low = tasks.filter((t) => t.priority === "low").length;
  const med = tasks.filter((t) => t.priority === "medium").length;
  const high = tasks.filter((t) => t.priority === "high").length;
  const max = Math.max(total, 1);
  barLow.style.width = (low / max) * 100 + "%";
  barMed.style.width = (med / max) * 100 + "%";
  barHigh.style.width = (high / max) * 100 + "%";
  cntLow.textContent = low; cntMed.textContent = med; cntHigh.textContent = high;
}

// ===== EXPORT / IMPORT =====
function exportTasks() {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "coditbyneha-tasks.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
exportBtn.addEventListener("click", () => { exportTasks(); toast("Tasks exported"); });

importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("not an array");
      tasks = data.map((t, i) => ({
        id: Date.now() + i,
        priority: "medium", done: false, tags: [], due: null, time: "", text: "",
        ...t,
      }));
      save();
      render();
      toast("Imported " + tasks.length + " tasks");
    } catch (err) {
      toast("Import failed — invalid file");
    }
    importFile.value = "";
  };
  reader.readAsText(file);
});

// ===== HELP MODAL =====
function openHelp() { helpModal.hidden = false; }
function closeHelp() { helpModal.hidden = true; }
helpBtn.addEventListener("click", openHelp);
helpClose.addEventListener("click", closeHelp);
helpModal.addEventListener("click", (e) => { if (e.target === helpModal) closeHelp(); });

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName;
  const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;

  if (e.key === "Escape") {
    if (!helpModal.hidden) { closeHelp(); return; }
    if (activeTag) { activeTag = null; render(); return; }
    if (searchInput.value) { searchInput.value = ""; query = ""; render(); searchInput.blur(); return; }
    return;
  }
  if (typing) return;

  if (e.key === "/" || e.key === "n") { e.preventDefault(); taskInput.focus(); }
  else if (e.key === "f") { cycleFilter(); }
  else if (e.key === "i") { toggleInsights(); }
  else if (e.key === "e") { exportTasks(); toast("Tasks exported"); }
  else if (e.key === "?") { openHelp(); }
});

// ===== DRAG TO REORDER =====
function attachDnD() {
  taskList.querySelectorAll(".task").forEach((li) => {
    li.addEventListener("dragstart", onDragStart);
    li.addEventListener("dragover", onDragOver);
    li.addEventListener("drop", onDrop);
    li.addEventListener("dragend", onDragEnd);
  });
}
function clearDnDClasses() {
  taskList.querySelectorAll(".task").forEach((li) => li.classList.remove("drag-over", "drag-over-after"));
}
function onDragStart(e) {
  draggedId = Number(this.dataset.id);
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(draggedId));
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const rect = this.getBoundingClientRect();
  const after = e.clientY - rect.top > rect.height / 2;
  clearDnDClasses();
  this.classList.add(after ? "drag-over-after" : "drag-over");
}
function onDrop(e) {
  e.preventDefault();
  const targetId = Number(this.dataset.id);
  const after = this.classList.contains("drag-over-after");
  reorder(draggedId, targetId, after);
}
function onDragEnd() {
  this.classList.remove("dragging");
  clearDnDClasses();
  draggedId = null;
}
function reorder(fromId, toId, after) {
  if (fromId == null || fromId === toId) return;
  const fromIdx = tasks.findIndex((t) => t.id === fromId);
  if (fromIdx === -1) return;
  const [item] = tasks.splice(fromIdx, 1);
  let toIdx = tasks.findIndex((t) => t.id === toId);
  if (toIdx === -1) { tasks.push(item); }
  else { tasks.splice(after ? toIdx + 1 : toIdx, 0, item); }
  save();
  render();
}

// ===== GREETING + PROGRESS =====
function updateGreeting() {
  const h = new Date().getHours();
  const word = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Working late";
  greeting.textContent = word + ".";
  const active = tasks.filter((t) => !t.done).length;
  if (tasks.length === 0) subtitle.textContent = "A clean slate. What's first?";
  else if (active === 0) subtitle.textContent = "Everything's done — nicely played.";
  else subtitle.textContent = active + (active === 1 ? " task" : " tasks") + " left to focus on.";
}
function updateProgress() {
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  progressFill.style.width = pct + "%";
  progressPct.textContent = pct + "%";
}

// ===== RENDER =====
const GRIP = '<svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="3" cy="3" r="1.4"/><circle cx="9" cy="3" r="1.4"/><circle cx="3" cy="8" r="1.4"/><circle cx="9" cy="8" r="1.4"/><circle cx="3" cy="13" r="1.4"/><circle cx="9" cy="13" r="1.4"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';

function renderTask(t) {
  const st = dueState(t.due);
  const dueCls = t.done ? "" : st === "overdue" ? "is-overdue" : st === "today" ? "is-today" : "";
  const dueHtml = t.due ? `<span>·</span><span class="due ${dueCls}">📅 ${dueLabel(t.due)}</span>` : "";
  const tagsHtml = t.tags.length
    ? `<div class="tags">${t.tags.map((tag) => `<button class="tag" onclick="filterByTag('${tag}')">#${escapeHtml(tag)}</button>`).join("")}</div>`
    : "";
  return `
    <li class="task ${t.done ? "done" : ""}" data-prio="${t.priority}" data-id="${t.id}" draggable="true">
      <span class="handle" aria-hidden="true">${GRIP}</span>
      <button class="check" onclick="toggleDone(${t.id})" aria-label="Toggle complete">${CHECK}</button>
      <div class="task__body">
        <div class="task__text">${escapeHtml(t.text)}</div>
        <div class="task__meta">
          <span class="task__prio"><span class="pdot"></span>${t.priority}</span>
          ${dueHtml}
          <span>·</span><span>${t.time}</span>
        </div>
        ${tagsHtml}
      </div>
      <div class="task__actions">
        <button class="iconbtn edit" onclick="startEdit(${t.id})" aria-label="Edit">✏️</button>
        <button class="iconbtn del" onclick="deleteTask(${t.id})" aria-label="Delete">🗑️</button>
      </div>
    </li>`;
}

function render() {
  const visible = tasks.filter((t) => {
    if (filter === "active" && t.done) return false;
    if (filter === "completed" && !t.done) return false;
    if (filter === "overdue" && !(!t.done && dueState(t.due) === "overdue")) return false;
    if (activeTag && !t.tags.includes(activeTag)) return false;
    if (query) {
      const inText = t.text.toLowerCase().includes(query);
      const inTags = t.tags.some((x) => x.includes(query));
      if (!inText && !inTags) return false;
    }
    return true;
  });

  tagbar.hidden = !activeTag;
  if (activeTag) tagbarLabel.textContent = activeTag;

  const none = visible.length === 0;
  emptyState.style.display = none ? "block" : "none";
  taskList.style.display = none ? "none" : "flex";
  if (none) {
    emptyState.querySelector(".empty__title").textContent = tasks.length ? "No matching tasks" : "Nothing here yet";
    emptyState.querySelector(".empty__sub").textContent = tasks.length
      ? "Try a different search or filter."
      : "Add your first task above to get started.";
  }

  taskList.innerHTML = visible.map(renderTask).join("");
  attachDnD();
  updateGreeting();
  updateProgress();
  renderInsights();
}

// ===== HELPERS =====
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
function save() { localStorage.setItem("coditbyneha-tasks", JSON.stringify(tasks)); }
let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

// expose inline-onclick handlers
window.toggleDone = toggleDone;
window.deleteTask = deleteTask;
window.startEdit = startEdit;
window.filterByTag = filterByTag;

// ===== INIT =====
render();
