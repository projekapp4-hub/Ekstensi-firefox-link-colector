// background.js

const getData = (keys) => browser.storage.local.get(keys);
const setData = (data) => browser.storage.local.set(data);

/**
 * Fungsi untuk menyimpan URL ke dalam session yang aktif
 * Ditambahkan parameter isAuto untuk menangani penapisan duplikasi link berturut-turut
 */
async function simpanUrl(url, isAuto = false) {
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
    if (sessionIndex === -1) {
      sessionIndex = 0;
      activeId = sessions[0].id;
    }

    const currentSession = sessions[sessionIndex];

    // --- PROTEKSI DUPLIKASI OTOMATIS ---
    // Jika dipicu secara otomatis, cek apakah URL sama dengan URL terakhir yang masuk.
    // Ini krusial karena event onUpdated bisa terpicu berkali-kali selama proses loading halaman.
    if (currentSession.links.length > 0) {
      const lastLink = currentSession.links[currentSession.links.length - 1];
      if (lastLink.url === url) {
        // Abaikan penyimpanan karena URL-nya sama dengan baris terakhir
        return { berhasil: false, alasan: "duplikat" };
      }
    }

    // 4. Masukkan URL baru ke dalam session tersebut
    const newLink = {
      id: crypto.randomUUID(),
      url: url,
      timestamp: new Date().toISOString(),
      label: new Date().toLocaleString('id-ID')
    };

    sessions[sessionIndex].links.push(newLink);

    // 5. Simpan kembali ke storage
    await setData({ sessions: sessions, activeSessionId: activeId });
    
    console.log(`✅ Tersimpan [Mode: ${isAuto ? "Auto" : "Shortcut"}] di [${sessions[sessionIndex].name}]: ${url}`);
    return { berhasil: true, sessionName: sessions[sessionIndex].name };
  } catch (error) {
    console.error("Gagal menyimpan:", error);
    return { berhasil: false, alasan: "error" };
  }
}

/**
 * Handler untuk perintah shortcut (Ctrl+Alt+S)
 * Hanya berjalan jika mode aplikasi disetel ke "shortcut"
 */
browser.commands.onCommand.addListener(async (command) => {
  if (command === "simpan-url") {
    try {
      const config = await getData(["appMode"]);
      const mode = config.appMode || "shortcut";

      // Jika user menekan shortcut tapi sedang berada di mode auto, shortcut diabaikan
      if (mode !== "shortcut") {
        console.log("Shortcut diabaikan: Sedang berada dalam Auto Mode.");
        return;
      }

      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tabAktif = tabs[0];
      
      if (tabAktif && tabAktif.url) {
        // Skema URL internal browser diabaikan demi kebersihan data
        if (tabAktif.url.startsWith("about:") || tabAktif.url.startsWith("chrome://") || tabAktif.url.startsWith("browser://")) {
          return;
        }

        const url = tabAktif.url;
        const hasil = await simpanUrl(url, false);
        
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

/**
 * Listener untuk memantau pergantian atau pembaruan tab di browser (Auto Mode)
 */
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // Kita hanya mengambil event ketika properti URL pada tab tersebut berubah/terisi
    if (changeInfo.url) {
      const config = await getData(["appMode", "autoStatus"]);
      const mode = config.appMode || "shortcut";
      const status = config.autoStatus || "stopped";

      // Eksekusi penyimpanan otomatis hanya jika mode="auto" DAN status="running"
      if (mode === "auto" && status === "running") {
        const targetUrl = changeInfo.url;

        // Abaikan halaman kosong bawaan browser
        if (targetUrl.startsWith("about:") || targetUrl.startsWith("chrome://") || targetUrl.startsWith("browser://") || targetUrl === "about:blank") {
          return;
        }

        const hasil = await simpanUrl(targetUrl, true);
        
        if (hasil.berhasil) {
          browser.notifications.create({
            type: "basic",
            iconUrl: "icons/icon-48.png",
            title: "Auto Save: URL Tersimpan",
            message: `Tersimpan di session: ${hasil.sessionName}\n${targetUrl.substring(0, 50)}...`
          });
        }
      }
    }
  } catch (error) {
    console.error("Error pada Auto Save listener:", error);
  }
});

console.log("Short Saver Engine Aktif (Dual Mode: Shortcut & Auto Supported)");