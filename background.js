// background.js

// Fungsi untuk menyimpan URL ke storage lokal
async function simpanUrl(url) {
  try {
    // Ambil data yang sudah tersimpan
    const result = await browser.storage.local.get("daftarUrl");
    let daftar = result.daftarUrl || [];
    
    // Tambahkan URL baru dengan timestamp
    daftar.push({
      url: url,
      timestamp: new Date().toISOString(),
      tab: new Date().toLocaleString() // versi lokal
    });
    
    // Simpan kembali
    await browser.storage.local.set({ daftarUrl: daftar });
    
    console.log(`✅ Tersimpan: ${url}`);
    return true;
  } catch (error) {
    console.error("Gagal menyimpan:", error);
    return false;
  }
}

// Handler untuk perintah shortcut
browser.commands.onCommand.addListener(async (command) => {
  if (command === "simpan-url") {
    // Dapatkan tab aktif saat ini
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tabAktif = tabs[0];
    
    if (tabAktif && tabAktif.url) {
      const url = tabAktif.url;
      
      // Opsi: filter hanya URL tertentu (misal hanya YouTube)
      if (url.includes("youtube.com/shorts") || url.includes("tiktok.com") || true) {
        const berhasil = await simpanUrl(url);
        
        if (berhasil) {
          // Notifikasi kecil (opsional)
          browser.notifications.create({
            type: "basic",
            iconUrl: "icons/icon-48.png",
            title: "URL Tersimpan",
            message: url.substring(0, 60) + (url.length > 60 ? "..." : "")
          });
        }
      } else {
        console.log("⚠️ Bukan URL short video, dilewati:", url);
      }
    }
  }
});

// Log saat ekstensi dimuat
console.log("Ekstensi Short Saver aktif — tekan Ctrl+Alt+S untuk simpan URL");