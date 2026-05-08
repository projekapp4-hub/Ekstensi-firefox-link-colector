// popup.js

// Tampilkan jumlah URL yang tersimpan saat popup dibuka
async function updateInfo() {
  try {
    const result = await browser.storage.local.get("daftarUrl");
    const daftar = result.daftarUrl || [];
    const jumlah = daftar.length;
    
    const infoBox = document.getElementById("infoBox");
    if (jumlah === 0) {
      infoBox.innerHTML = "📭 Belum ada URL tersimpan.<br>Tekan <strong>Ctrl+Alt+S</strong> untuk menyimpan URL tab aktif.";
    } else {
      infoBox.innerHTML = `✅ <strong>${jumlah}</strong> URL tersimpan<br>
                           <span style="font-size: 11px; color: #666;">Terakhir: ${daftar[daftar.length-1]?.timestamp || '-'}</span>`;
    }
  } catch (error) {
    console.error("Gagal mengambil data:", error);
    document.getElementById("infoBox").innerHTML = "❌ Gagal memuat data";
  }
}

// Ekspor ke file TXT
async function exportToTxt() {
  const statusDiv = document.getElementById("status");
  statusDiv.innerHTML = "⏳ Menyiapkan file...";
  statusDiv.className = "status";
  
  try {
    const result = await browser.storage.local.get("daftarUrl");
    const daftar = result.daftarUrl || [];
    
    if (daftar.length === 0) {
      statusDiv.innerHTML = "⚠️ Tidak ada URL untuk diekspor";
      statusDiv.className = "status error";
      return;
    }
    
    // 1. Format isi file
    let kontenTxt = "=== DAFTAR URL TERSIMPAN ===\n";
    kontenTxt += `Total: ${daftar.length} URL\n`;
    kontenTxt += `Tanggal ekspor: ${new Date().toLocaleString()}\n`;
    kontenTxt += "=".repeat(50) + "\n\n";
    
    daftar.forEach((item, index) => {
      kontenTxt += `${index + 1}. ${item.url}\n`;
      kontenTxt += `   📅 Disimpan: ${item.timestamp}\n\n`;
    });
    
    // 2. Buat Blob
    const blob = new Blob([kontenTxt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    // 3. Buat nama file
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}`;
    const namaFile = `short_urls_${timestamp}.txt`;

    // 4. METODE ALTERNATIF (Link Injection)
    // Cara ini lebih aman dari "Access Denied" di Firefox Popup
    const tempLink = document.createElement("a");
    tempLink.href = url;
    tempLink.download = namaFile;
    tempLink.style.display = "none";
    
    document.body.appendChild(tempLink);
    tempLink.click(); // Memicu download secara paksa
    
    // Beri waktu sedikit sebelum membersihkan DOM
    setTimeout(() => {
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(url);
    }, 100);

    statusDiv.innerHTML = `✅ Berhasil mengekspor ${daftar.length} URL`;
    statusDiv.className = "status success";
    
    setTimeout(() => {
      statusDiv.innerHTML = "";
      statusDiv.className = "status";
    }, 3000);

  } catch (error) {
    console.error("Gagal ekspor:", error);
    statusDiv.innerHTML = `❌ Gagal: ${error.message}`;
    statusDiv.className = "status error";
  }
}

// Hapus semua URL (dengan konfirmasi)
async function clearAllUrls() {
  const confirmHapus = confirm("⚠️ Yakin ingin menghapus SEMUA URL tersimpan?\n\nTindakan ini tidak bisa dibatalkan.");
  
  if (!confirmHapus) return;
  
  const statusDiv = document.getElementById("status");
  statusDiv.innerHTML = "⏳ Menghapus semua URL...";
  statusDiv.className = "status";
  
  try {
    await browser.storage.local.set({ daftarUrl: [] });
    statusDiv.innerHTML = "✅ Semua URL berhasil dihapus";
    statusDiv.className = "status success";
    await updateInfo(); // Refresh tampilan
    
    setTimeout(() => {
      statusDiv.innerHTML = "";
      statusDiv.className = "status";
    }, 2000);
  } catch (error) {
    statusDiv.innerHTML = `❌ Gagal menghapus: ${error.message}`;
    statusDiv.className = "status error";
    setTimeout(() => {
      statusDiv.innerHTML = "";
      statusDiv.className = "status";
    }, 2000);
  }
}

// Ekspor format bersih (Hanya URL per baris)
async function exportRaw() {
  const statusDiv = document.getElementById("status");
  statusDiv.innerHTML = "⏳ Menyiapkan file...";
  statusDiv.className = "status";
  
  try {
    const result = await browser.storage.local.get("daftarUrl");
    const daftar = result.daftarUrl || [];
    
    if (daftar.length === 0) {
      statusDiv.innerHTML = "⚠️ Tidak ada URL untuk diekspor";
      statusDiv.className = "status error";
      return;
    }
    
    // FORMAT BERSIH: Hanya URL, satu per baris
    const kontenRaw = daftar.map(item => item.url).join("\n");
    
    const blob = new Blob([kontenRaw], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}${now.getMonth()+1}${now.getDate()}_${now.getHours()}${now.getMinutes()}`;
    const namaFile = `list_urls_only_${timestamp}.txt`;

    const tempLink = document.createElement("a");
    tempLink.href = url;
    tempLink.download = namaFile;
    tempLink.style.display = "none";
    
    document.body.appendChild(tempLink);
    tempLink.click();
    
    setTimeout(() => {
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(url);
    }, 100);

    statusDiv.innerHTML = `✅ Berhasil ekspor ${daftar.length} URL (Raw)`;
    statusDiv.className = "status success";
    
    setTimeout(() => {
      statusDiv.innerHTML = "";
      statusDiv.className = "status";
    }, 3000);

  } catch (error) {
    statusDiv.innerHTML = `❌ Gagal: ${error.message}`;
    statusDiv.className = "status error";
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  updateInfo();
  document.getElementById("exportBtn").addEventListener("click", exportToTxt);
  document.getElementById("exportRawBtn").addEventListener("click", exportRaw); // Listener baru
  document.getElementById("clearBtn").addEventListener("click", clearAllUrls);
});