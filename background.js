// background.js

// Fungsi helper untuk mendapatkan data dari storage dengan promise
const getData = (keys) => browser.storage.local.get(keys);
const setData = (data) => browser.storage.local.set(data);

/**
 * Fungsi untuk menyimpan URL ke dalam session yang aktif
 */
async function simpanUrl(url) {
  try {
    const data = await getData(["sessions", "activeSessionId"]);
    let sessions = data.sessions || [];
    let activeId = data.activeSessionId;

    // 1. Inisialisasi jika storage kosong
    if (sessions.length === 0) {
      const defaultSession = {
        id: Date.now().toString(),
        name: "Default Session",
        links: []
      };
      sessions.push(defaultSession);
      activeId = defaultSession.id;
    }

    // 2. Jika ada activeId tapi sessions tidak kosong, pastikan activeId valid
    if (!activeId && sessions.length > 0) {
      activeId = sessions[0].id;
    }

    // 3. Cari session yang sedang aktif
    let sessionIndex = sessions.findIndex(s => s.id === activeId);
    
    // Jika activeId tidak ditemukan (mungkin terhapus), gunakan session pertama
    if (sessionIndex === -1) {
      sessionIndex = 0;
      activeId = sessions[0].id;
    }

    // 4. Masukkan URL baru ke dalam session tersebut
    const newLink = {
      id: crypto.randomUUID(), // ID unik untuk hapus satuan/multiple
      url: url,
      timestamp: new Date().toISOString(),
      label: new Date().toLocaleString('id-ID')
    };

    sessions[sessionIndex].links.push(newLink);

    // 5. Simpan kembali ke storage
    await setData({ sessions: sessions, activeSessionId: activeId });
    
    console.log(`✅ Tersimpan di [${sessions[sessionIndex].name}]: ${url}`);
    return { berhasil: true, sessionName: sessions[sessionIndex].name };
  } catch (error) {
    console.error("Gagal menyimpan:", error);
    return { berhasil: false };
  }
}

/**
 * Handler untuk perintah shortcut (Ctrl+Alt+S)
 */
browser.commands.onCommand.addListener(async (command) => {
  if (command === "simpan-url") {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tabAktif = tabs[0];
      
      if (tabAktif && tabAktif.url) {
        const url = tabAktif.url;
        
        // Filter sederhana (opsional)
        const hasil = await simpanUrl(url);
        
        if (hasil.berhasil) {
          browser.notifications.create({
            type: "basic",
            iconUrl: "icons/icon-48.png",
            title: "URL Berhasil Disimpan",
            message: `Tersimpan di session: ${hasil.sessionName}\n${url.substring(0, 50)}...`
          });
        }
      }
    } catch (err) {
      console.error("Error pada shortcut handler:", err);
    }
  }
});

// Log saat ekstensi dimuat/browser dibuka
console.log("Short Saver Engine Aktif (Session Support Enabled)");