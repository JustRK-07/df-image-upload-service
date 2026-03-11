function getIndexHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload &amp; Compress Service POC</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #ffffff; color: #1e293b; min-height: 100vh; }
    .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 600; color: #0f172a; margin: 0; }
    .btn-zip {
      background: #0f172a; color: #fff; border: none; padding: 10px 20px; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; white-space: nowrap;
    }
    .btn-zip:hover { background: #1e293b; }
    .upload-area {
      border: 2px dashed #cbd5e1; border-radius: 12px; padding: 48px; text-align: center;
      cursor: pointer; transition: all 0.2s; background: #f8fafc; margin-bottom: 24px;
    }
    .upload-area:hover, .upload-area.drag { border-color: #3b82f6; background: #eff6ff; }
    .upload-area p { color: #64748b; margin-top: 8px; font-size: 14px; }
    .upload-area .icon { font-size: 48px; margin-bottom: 12px; }
    .progress { width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 16px; display: none; }
    .progress-bar { height: 100%; background: #3b82f6; border-radius: 3px; transition: width 0.3s; width: 0%; }
    .status-bar { display: flex; gap: 16px; margin-bottom: 24px; font-size: 13px; color: #64748b; flex-wrap: wrap; }
    .status-bar span { background: #f1f5f9; padding: 6px 14px; border-radius: 20px; }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #475569; }
    .empty { text-align: center; color: #94a3b8; padding: 40px; font-size: 14px; }
    .key-points { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
    .key-points h3 { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 10px; }
    .key-points ul { list-style: none; padding: 0; }
    .key-points li { font-size: 13px; color: #334155; padding: 4px 0; padding-left: 18px; position: relative; }
    .key-points li::before { content: "\\2022"; color: #3b82f6; font-weight: bold; position: absolute; left: 0; }
    .key-points .highlight { background: #dbeafe; color: #1d4ed8; padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 12px; }

    /* Table styles */
    .table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; background: #ffffff; font-size: 13px; }
    thead th {
      padding: 12px 14px; text-align: left; font-weight: 600; color: #475569;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
      cursor: pointer; user-select: none; position: relative;
    }
    thead th:hover { color: #0f172a; }
    thead th .sort-arrow { margin-left: 4px; font-size: 10px; opacity: 0.5; }
    thead th.sorted .sort-arrow { opacity: 1; color: #3b82f6; }
    tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
    tbody tr:hover { background: #f8fafc; }
    tbody td { padding: 10px 14px; vertical-align: middle; }
    .thumb-cell img { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; display: block; }
    .thumb-cell .pdf-icon { width: 40px; height: 40px; border-radius: 6px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .name-cell { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
    .type-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .type-jpeg { background: #fef3c7; color: #92400e; }
    .type-png { background: #ccfbf1; color: #115e59; }
    .type-pdf { background: #fee2e2; color: #991b1b; }
    .savings-green { color: #16a34a; font-weight: 600; }
    .savings-yellow { color: #ca8a04; font-weight: 600; }
    .savings-red { color: #dc2626; font-weight: 600; }
    .savings-neutral { color: #94a3b8; }
    .size-cell { white-space: nowrap; }
    .actions-cell { white-space: nowrap; }
    .btn-sm {
      padding: 5px 10px; font-size: 11px; border-radius: 5px; border: none; cursor: pointer;
      font-weight: 500; transition: background 0.2s; display: inline-block; margin-right: 4px;
    }
    .btn-copy { background: #e2e8f0; color: #334155; }
    .btn-copy:hover { background: #cbd5e1; }
    .btn-preview { background: #3b82f6; color: #fff; }
    .btn-preview:hover { background: #2563eb; }
    .btn-dl-orig { background: #dbeafe; color: #1d4ed8; }
    .btn-dl-orig:hover { background: #bfdbfe; }
    .btn-dl-comp { background: #dcfce7; color: #16a34a; }
    .btn-dl-comp:hover { background: #bbf7d0; }
    .btn-del { background: #fee2e2; color: #dc2626; }
    .btn-del:hover { background: #fecaca; }
    .toast {
      position: fixed; bottom: 24px; right: 24px; background: #22c55e; color: #fff;
      padding: 10px 20px; border-radius: 8px; font-size: 14px; display: none; z-index: 99;
    }
    .loading-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.85); display: none; align-items: center;
      justify-content: center; flex-direction: column; border-radius: 12px; z-index: 10;
    }
    .loading-overlay.active { display: flex; }
    .spinner {
      width: 40px; height: 40px; border: 4px solid #e2e8f0;
      border-top-color: #3b82f6; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-overlay p { margin-top: 12px; font-size: 14px; color: #475569; font-weight: 500; }
    .upload-area { position: relative; }

    /* Tabs */
    .tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
    .tab-btn {
      padding: 10px 24px; font-size: 14px; font-weight: 600; color: #64748b;
      background: none; border: none; cursor: pointer; border-bottom: 2px solid transparent;
      margin-bottom: -2px; transition: all 0.2s;
    }
    .tab-btn:hover { color: #0f172a; }
    .tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Batch processing */
    .batch-upload-area {
      border: 2px dashed #cbd5e1; border-radius: 12px; padding: 40px; text-align: center;
      cursor: pointer; transition: all 0.2s; background: #f8fafc; margin-bottom: 24px; position: relative;
    }
    .batch-upload-area:hover, .batch-upload-area.drag { border-color: #8b5cf6; background: #f5f3ff; }
    .batch-upload-area .icon { font-size: 40px; margin-bottom: 10px; }
    .batch-upload-area p { color: #64748b; margin-top: 6px; font-size: 13px; }
    .batch-summary {
      display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
    }
    .batch-stat {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 14px 20px; flex: 1; min-width: 140px; text-align: center;
    }
    .batch-stat .value { font-size: 22px; font-weight: 700; color: #0f172a; }
    .batch-stat .label { font-size: 12px; color: #64748b; margin-top: 2px; }
    .batch-progress-wrap { margin-bottom: 20px; display: none; }
    .batch-progress-bar {
      width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;
    }
    .batch-progress-fill {
      height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      border-radius: 4px; transition: width 0.3s; width: 0%;
    }
    .batch-progress-text { font-size: 13px; color: #64748b; margin-top: 6px; text-align: center; }
    .batch-row-error { background: #fef2f2 !important; }
    .batch-row-error td { color: #991b1b; }
    .status-ok { color: #16a34a; font-weight: 600; }
    .status-err { color: #dc2626; font-weight: 600; }
    .status-pending { color: #94a3b8; }
    .btn-batch-dl {
      background: #8b5cf6; color: #fff; border: none; padding: 10px 20px; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-top: 16px;
    }
    .btn-batch-dl:hover { background: #7c3aed; }
    .btn-batch-dl:disabled { background: #c4b5fd; cursor: not-allowed; }

    /* Compare modal */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6); z-index: 1000; display: none;
      align-items: center; justify-content: center;
    }
    .modal-backdrop.active { display: flex; }
    .modal {
      background: #fff; border-radius: 14px; width: 95vw; max-width: 1200px;
      max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 24px; border-bottom: 1px solid #e2e8f0;
    }
    .modal-header h2 { font-size: 18px; font-weight: 600; color: #0f172a; }
    .modal-close {
      background: none; border: none; font-size: 24px; cursor: pointer;
      color: #64748b; padding: 4px 8px; border-radius: 6px;
    }
    .modal-close:hover { background: #f1f5f9; color: #0f172a; }
    .modal-body { padding: 24px; }
    .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .compare-pane { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .compare-pane-header {
      padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
    }
    .compare-pane-header .label { font-weight: 600; font-size: 14px; color: #0f172a; }
    .compare-pane-header .size { font-size: 13px; color: #64748b; }
    .compare-pane-body { display: flex; align-items: center; justify-content: center; min-height: 400px; background: #fafafa; }
    .compare-pane-body img { max-width: 100%; max-height: 60vh; object-fit: contain; }
    .compare-pane-body iframe { width: 100%; height: 60vh; border: none; }
    .compare-savings {
      text-align: center; margin-top: 16px; font-size: 15px; font-weight: 600;
    }
    @media (max-width: 700px) {
      .compare-grid { grid-template-columns: 1fr; }
    }

    /* Responsive: stack on mobile */
    @media (max-width: 700px) {
      .table-wrap { border: none; }
      table, thead, tbody, th, td, tr { display: block; }
      thead { display: none; }
      tbody tr {
        margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 10px;
        background: #ffffff; padding: 12px;
      }
      tbody td { padding: 4px 0; border: none; display: flex; justify-content: space-between; align-items: center; }
      tbody td::before {
        content: attr(data-label); font-weight: 600; color: #475569; font-size: 12px;
        min-width: 90px; text-transform: uppercase;
      }
      .thumb-cell { justify-content: center !important; }
      .thumb-cell::before { display: none; }
      .name-cell { max-width: 100%; }
      .actions-cell { justify-content: flex-end !important; margin-top: 8px; }
      .actions-cell::before { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Upload &amp; Compress Service POC</h1>
      <button class="btn-zip" onclick="window.location.href='/download-code'">&#128230; Download Source Code (.zip)</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('single')">Single Upload</button>
      <button class="tab-btn" onclick="switchTab('batch')">Batch Processing</button>
    </div>

    <!-- ===== Single Upload Tab ===== -->
    <div class="tab-content active" id="tab-single">
      <div class="key-points">
        <h3>Method &amp; Key Points</h3>
        <ul>
          <li>Compression is <span class="highlight">only available to TC role type</span> users</li>
          <li>Images (JPEG/PNG) are optimized using sharp &mdash; quality reduction + metadata stripping</li>
          <li>PDFs are re-serialized with pdf-lib to strip unused objects</li>
          <li>Original files are preserved &mdash; both original and compressed versions can be downloaded</li>
          <li>Savings percentage is calculated as: <b>(1 &minus; compressed/original) &times; 100</b></li>
        </ul>
      </div>

      <div class="upload-area" id="dropZone">
        <div class="loading-overlay" id="loadingOverlay">
          <div class="spinner"></div>
          <p id="loadingText">Uploading & compressing...</p>
        </div>
        <div class="icon">&#128228;</div>
        <b>Drop files here or click to browse</b>
        <p>Supports JPEG, PNG, and PDF up to 50MB &mdash; auto-compressed on upload</p>
        <input type="file" id="fileInput" multiple accept=".jpg,.jpeg,.png,.pdf" style="display:none">
      </div>
      <div class="progress" id="progress"><div class="progress-bar" id="progressBar"></div></div>

      <div class="section-title">Uploaded Files</div>
      <div class="table-wrap" id="tableWrap" style="display:none">
        <table>
          <thead>
            <tr>
              <th data-col="thumb" style="cursor:default">Preview</th>
              <th data-col="name">File Name <span class="sort-arrow">&#9650;&#9660;</span></th>
              <th data-col="type">Type <span class="sort-arrow">&#9650;&#9660;</span></th>
              <th data-col="originalSize">Original <span class="sort-arrow">&#9650;&#9660;</span></th>
              <th data-col="compressedSize">Compressed <span class="sort-arrow">&#9650;&#9660;</span></th>
              <th data-col="savings">Savings <span class="sort-arrow">&#9650;&#9660;</span></th>
              <th data-col="actions" style="cursor:default">Actions</th>
            </tr>
          </thead>
          <tbody id="filesBody"></tbody>
        </table>
      </div>
      <div class="empty" id="emptyState">No files uploaded yet</div>
    </div>

    <!-- ===== Batch Processing Tab ===== -->
    <div class="tab-content" id="tab-batch">
      <div class="key-points">
        <h3>Batch Processing</h3>
        <ul>
          <li>Upload a CSV or Excel file with a <span class="highlight">file_path</span> column</li>
          <li>Each row should contain an absolute path to a file on the server (JPEG, PNG, or PDF)</li>
          <li>All files will be compressed using the same logic as single uploads</li>
          <li>Download all compressed files as a single ZIP archive</li>
        </ul>
      </div>

      <div class="batch-upload-area" id="batchDropZone">
        <div class="loading-overlay" id="batchLoadingOverlay">
          <div class="spinner"></div>
          <p id="batchLoadingText">Processing batch...</p>
        </div>
        <div class="icon">&#128203;</div>
        <b>Drop CSV/Excel file here or click to browse</b>
        <p>Accepts .csv, .xlsx, .xls with a file_path column</p>
        <input type="file" id="batchFileInput" accept=".csv,.xlsx,.xls" style="display:none">
      </div>

      <div class="batch-progress-wrap" id="batchProgressWrap">
        <div class="batch-progress-bar"><div class="batch-progress-fill" id="batchProgressFill"></div></div>
        <div class="batch-progress-text" id="batchProgressText">Processing...</div>
      </div>

      <div class="batch-summary" id="batchSummary" style="display:none">
        <div class="batch-stat">
          <div class="value" id="batchTotal">0</div>
          <div class="label">Total Files</div>
        </div>
        <div class="batch-stat">
          <div class="value status-ok" id="batchSuccess">0</div>
          <div class="label">Successful</div>
        </div>
        <div class="batch-stat">
          <div class="value status-err" id="batchFailed">0</div>
          <div class="label">Failed</div>
        </div>
        <div class="batch-stat">
          <div class="value" id="batchSavingsVal">0%</div>
          <div class="label">Total Savings</div>
        </div>
        <div class="batch-stat">
          <div class="value" id="batchSavedBytes">0 B</div>
          <div class="label">Space Saved</div>
        </div>
      </div>

      <div class="table-wrap" id="batchTableWrap" style="display:none">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>File Path</th>
              <th>Status</th>
              <th>Type</th>
              <th>Original Size</th>
              <th>Compressed Size</th>
              <th>Savings</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody id="batchBody"></tbody>
        </table>
      </div>

      <button class="btn-batch-dl" id="batchDownloadBtn" style="display:none" disabled>Download All Compressed (ZIP)</button>
      <div class="empty" id="batchEmptyState">Upload a CSV/Excel to start batch processing</div>
    </div>
  </div>

  <!-- Compare modal -->
  <div class="modal-backdrop" id="compareModal">
    <div class="modal">
      <div class="modal-header">
        <h2 id="modalTitle">Compare: Original vs Compressed</h2>
        <button class="modal-close" onclick="closeCompare()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="compare-grid">
          <div class="compare-pane">
            <div class="compare-pane-header">
              <span class="label">Original</span>
              <span class="size" id="modalOrigSize"></span>
            </div>
            <div class="compare-pane-body" id="modalOrigContent"></div>
          </div>
          <div class="compare-pane">
            <div class="compare-pane-header">
              <span class="label">Compressed</span>
              <span class="size" id="modalCompSize"></span>
            </div>
            <div class="compare-pane-body" id="modalCompContent"></div>
          </div>
        </div>
        <div class="compare-savings" id="modalSavings"></div>
      </div>
    </div>
  </div>

  <div class="toast" id="toast">Copied!</div>

  <script>
    /* ===== Tab switching ===== */
    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      if (tab === 'single') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('tab-single').classList.add('active');
      } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('tab-batch').classList.add('active');
      }
    }

    /* ===== Single Upload Logic ===== */
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const filesBody = document.getElementById('filesBody');
    const emptyState = document.getElementById('emptyState');
    const tableWrap = document.getElementById('tableWrap');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const toast = document.getElementById('toast');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    function setText(el, txt) { if (el) el.textContent = txt; }

    let allFiles = [];
    let sortCol = 'name';
    let sortAsc = true;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag');
      handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    document.querySelectorAll('#tab-single thead th[data-col]').forEach(th => {
      const col = th.dataset.col;
      if (col === 'thumb' || col === 'actions') return;
      th.addEventListener('click', () => {
        if (sortCol === col) sortAsc = !sortAsc;
        else { sortCol = col; sortAsc = true; }
        document.querySelectorAll('#tab-single thead th').forEach(h => h.classList.remove('sorted'));
        th.classList.add('sorted');
        renderTable();
      });
    });

    async function handleFiles(files) {
      for (const file of files) await uploadFile(file);
      fileInput.value = '';
    }

    async function uploadFile(file) {
      const formData = new FormData();
      formData.append('file', file);
      progress.style.display = 'block';
      progressBar.style.width = '0%';
      loadingOverlay.classList.add('active');
      loadingText.textContent = 'Uploading & compressing...';
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload');
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            const pct = Math.round(e.loaded / e.total * 100);
            progressBar.style.width = pct + '%';
            if (pct >= 100) loadingText.textContent = 'Compressing...';
          }
        };
        const result = await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
            else reject(new Error(JSON.parse(xhr.responseText).error));
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(formData);
        });
        allFiles.unshift(result);
        renderTable();
      } catch (err) {
        alert('Upload failed: ' + err.message);
      } finally {
        setTimeout(() => {
          progress.style.display = 'none';
          loadingOverlay.classList.remove('active');
        }, 500);
      }
    }

    function fmtBytes(b) {
      if (b == null) return '\\u2014';
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
      return (b / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function savingsClass(pct) {
      if (pct == null) return 'savings-neutral';
      if (pct >= 25) return 'savings-green';
      if (pct >= 10) return 'savings-yellow';
      return 'savings-red';
    }

    function getFileType(f) {
      if (f.type === 'pdf' || (f.mimetype && f.mimetype.includes('pdf'))) return 'PDF';
      if (f.mimetype && f.mimetype.includes('png')) return 'PNG';
      return 'JPEG';
    }

    function sortFiles(files) {
      const sorted = [...files];
      sorted.sort((a, b) => {
        let va, vb;
        switch (sortCol) {
          case 'name': va = (a.originalName || a.filename || '').toLowerCase(); vb = (b.originalName || b.filename || '').toLowerCase(); break;
          case 'type': va = getFileType(a); vb = getFileType(b); break;
          case 'originalSize': va = a.originalSize || a.size || 0; vb = b.originalSize || b.size || 0; break;
          case 'compressedSize': va = a.compressedSize || a.size || 0; vb = b.compressedSize || b.size || 0; break;
          case 'savings': va = a.savingsPercent || 0; vb = b.savingsPercent || 0; break;
          default: return 0;
        }
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
      });
      return sorted;
    }

    function renderTable() {
      if (allFiles.length === 0) {
        emptyState.style.display = 'block';
        tableWrap.style.display = 'none';
        return;
      }
      emptyState.style.display = 'none';
      tableWrap.style.display = 'block';

      const sorted = sortFiles(allFiles);
      filesBody.innerHTML = '';
      sorted.forEach(f => {
        const tr = document.createElement('tr');
        const ft = getFileType(f);
        const origSize = f.originalSize || f.size || 0;
        const compSize = f.compressedSize || f.size || 0;
        const savings = f.savingsPercent != null ? f.savingsPercent : (origSize > 0 ? Math.round((1 - compSize / origSize) * 100) : 0);
        const sClass = savingsClass(savings);
        const typeLower = ft.toLowerCase();
        const name = f.originalName || f.filename || 'unknown';
        const id = f.id || f.filename.replace(/\\.[^.]+$/, '');
        const thumb = f.thumbnail
          ? '<img src="' + f.thumbnail + '" alt="">'
          : (ft === 'PDF' ? '<div class="pdf-icon">&#128196;</div>' : '<img src="/files/thumbnails/thumb_' + f.filename + '" alt="" onerror="this.outerHTML=\\'<div class=pdf-icon>&#128444;</div>\\'">');

        tr.innerHTML =
          '<td class="thumb-cell" data-label="">' + thumb + '</td>' +
          '<td class="name-cell" data-label="Name" title="' + name.replace(/"/g, '&quot;') + '">' + escHtml(name) + '</td>' +
          '<td data-label="Type"><span class="type-badge type-' + typeLower + '">' + ft + '</span></td>' +
          '<td class="size-cell" data-label="Original">' + fmtBytes(origSize) + '</td>' +
          '<td class="size-cell" data-label="Compressed">' + fmtBytes(compSize) + '</td>' +
          '<td data-label="Savings"><span class="' + sClass + '">' + savings + '%</span></td>' +
          '<td class="actions-cell" data-label="">' +
            '<button class="btn-sm btn-preview" onclick="openCompare(\\'' + id + '\\')">Preview</button>' +
            '<button class="btn-sm btn-dl-orig" onclick="downloadFile(\\'/download/' + id + '/original\\')">Original</button>' +
            '<button class="btn-sm btn-dl-comp" onclick="downloadFile(\\'/download/' + id + '/compressed\\')">Compressed</button>' +
            '<button class="btn-sm btn-del" onclick="deleteFile(\\'' + id + '\\')">Delete</button>' +
          '</td>';
        filesBody.appendChild(tr);
      });
    }

    function escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function downloadFile(url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function copyUrl(url) {
      navigator.clipboard.writeText(url);
      toast.style.display = 'block';
      setTimeout(() => toast.style.display = 'none', 1500);
    }

    async function deleteFile(id) {
      if (!confirm('Delete this file?')) return;
      await fetch('/file/' + id, { method: 'DELETE' });
      allFiles = allFiles.filter(f => (f.id || f.filename.replace(/\\.[^.]+$/, '')) !== id);
      renderTable();
    }

    function openCompare(id) {
      const f = allFiles.find(x => (x.id || x.filename.replace(/\\.[^.]+$/, '')) === id);
      if (!f) return;
      const ft = getFileType(f);
      const isPdf = ft === 'PDF';
      const origSize = f.originalSize || f.size || 0;
      const compSize = f.compressedSize || f.size || 0;
      const savings = f.savingsPercent != null ? f.savingsPercent : (origSize > 0 ? Math.round((1 - compSize / origSize) * 100) : 0);
      const name = f.originalName || f.filename || 'unknown';

      document.getElementById('modalTitle').textContent = 'Compare: ' + name;
      document.getElementById('modalOrigSize').textContent = fmtBytes(origSize);
      document.getElementById('modalCompSize').textContent = fmtBytes(compSize);

      const sClass = savingsClass(savings);
      document.getElementById('modalSavings').innerHTML = 'Savings: <span class="' + sClass + '">' + savings + '%</span> (' + fmtBytes(origSize - compSize) + ' saved)';

      const origEl = document.getElementById('modalOrigContent');
      const compEl = document.getElementById('modalCompContent');

      if (isPdf) {
        origEl.innerHTML = '<iframe src="/preview/' + id + '/original"></iframe>';
        compEl.innerHTML = '<iframe src="/preview/' + id + '"></iframe>';
      } else {
        origEl.innerHTML = '<img src="/preview/' + id + '/original">';
        compEl.innerHTML = '<img src="/preview/' + id + '">';
      }

      document.getElementById('compareModal').classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeCompare() {
      document.getElementById('compareModal').classList.remove('active');
      document.body.style.overflow = '';
      document.getElementById('modalOrigContent').innerHTML = '';
      document.getElementById('modalCompContent').innerHTML = '';
    }

    document.getElementById('compareModal').addEventListener('click', function(e) {
      if (e.target === this) closeCompare();
    });

    async function loadFiles() {
      const res = await fetch('/files-list');
      const data = await res.json();
      allFiles = data.files.map(f => {
        const id = f.id || f.filename.replace(/\\.[^.]+$/, '');
        return { ...f, id };
      });
      renderTable();
    }
    loadFiles();

    /* ===== Batch Processing Logic ===== */
    const batchDropZone = document.getElementById('batchDropZone');
    const batchFileInput = document.getElementById('batchFileInput');
    const batchLoadingOverlay = document.getElementById('batchLoadingOverlay');
    const batchLoadingText = document.getElementById('batchLoadingText');
    const batchProgressWrap = document.getElementById('batchProgressWrap');
    const batchProgressFill = document.getElementById('batchProgressFill');
    const batchProgressText = document.getElementById('batchProgressText');
    const batchSummary = document.getElementById('batchSummary');
    const batchTableWrap = document.getElementById('batchTableWrap');
    const batchBody = document.getElementById('batchBody');
    const batchDownloadBtn = document.getElementById('batchDownloadBtn');
    const batchEmptyState = document.getElementById('batchEmptyState');

    let currentBatchId = null;

    batchDropZone.addEventListener('click', () => batchFileInput.click());
    batchDropZone.addEventListener('dragover', e => { e.preventDefault(); batchDropZone.classList.add('drag'); });
    batchDropZone.addEventListener('dragleave', () => batchDropZone.classList.remove('drag'));
    batchDropZone.addEventListener('drop', e => {
      e.preventDefault();
      batchDropZone.classList.remove('drag');
      if (e.dataTransfer.files.length > 0) processBatch(e.dataTransfer.files[0]);
    });
    batchFileInput.addEventListener('change', () => {
      if (batchFileInput.files.length > 0) processBatch(batchFileInput.files[0]);
      batchFileInput.value = '';
    });

    batchDownloadBtn.addEventListener('click', () => {
      if (currentBatchId) {
        downloadFile('/batch-download/' + currentBatchId);
      }
    });

    async function processBatch(file) {
      const formData = new FormData();
      formData.append('file', file);

      // Show loading state
      batchLoadingOverlay.classList.add('active');
      batchLoadingText.textContent = 'Processing batch...';
      batchProgressWrap.style.display = 'block';
      batchProgressFill.style.width = '0%';
      batchProgressText.textContent = 'Uploading spreadsheet...';
      batchEmptyState.style.display = 'none';
      batchSummary.style.display = 'none';
      batchTableWrap.style.display = 'none';
      batchDownloadBtn.style.display = 'none';

      // Animate indeterminate progress
      let progressVal = 0;
      const progressInterval = setInterval(() => {
        progressVal = Math.min(progressVal + 2, 90);
        batchProgressFill.style.width = progressVal + '%';
        if (progressVal < 30) batchProgressText.textContent = 'Uploading spreadsheet...';
        else if (progressVal < 60) batchProgressText.textContent = 'Compressing files...';
        else batchProgressText.textContent = 'Almost done...';
      }, 200);

      try {
        const res = await fetch('/batch-process', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        clearInterval(progressInterval);
        batchProgressFill.style.width = '100%';
        batchProgressText.textContent = 'Complete!';

        if (!res.ok) {
          throw new Error(data.error || 'Batch processing failed');
        }

        currentBatchId = data.batchId;

        // Populate summary
        document.getElementById('batchTotal').textContent = data.total;
        document.getElementById('batchSuccess').textContent = data.success;
        document.getElementById('batchFailed').textContent = data.failed;
        document.getElementById('batchSavingsVal').textContent = data.totalSavings;
        document.getElementById('batchSavedBytes').textContent = data.totalSavedFormatted;
        batchSummary.style.display = 'flex';

        // Populate table
        batchBody.innerHTML = '';
        data.files.forEach(f => {
          const tr = document.createElement('tr');
          if (f.status === 'error') tr.classList.add('batch-row-error');
          const statusClass = f.status === 'success' ? 'status-ok' : (f.status === 'error' ? 'status-err' : 'status-pending');
          const statusLabel = f.status === 'success' ? 'OK' : (f.status === 'error' ? 'FAIL' : 'Pending');
          const sClass = f.status === 'success' ? savingsClass(f.savingsPercent) : 'savings-neutral';

          tr.innerHTML =
            '<td>' + f.index + '</td>' +
            '<td class="name-cell" title="' + escHtml(f.filePath || '') + '">' + escHtml(f.filePath || '') + '</td>' +
            '<td><span class="' + statusClass + '">' + statusLabel + '</span></td>' +
            '<td>' + (f.type ? '<span class="type-badge type-' + f.type.toLowerCase() + '">' + f.type + '</span>' : '\\u2014') + '</td>' +
            '<td class="size-cell">' + (f.originalSize ? fmtBytes(f.originalSize) : '\\u2014') + '</td>' +
            '<td class="size-cell">' + (f.compressedSize ? fmtBytes(f.compressedSize) : '\\u2014') + '</td>' +
            '<td><span class="' + sClass + '">' + (f.status === 'success' ? f.savings : '\\u2014') + '</span></td>' +
            '<td style="color:#dc2626;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escHtml(f.error || '') + '">' + escHtml(f.error || '') + '</td>';
          batchBody.appendChild(tr);
        });
        batchTableWrap.style.display = 'block';

        // Show download button
        if (data.success > 0) {
          batchDownloadBtn.style.display = 'inline-block';
          batchDownloadBtn.disabled = false;
        }

      } catch (err) {
        clearInterval(progressInterval);
        batchProgressFill.style.width = '100%';
        batchProgressFill.style.background = '#dc2626';
        batchProgressText.textContent = 'Error: ' + err.message;
      } finally {
        batchLoadingOverlay.classList.remove('active');
        setTimeout(() => {
          batchProgressWrap.style.display = 'none';
          batchProgressFill.style.background = '';
        }, 3000);
      }
    }
  </script>
</body>
</html>`;
}

module.exports = getIndexHtml;
