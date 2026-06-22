// popup.js

let currentSessions = [];
let activeId = null;
let currentMode = "shortcut"; // default value
let autoStatus = "stopped";   // default value

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  setupEventListeners();
});

async function loadData() {
  const data = await browser.storage.local.get([
    "sessions", 
    "activeSessionId", 
    "appMode", 
    "autoStatus"
  ]);
  
  currentSessions = data.sessions || [];
  activeId = data.activeSessionId;
  currentMode = data.appMode || "shortcut";
  autoStatus = data.autoStatus || "stopped";

  // Inisialisasi default jika kosong
  if (currentSessions.length === 0) {
    const defaultSession = {
      id: Date.now().toString(),
      name: "Default Session",
      links: []
    };
    currentSessions.push(defaultSession);
    activeId = defaultSession.id;
    await saveToStorage();
  }

  renderSessionSelect();
  renderLinks();
  updateModeUI();
}

async function saveToStorage() {
  await browser.storage.local.set({ 
    sessions: currentSessions, 
    activeSessionId: activeId,
    appMode: currentMode,
    autoStatus: autoStatus
  });
}

// --- RENDERING UI ---

function renderSessionSelect() {
  const select = document.getElementById("sessionSelect");
  select.innerHTML = "";
  currentSessions.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    opt.selected = s.id === activeId;
    select.appendChild(opt);
  });
}

function renderLinks() {
  const container = document.getElementById("linkContainer");
  const session = currentSessions.find(s => s.id === activeId);
  const selectAllCb = document.getElementById("selectAll");
  
  container.innerHTML = "";
  selectAllCb.checked = false;
  toggleMultiActions();

  if (!session || session.links.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada URL di session ini.</div>';
    return;
  }

  // Render terbalik (terbaru di atas)
  [...session.links].reverse().forEach(link => {
    const div = document.createElement("div");
    div.className = "link-item";
    div.innerHTML = `
      <input type="checkbox" class="link-cb" value="${link.id}">
      <div class="link-content">
        <div title="${link.url}">${link.url}</div>
        <span class="link-date">${new Date(link.timestamp).toLocaleString('id-ID')}</span>
      </div>
      <button class="icon-btn btn-danger btn-sm" data-id="${link.id}" title="Hapus">×</button>
    `;
    container.appendChild(div);
  });

  // Event listener untuk tombol hapus satuan
  container.querySelectorAll('.btn-danger').forEach(btn => {
    btn.onclick = (e) => removeLinks([e.target.dataset.id]);
  });

  // Event listener untuk checkbox
  container.querySelectorAll('.link-cb').forEach(cb => {
    cb.onchange = () => toggleMultiActions();
  });
}

function toggleMultiActions() {
  const checkedCount = document.querySelectorAll('.link-cb:checked').length;
  document.getElementById("multiActions").style.display = checkedCount > 0 ? "grid" : "none";
}

// Memperbarui UI popup berdasarkan mode dan status auto yang aktif
function updateModeUI() {
  const modeSelect = document.getElementById("modeSelect");
  const autoControls = document.getElementById("autoControls");
  const btnAutoToggle = document.getElementById("btnAutoToggle");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  modeSelect.value = currentMode;

  if (currentMode === "auto") {
    autoControls.style.display = "flex";
    if (autoStatus === "running") {
      btnAutoToggle.textContent = "Stop";
      btnAutoToggle.style.backgroundColor = "#dc3545";
      btnAutoToggle.style.color = "white";
      statusDot.className = "dot running";
      statusText.textContent = "Auto Save: Aktif";
    } else {
      btnAutoToggle.textContent = "Start";
      btnAutoToggle.style.backgroundColor = "#28a745";
      btnAutoToggle.style.color = "white";
      statusDot.className = "dot stopped";
      statusText.textContent = "Auto Save: Mati";
    }
  } else {
    autoControls.style.display = "none";
  }
}

// --- SESSION ACTIONS ---

async function addSession() {
  const name = prompt("Masukkan nama session baru:");
  if (!name) return;
  
  const newId = Date.now().toString();
  currentSessions.push({ id: newId, name, links: [] });
  activeId = newId;
  
  await saveToStorage();
  await loadData();
  showStatus("Session dibuat", "success");
}

async function editSession() {
  const session = currentSessions.find(s => s.id === activeId);
  const newName = prompt("Ubah nama session:", session.name);
  if (!newName) return;

  session.name = newName;
  await saveToStorage();
  renderSessionSelect();
  showStatus("Nama diperbarui", "success");
}

async function duplicateSession() {
  const session = currentSessions.find(s => s.id === activeId);
  const duplicated = JSON.parse(JSON.stringify(session));
  duplicated.id = Date.now().toString() + "_copy";
  duplicated.name += " (Copy)";

  currentSessions.push(duplicated);
  await saveToStorage();
  await loadData();
  showStatus("Session diduplikasi", "success");
}

async function deleteSession() {
  if (currentSessions.length <= 1) {
    alert("Gak bisa hapus session terakhir!");
    return;
  }

  if (!confirm(`Hapus session "${currentSessions.find(s => s.id === activeId).name}" dan semua link di dalamnya?`)) return;

  currentSessions = currentSessions.filter(s => s.id !== activeId);
  activeId = currentSessions[0].id;
  
  await saveToStorage();
  await loadData();
  showStatus("Session dihapus", "success");
}

// --- LINK ACTIONS (REMOVE & EXPORT) ---

async function removeLinks(ids) {
  if (ids.length > 1 && !confirm(`Hapus ${ids.length} link terpilih?`)) return;

  const sessionIndex = currentSessions.findIndex(s => s.id === activeId);
  currentSessions[sessionIndex].links = currentSessions[sessionIndex].links.filter(l => !ids.includes(l.id));

  await saveToStorage();
  renderLinks();
  showStatus(`${ids.length} link dihapus`, "success");
}

async function exportLinks(ids = null, format = 'full') {
  const session = currentSessions.find(s => s.id === activeId);
  let linksToExport = session.links;

  if (ids) {
    linksToExport = session.links.filter(l => ids.includes(l.id));
  }

  if (linksToExport.length === 0) return;

  let content = "";
  if (format === 'full') {
    content = `=== SESSION: ${session.name} ===\nExport: ${new Date().toLocaleString()}\n\n`;
    linksToExport.forEach((l, i) => {
      content += `${i+1}. ${l.url}\n   Waktu: ${l.timestamp}\n\n`;
    });
  } else {
    content = linksToExport.map(l => l.url).join("\n");
  }

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const filename = `${session.name.replace(/\s+/g, '_')}_${format}_${Date.now()}.txt`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("File diekspor", "success");
}

// --- UTILS & EVENTS ---

function showStatus(msg, type) {
  const status = document.getElementById("status");
  status.textContent = msg;
  status.className = `status ${type}`;
  setTimeout(() => { status.textContent = ""; }, 2000);
}

function setupEventListeners() {
  // Session Controls
  document.getElementById("sessionSelect").onchange = async (e) => {
    activeId = e.target.value;
    await saveToStorage();
    renderLinks();
  };
  document.getElementById("addSession").onclick = addSession;
  document.getElementById("editSession").onclick = editSession;
  document.getElementById("duplicateSession").onclick = duplicateSession;
  document.getElementById("delSession").onclick = deleteSession;

  // Mode & Auto Save Switch Controls
  document.getElementById("modeSelect").onchange = async (e) => {
    currentMode = e.target.value;
    await saveToStorage();
    updateModeUI();
    showStatus(`Mode diubah ke ${currentMode}`, "success");
  };

  document.getElementById("btnAutoToggle").onclick = async () => {
    autoStatus = autoStatus === "running" ? "stopped" : "running";
    await saveToStorage();
    updateModeUI();
    showStatus(autoStatus === "running" ? "Auto Save Dimulai" : "Auto Save Dihentikan", "success");
  };

  // Multi-select
  document.getElementById("selectAll").onchange = (e) => {
    document.querySelectorAll('.link-cb').forEach(cb => cb.checked = e.target.checked);
    toggleMultiActions();
  };

  // Action Buttons
  document.getElementById("exportFull").onclick = () => exportLinks();
  document.getElementById("exportRaw").onclick = () => exportLinks(null, 'raw');
  
  document.getElementById("deleteSelected").onclick = () => {
    const ids = Array.from(document.querySelectorAll('.link-cb:checked')).map(cb => cb.value);
    removeLinks(ids);
  };

  document.getElementById("exportSelected").onclick = () => {
    const ids = Array.from(document.querySelectorAll('.link-cb:checked')).map(cb => cb.value);
    exportLinks(ids, 'raw');
  };
}