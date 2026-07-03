(function () {
  'use strict';

  // DOM Elements
  const fileInput = document.getElementById('fileInput');
  const fileUploadArea = document.getElementById('fileUploadArea');
  const fileInfo = document.getElementById('fileInfo');
  const fileNameEl = document.getElementById('fileName');
  const fileSizeEl = document.getElementById('fileSize');
  const btnRemoveFile = document.getElementById('btnRemoveFile');
  const btnParse = document.getElementById('btnParse');
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  const statsSection = document.getElementById('statsSection');
  const chartSection = document.getElementById('chartSection');
  const btnSave = document.getElementById('btnSave');
  const statAvg = document.getElementById('statAvg');
  const statMax = document.getElementById('statMax');
  const statMin = document.getElementById('statMin');
  const statCount = document.getElementById('statCount');

  // Modal DOM
  const saveModal = document.getElementById('saveModal');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');
  const modalSaveOnly = document.getElementById('modalSaveOnly');
  const inputModel = document.getElementById('inputModel');
  const inputFirmware = document.getElementById('inputFirmware');
  const selectBand = document.getElementById('selectBand');
  const selectChannel = document.getElementById('selectChannel');

  let chartInstance = null;
  let loadedFileContent = null;
  const btnResetZoom = document.getElementById('btnResetZoom');

  // ===== Channel Data =====
  const channelData = {
    '2.4GHz': [
      { value: 'Oto', label: 'Oto (Otomatik)' },
      { value: '1', label: 'Kanal 1 (2412 MHz)' },
      { value: '2', label: 'Kanal 2 (2417 MHz)' },
      { value: '3', label: 'Kanal 3 (2422 MHz)' },
      { value: '4', label: 'Kanal 4 (2427 MHz)' },
      { value: '5', label: 'Kanal 5 (2432 MHz)' },
      { value: '6', label: 'Kanal 6 (2437 MHz)' },
      { value: '7', label: 'Kanal 7 (2442 MHz)' },
      { value: '8', label: 'Kanal 8 (2447 MHz)' },
      { value: '9', label: 'Kanal 9 (2452 MHz)' },
      { value: '10', label: 'Kanal 10 (2457 MHz)' },
      { value: '11', label: 'Kanal 11 (2462 MHz)' },
      { value: '12', label: 'Kanal 12 (2467 MHz)' },
      { value: '13', label: 'Kanal 13 (2472 MHz)' }
    ],
    '5GHz': [
      { value: 'Oto', label: 'Oto (Otomatik)' },
      { value: '', label: '── Band 1 (UNII-1) ──', disabled: true },
      { value: '36', label: 'Kanal 36 (5180 MHz)' },
      { value: '40', label: 'Kanal 40 (5200 MHz)' },
      { value: '44', label: 'Kanal 44 (5220 MHz)' },
      { value: '48', label: 'Kanal 48 (5240 MHz)' },
      { value: '', label: '── Band 2 (UNII-2) ──', disabled: true },
      { value: '52', label: 'Kanal 52 (5260 MHz)' },
      { value: '56', label: 'Kanal 56 (5280 MHz)' },
      { value: '60', label: 'Kanal 60 (5300 MHz)' },
      { value: '64', label: 'Kanal 64 (5320 MHz)' },
      { value: '', label: '── Band 3 (UNII-2E/3) ──', disabled: true },
      { value: '100', label: 'Kanal 100 (5500 MHz)' },
      { value: '104', label: 'Kanal 104 (5520 MHz)' },
      { value: '108', label: 'Kanal 108 (5540 MHz)' },
      { value: '112', label: 'Kanal 112 (5560 MHz)' },
      { value: '116', label: 'Kanal 116 (5580 MHz)' },
      { value: '120', label: 'Kanal 120 (5600 MHz)' },
      { value: '124', label: 'Kanal 124 (5620 MHz)' },
      { value: '128', label: 'Kanal 128 (5640 MHz)' },
      { value: '132', label: 'Kanal 132 (5660 MHz)' },
      { value: '136', label: 'Kanal 136 (5680 MHz)' },
      { value: '140', label: 'Kanal 140 (5700 MHz)' },
      { value: '144', label: 'Kanal 144 (5720 MHz)' },
      { value: '149', label: 'Kanal 149 (5745 MHz)' },
      { value: '153', label: 'Kanal 153 (5765 MHz)' },
      { value: '157', label: 'Kanal 157 (5785 MHz)' },
      { value: '161', label: 'Kanal 161 (5805 MHz)' },
      { value: '165', label: 'Kanal 165 (5825 MHz)' }
    ],
    '6GHz': [
      { value: 'Oto', label: 'Oto (Otomatik)' },
      { value: '1', label: 'Kanal 1 (5955 MHz)' },
      { value: '5', label: 'Kanal 5 (5975 MHz)' },
      { value: '9', label: 'Kanal 9 (5995 MHz)' },
      { value: '13', label: 'Kanal 13 (6015 MHz)' },
      { value: '17', label: 'Kanal 17 (6035 MHz)' },
      { value: '21', label: 'Kanal 21 (6055 MHz)' },
      { value: '25', label: 'Kanal 25 (6075 MHz)' },
      { value: '29', label: 'Kanal 29 (6095 MHz)' },
      { value: '33', label: 'Kanal 33 (6115 MHz)' },
      { value: '37', label: 'Kanal 37 (6135 MHz)' },
      { value: '41', label: 'Kanal 41 (6155 MHz)' },
      { value: '45', label: 'Kanal 45 (6175 MHz)' },
      { value: '49', label: 'Kanal 49 (6195 MHz)' },
      { value: '53', label: 'Kanal 53 (6215 MHz)' },
      { value: '57', label: 'Kanal 57 (6235 MHz)' },
      { value: '61', label: 'Kanal 61 (6255 MHz)' },
      { value: '65', label: 'Kanal 65 (6275 MHz)' },
      { value: '69', label: 'Kanal 69 (6295 MHz)' },
      { value: '73', label: 'Kanal 73 (6315 MHz)' },
      { value: '77', label: 'Kanal 77 (6335 MHz)' },
      { value: '81', label: 'Kanal 81 (6355 MHz)' },
      { value: '85', label: 'Kanal 85 (6375 MHz)' },
      { value: '89', label: 'Kanal 89 (6395 MHz)' },
      { value: '93', label: 'Kanal 93 (6415 MHz)' }
    ],
    'MLO': [
      { value: 'Oto', label: 'Oto (Otomatik)' },
      { value: '', label: '── 2.4 GHz ──', disabled: true },
      { value: '2.4G-1', label: 'Kanal 1 (2412 MHz)' },
      { value: '2.4G-6', label: 'Kanal 6 (2437 MHz)' },
      { value: '2.4G-11', label: 'Kanal 11 (2462 MHz)' },
      { value: '', label: '── 5 GHz ──', disabled: true },
      { value: '5G-36', label: 'Kanal 36 (5180 MHz)' },
      { value: '5G-44', label: 'Kanal 44 (5220 MHz)' },
      { value: '5G-48', label: 'Kanal 48 (5240 MHz)' },
      { value: '5G-149', label: 'Kanal 149 (5745 MHz)' },
      { value: '5G-157', label: 'Kanal 157 (5785 MHz)' },
      { value: '5G-161', label: 'Kanal 161 (5805 MHz)' },
      { value: '', label: '── 6 GHz ──', disabled: true },
      { value: '6G-1', label: 'Kanal 1 (5955 MHz)' },
      { value: '6G-5', label: 'Kanal 5 (5975 MHz)' },
      { value: '6G-9', label: 'Kanal 9 (5995 MHz)' },
      { value: '6G-37', label: 'Kanal 37 (6135 MHz)' },
      { value: '6G-53', label: 'Kanal 53 (6215 MHz)' },
      { value: '6G-69', label: 'Kanal 69 (6295 MHz)' }
    ]
  };

  // ===== Band → Channel dynamic update =====
  selectBand.addEventListener('change', () => {
    const band = selectBand.value;
    const channels = channelData[band];

    selectChannel.innerHTML = '';

    if (!channels) {
      selectChannel.disabled = true;
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = 'Önce band seçin';
      selectChannel.appendChild(opt);
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Kanal seçin';
    selectChannel.appendChild(placeholder);

    channels.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.value;
      opt.textContent = ch.label;
      if (ch.disabled) {
        opt.disabled = true;
        opt.style.fontWeight = '700';
        opt.style.color = '#36a8d0';
      }
      selectChannel.appendChild(opt);
    });

    selectChannel.disabled = false;
  });

  // ===== File Upload =====
  fileUploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('drag-over');
  });

  fileUploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('drag-over');
  });

  fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  btnRemoveFile.addEventListener('click', () => {
    resetFileState();
  });

  function handleFile(file) {
    const validExts = ['.txt', '.log', '.text'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(ext)) {
      showError('Lütfen .txt veya .log formatında bir dosya seçin.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      loadedFileContent = e.target.result;
      fileNameEl.textContent = file.name;
      fileSizeEl.textContent = formatFileSize(file.size);
      fileUploadArea.style.display = 'none';
      fileInfo.style.display = 'flex';
      btnParse.disabled = false;
      hideError();
    };
    reader.onerror = function () {
      showError('Dosya okunurken bir hata oluştu.');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function resetFileState() {
    loadedFileContent = null;
    fileInput.value = '';
    fileUploadArea.style.display = '';
    fileInfo.style.display = 'none';
    btnParse.disabled = true;
    hideError();
    statsSection.style.display = 'none';
    chartSection.style.display = 'none';
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  // Parse button
  btnParse.addEventListener('click', () => {
    hideError();

    if (!loadedFileContent) {
      showError('Lütfen önce bir dosya yükleyin.');
      return;
    }

    const fileSize = new Blob([loadedFileContent]).size;
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const loadingSub = document.getElementById('loadingSub');

    loadingText.textContent = 'Lütfen bekleyin, grafik oluşturuluyor…';
    loadingSub.textContent = `Dosya boyutu: ${formatFileSize(fileSize)}`;
    loadingOverlay.style.display = 'flex';

    // Defer to let UI paint the loading overlay
    setTimeout(() => {
      try {
        const data = parseIperfOutput(loadedFileContent);

        if (data.length === 0) {
          loadingOverlay.style.display = 'none';
          showError('Geçerli [SUM] satırı bulunamadı. Lütfen iPerf çıktısını kontrol edin.');
          return;
        }

        const perSecondData = filterPerSecondData(data);

        if (perSecondData.length === 0) {
          loadingOverlay.style.display = 'none';
          showError('Per-second [SUM] satırı bulunamadı. Sadece özet satırları mevcut.');
          return;
        }

        loadingText.textContent = 'Grafik çiziliyor…';
        loadingSub.textContent = `${perSecondData.length} veri noktası işleniyor`;

        // Another defer for chart rendering
        setTimeout(() => {
          try {
            updateStats(perSecondData);
            renderChart(perSecondData);
          } finally {
            loadingOverlay.style.display = 'none';
          }
        }, 50);
      } catch (e) {
        loadingOverlay.style.display = 'none';
        showError('Dosya işlenirken hata oluştu: ' + e.message);
      }
    }, 80);
  });

  // ===== Save Button → Open Modal =====
  btnSave.addEventListener('click', () => {
    if (!chartInstance) return;
    openModal();
  });

  // ===== Reset Zoom =====
  btnResetZoom.addEventListener('click', () => {
    if (!chartInstance) return;
    chartInstance.resetZoom();
    btnResetZoom.style.display = 'none';
  });

  // ===== Modal Controls =====
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);

  saveModal.addEventListener('click', (e) => {
    if (e.target === saveModal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && saveModal.style.display !== 'none') {
      closeModal();
    }
  });

  modalSaveOnly.addEventListener('click', async () => {
    const { canvasDataUrl, entry } = buildChartImage();
    modalSaveOnly.disabled = true;
    modalSaveOnly.textContent = 'Kaydediliyor…';
    try {
      await saveTestResult(entry);
      showToast('✅ Kayıtlı Test Sonuçlarına Kaydedildi');
      closeModal();
    } catch (e) {
      console.error('Firebase kayıt hatası:', e);
      showToast('❌ Kayıt sırasında hata oluştu');
    } finally {
      modalSaveOnly.disabled = false;
      modalSaveOnly.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 5.5V13a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 13V3a1.5 1.5 0 011.5-1.5H9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 1.5l3 3M7.5 9l6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Sonucu Kaydet';
    }
  });

  function openModal() {
    saveModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    inputModel.focus();
  }

  function closeModal() {
    saveModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // ===== Build Chart Image (shared by save & download) =====
  function buildChartImage() {
    const model = inputModel.value.trim() || '—';
    const firmware = inputFirmware.value.trim() || '—';
    const band = selectBand.value || '—';
    const channelOpt = selectChannel.options[selectChannel.selectedIndex];
    const channel = (channelOpt && channelOpt.value) ? channelOpt.text : '—';

    const avgVal = statAvg.textContent;
    const maxVal = statMax.textContent;
    const minVal = statMin.textContent;

    const chartLabels = chartInstance.data.labels;
    const duration = chartLabels.length > 0 ? chartLabels[chartLabels.length - 1] : '—';

    const originalCanvas = document.getElementById('throughputChart');

    const topInfoHeight = 80;
    const bottomInfoHeight = 80;
    const pad = 20;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalCanvas.width;
    tempCanvas.height = originalCanvas.height + topInfoHeight + bottomInfoHeight + pad * 2;
    const ctx = tempCanvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // TOP: Stats
    const topCols = 4;
    const topColWidth = tempCanvas.width / topCols;
    const topLabels = ['Ort. Throughput', 'Maksimum', 'Minimum', 'Süre'];
    const topValues = [avgVal + ' Mbps', maxVal + ' Mbps', minVal + ' Mbps', duration];

    for (let i = 0; i < topCols; i++) {
      const x = i * topColWidth + topColWidth / 2;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(topLabels[i], x, pad + 18);
      ctx.fillStyle = '#1e293b';
      ctx.font = '700 15px Inter, sans-serif';
      ctx.fillText(topValues[i], x, pad + 40);
    }

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, topInfoHeight - 5);
    ctx.lineTo(tempCanvas.width - pad, topInfoHeight - 5);
    ctx.stroke();

    // MIDDLE: Chart
    ctx.drawImage(originalCanvas, 0, topInfoHeight);

    // BOTTOM: Device info
    const bottomY = topInfoHeight + originalCanvas.height + 10;
    const bottomCols = 4;
    const bottomColWidth = tempCanvas.width / bottomCols;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, bottomY);
    ctx.lineTo(tempCanvas.width - pad, bottomY);
    ctx.stroke();

    const bottomLabels = ['Model', 'Yazılım Sürümü', 'Band', 'Kanal Bilgisi'];
    const bottomValues = [model, firmware, band, channel];

    for (let i = 0; i < bottomCols; i++) {
      const x = i * bottomColWidth + bottomColWidth / 2;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bottomLabels[i], x, bottomY + 24);
      ctx.fillStyle = '#1e293b';
      ctx.font = '700 14px Inter, sans-serif';
      ctx.fillText(bottomValues[i], x, bottomY + 46);
    }

    const imageFileName = [model, firmware, band, channel].filter(v => v !== '—').join('_').replace(/[\s\/\\:*?"<>|]+/g, '_');
    const finalFileName = imageFileName || 'iperf_throughput';
    const canvasDataUrl = tempCanvas.toDataURL('image/png', 1.0);

    const entry = {
      image: tempCanvas.toDataURL('image/png', 0.85),
      model, firmware, band, channel,
      avg: avgVal, max: maxVal, min: minVal,
      duration, timestamp: new Date().toISOString(),
      fileName: finalFileName
    };

    return { canvasDataUrl, entry, finalFileName };
  }

  // ===== Optimized Parser =====
  function parseIperfOutput(text) {
    const results = [];
    const sumRegex = /^\[SUM\]\s+([\d.]+)-([\d.]+)\s+sec\s+[\d.]+\s+\S+\s+([\d.]+)\s+(\S+)/;
    let start = 0;
    const len = text.length;

    while (start < len) {
      let end = text.indexOf('\n', start);
      if (end === -1) end = len;

      // Fast filter: only process lines containing [SUM]
      const lineStart = start;
      const lineEnd = end;
      start = end + 1;

      // Quick indexOf check before trimming/regex (massive speedup)
      let hasSUM = false;
      for (let i = lineStart; i < lineEnd - 3; i++) {
        if (text.charCodeAt(i) === 91 && text.charCodeAt(i+1) === 83 &&
            text.charCodeAt(i+2) === 85 && text.charCodeAt(i+3) === 77) {
          hasSUM = true;
          break;
        }
      }
      if (!hasSUM) continue;

      const line = text.substring(lineStart, lineEnd).trim();
      const match = line.match(sumRegex);
      if (match) {
        const startTime = parseFloat(match[1]);
        const endTime = parseFloat(match[2]);
        const bandwidth = parseFloat(match[3]);
        const unit = match[4].toLowerCase();

        let mbps = 0;
        if (unit.includes('gbit')) {
          mbps = bandwidth * 1000;
        } else if (unit.includes('mbit')) {
          mbps = bandwidth;
        } else if (unit.includes('kbit')) {
          mbps = bandwidth / 1000;
        } else if (unit.includes('bit')) {
          mbps = bandwidth / 1000000;
        }

        results.push({ startTime, endTime, mbps });
      }
    }

    return results;
  }

  function filterPerSecondData(data) {
    // If the data has 1-second or sub-second intervals (<= 1.25s), only keep those to get 1-second granularity
    const hasOneSecondData = data.some(d => (d.endTime - d.startTime) <= 1.25);
    if (hasOneSecondData) {
      return data.filter(d => (d.endTime - d.startTime) <= 1.25);
    }
    // Fallback: keep whatever interval size is present (e.g., 3-second intervals if parsed directly)
    return data.filter(d => (d.endTime - d.startTime) <= 10);
  }

  // ===== Downsample for large datasets (Min/Max Decimation to preserve drops & peaks) =====
  function downsampleData(data, maxPoints) {
    if (data.length <= maxPoints) return data;
    
    // Since we will output at most 2 points (min & max) per chunk,
    // the number of chunks should be maxPoints / 2.
    const numChunks = Math.floor(maxPoints / 2);
    const chunkSize = Math.ceil(data.length / numChunks);
    
    const result = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
      if (chunk.length === 0) continue;
      if (chunk.length === 1) {
        result.push(chunk[0]);
        continue;
      }
      
      let minIdx = 0;
      let maxIdx = 0;
      let minVal = chunk[0].mbps;
      let maxVal = chunk[0].mbps;
      
      for (let j = 1; j < chunk.length; j++) {
        const val = chunk[j].mbps;
        if (val < minVal) {
          minVal = val;
          minIdx = j;
        }
        if (val > maxVal) {
          maxVal = val;
          maxIdx = j;
        }
      }
      
      // Push min and max in chronological order
      if (minIdx < maxIdx) {
        result.push(chunk[minIdx]);
        result.push(chunk[maxIdx]);
      } else if (minIdx > maxIdx) {
        result.push(chunk[maxIdx]);
        result.push(chunk[minIdx]);
      } else {
        result.push(chunk[minIdx]);
      }
    }
    return result;
  }

  // ===== Stats (optimized for large arrays) =====
  function updateStats(data) {
    let sum = 0, max = -Infinity, min = Infinity;
    for (let i = 0; i < data.length; i++) {
      const v = data[i].mbps;
      sum += v;
      if (v > max) max = v;
      if (v < min) min = v;
    }
    const avg = sum / data.length;

    statAvg.textContent = avg.toFixed(1);
    statMax.textContent = max.toFixed(1);
    statMin.textContent = min.toFixed(1);
    statCount.textContent = data.length;

    statsSection.style.display = 'grid';
    statsSection.style.animation = 'none';
    void statsSection.offsetHeight;
    statsSection.style.animation = 'fadeSlideUp 0.5s ease forwards';
  }

  // ===== Chart =====
  function renderChart(rawData) {
    if (chartInstance) {
      chartInstance.destroy();
    }

    // Downsample only if dataset is extremely large (e.g. > 10000 points) to preserve every single second
    const data = downsampleData(rawData, 10000);
    const isLarge = rawData.length > 500;

    const canvas = document.getElementById('throughputChart');
    const ctx = canvas.getContext('2d');

    // Prevent page scroll when scrolling wheel over the chart canvas
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
    }, { passive: false });

    const labels = data.map(d => {
      const t = d.endTime;
      if (t >= 3600) {
        const h = Math.floor(t / 3600);
        const m = Math.floor((t % 3600) / 60);
        const s = Math.floor(t % 60);
        return `${h}h${m > 0 ? m + 'm' : ''}${s > 0 ? s + 's' : ''}`;
      } else if (t >= 60) {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}m${s > 0 ? s + 's' : ''}`;
      }
      return `${t}s`;
    });

    const values = data.map(d => d.mbps);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight);
    gradient.addColorStop(0, 'rgba(79, 193, 233, 0.25)');
    gradient.addColorStop(0.5, 'rgba(79, 193, 233, 0.08)');
    gradient.addColorStop(1, 'rgba(79, 193, 233, 0.01)');

    const whiteBgPlugin = {
      id: 'whiteBg',
      beforeDraw: (chart) => {
        const { ctx: c } = chart;
        c.save();
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, chart.width, chart.height);
        c.restore();
      }
    };

    chartInstance = new Chart(ctx, {
      type: 'line',
      plugins: [whiteBgPlugin],
      data: {
        labels: labels,
        datasets: [{
          label: 'Throughput (Mbps)',
          data: values,
          borderColor: '#4fc1e9',
          backgroundColor: gradient,
          borderWidth: isLarge ? 1.5 : 2.5,
          fill: true,
          tension: isLarge ? 0.1 : 0.35,
          pointRadius: isLarge ? 0 : (data.length > 200 ? 2 : 4),
          pointHoverRadius: isLarge ? 4 : 8,
          pointBackgroundColor: '#36a8d0',
          pointBorderColor: '#2b8fb3',
          pointBorderWidth: isLarge ? 1 : 2,
          pointHitRadius: isLarge ? 6 : 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#334155',
              font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(79, 193, 233, 0.4)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 14,
            titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            displayColors: false,
            callbacks: {
              title: function (items) { return `⏱ Zaman: ${items[0].label}`; },
              label: function (item) { return `📊 Throughput: ${item.parsed.y.toFixed(1)} Mbps`; }
            }
          },
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
                speed: 0.08
              },
              drag: {
                enabled: true,
                backgroundColor: 'rgba(79, 193, 233, 0.15)',
                borderColor: 'rgba(79, 193, 233, 0.6)',
                borderWidth: 1
              },
              mode: 'x',
              onZoomComplete: function() {
                btnResetZoom.style.display = 'inline-flex';
              }
            },
            pan: {
              enabled: true,
              mode: 'x',
              modifierKey: 'shift' // Hold Shift to pan, drag to zoom box
            }
          },
          decimation: isLarge ? {
            enabled: true,
            algorithm: 'lttb',
            samples: 500
          } : { enabled: false }
        },
        scales: {
          x: {
            offset: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
            ticks: {
              color: '#64748b',
              font: { family: "'Inter', sans-serif", size: 11 },
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: isLarge ? 20 : 30
            },
            title: {
              display: true,
              text: 'Zaman',
              color: '#334155',
              font: { family: "'Inter', sans-serif", size: 13, weight: '600' }
            }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
            ticks: {
              color: '#64748b',
              font: { family: "'Inter', sans-serif", size: 11 },
              callback: function (value) { return value.toLocaleString('tr-TR') + ' Mbps'; }
            },
            title: {
              display: true,
              text: 'Throughput (Mbps)',
              color: '#334155',
              font: { family: "'Inter', sans-serif", size: 13, weight: '600' }
            },
            beginAtZero: true
          }
        },
        animation: isLarge ? false : { duration: 800, easing: 'easeOutQuart' }
      }
    });

    btnResetZoom.style.display = 'none';

    chartSection.style.display = 'block';
    chartSection.style.animation = 'none';
    void chartSection.offsetHeight;
    chartSection.style.animation = 'fadeSlideUp 0.6s ease forwards';

    setTimeout(() => {
      chartSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }

  // ===== Helpers =====
  function showError(msg) {
    errorText.textContent = msg;
    errorMessage.style.display = 'flex';
    errorMessage.style.animation = 'none';
    void errorMessage.offsetHeight;
    errorMessage.style.animation = 'shakeIn 0.4s ease';
  }

  function hideError() {
    errorMessage.style.display = 'none';
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  }

  // saveToGallery is now handled by saveTestResult() in firebase-config.js

  // ===== Toast =====
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast toast-visible toast-success';

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = 'toast';
      toastTimer = null;
    }, 2500);
  }
})();
