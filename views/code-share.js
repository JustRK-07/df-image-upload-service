function getCodeShareHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Sharing &mdash; Upload &amp; Compress Service</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #ffffff; color: #1e293b; min-height: 100vh; }
    .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 600; color: #0f172a; margin: 0; }
    .btn-back {
      background: #f1f5f9; color: #334155; border: none; padding: 10px 20px; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; text-decoration: none;
    }
    .btn-back:hover { background: #e2e8f0; }
    .key-points { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
    .key-points h3 { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 10px; }
    .key-points ul { list-style: none; padding: 0; }
    .key-points li { font-size: 13px; color: #334155; padding: 4px 0; padding-left: 18px; position: relative; }
    .key-points li::before { content: "\\2022"; color: #3b82f6; font-weight: bold; position: absolute; left: 0; }
    .key-points .highlight { background: #dbeafe; color: #1d4ed8; padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 12px; }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #475569; }
    .empty { text-align: center; color: #94a3b8; padding: 40px; font-size: 14px; }

    .cs-meta-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .cs-meta-row input {
      padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;
      flex: 1; min-width: 160px; outline: none;
    }
    .cs-meta-row input:focus { border-color: #3b82f6; }
    .btn-cs {
      padding: 12px 24px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: background 0.2s; white-space: nowrap;
    }
    .btn-cs-download { background: #0f172a; color: #fff; }
    .btn-cs-download:hover { background: #1e293b; }

    .cs-upload-area {
      border: 2px dashed #cbd5e1; border-radius: 12px; padding: 40px; text-align: center;
      cursor: pointer; transition: all 0.2s; background: #f8fafc; margin-bottom: 24px; position: relative;
    }
    .cs-upload-area:hover, .cs-upload-area.drag { border-color: #f59e0b; background: #fffbeb; }
    .cs-upload-area .icon { font-size: 40px; margin-bottom: 10px; }
    .cs-upload-area p { color: #64748b; margin-top: 6px; font-size: 13px; }

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

    /* Table styles */
    .table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; background: #ffffff; font-size: 13px; }
    thead th {
      padding: 12px 14px; text-align: left; font-weight: 600; color: #475569;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
    }
    tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
    tbody tr:hover { background: #f8fafc; }
    tbody td { padding: 10px 14px; vertical-align: middle; }
    .name-cell { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
    .size-cell { white-space: nowrap; }
    .actions-cell { white-space: nowrap; }
    .btn-sm {
      padding: 5px 10px; font-size: 11px; border-radius: 5px; border: none; cursor: pointer;
      font-weight: 500; transition: background 0.2s; display: inline-block; margin-right: 4px;
    }
    .btn-dl-comp { background: #dcfce7; color: #16a34a; }
    .btn-dl-comp:hover { background: #bbf7d0; }
    .btn-del { background: #fee2e2; color: #dc2626; }
    .btn-del:hover { background: #fecaca; }
    .version-badge {
      display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
    }
    .version-download { background: #dbeafe; color: #1d4ed8; }
    .version-upload { background: #fef3c7; color: #92400e; }
    .cs-note { color: #64748b; font-size: 12px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .toast {
      position: fixed; bottom: 24px; right: 24px; background: #22c55e; color: #fff;
      padding: 10px 20px; border-radius: 8px; font-size: 14px; display: none; z-index: 99;
    }

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
      .cs-meta-row { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Code Sharing</h1>
      <a class="btn-back" href="/">&#8592; Back to Main</a>
    </div>

    <div class="key-points">
      <h3>How it works</h3>
      <ul>
        <li>Download the <span class="highlight">current source code</span> as a versioned ZIP to share with others</li>
        <li>Upload a ZIP received from another person to keep a version history on the server</li>
        <li>Every download/upload is tracked with version number, author, and notes</li>
        <li>Share the ZIP via Slack, email, or any channel &mdash; the receiver uploads it here</li>
      </ul>
    </div>

    <!-- Download current source -->
    <div class="section-title">Download Current Source</div>
    <div class="cs-meta-row">
      <input type="text" id="csDownloadAuthor" placeholder="Your name (e.g. Bala)">
      <input type="text" id="csDownloadNote" placeholder="Version note (e.g. Added batch processing)">
      <button class="btn-cs btn-cs-download" onclick="downloadCurrentCode()">&#128230; Download Source ZIP</button>
    </div>

    <!-- Upload ZIP -->
    <div class="section-title" style="margin-top:24px">Upload Source ZIP</div>
    <div class="cs-meta-row">
      <input type="text" id="csUploadAuthor" placeholder="Who shared this? (e.g. Ravi)">
      <input type="text" id="csUploadNote" placeholder="Note (e.g. Fixed login bug)">
    </div>
    <div class="cs-upload-area" id="csDropZone">
      <div class="loading-overlay" id="csLoadingOverlay">
        <div class="spinner"></div>
        <p>Uploading...</p>
      </div>
      <div class="icon">&#128228;</div>
      <b>Drop a source ZIP here or click to browse</b>
      <p>Accepts .zip files only</p>
      <input type="file" id="csFileInput" accept=".zip" style="display:none">
    </div>

    <!-- Version history -->
    <div class="section-title" style="margin-top:24px">Version History</div>
    <div class="table-wrap" id="csTableWrap" style="display:none">
      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Type</th>
            <th>Filename</th>
            <th>Size</th>
            <th>Author</th>
            <th>Note</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="csBody"></tbody>
      </table>
    </div>
    <div class="empty" id="csEmptyState">No versions yet</div>
  </div>

  <div class="toast" id="toast">Done!</div>

  <script>
    const csDropZone = document.getElementById('csDropZone');
    const csFileInput = document.getElementById('csFileInput');
    const csLoadingOverlay = document.getElementById('csLoadingOverlay');
    const csTableWrap = document.getElementById('csTableWrap');
    const csBody = document.getElementById('csBody');
    const csEmptyState = document.getElementById('csEmptyState');
    const toast = document.getElementById('toast');

    csDropZone.addEventListener('click', () => csFileInput.click());
    csDropZone.addEventListener('dragover', e => { e.preventDefault(); csDropZone.classList.add('drag'); });
    csDropZone.addEventListener('dragleave', () => csDropZone.classList.remove('drag'));
    csDropZone.addEventListener('drop', e => {
      e.preventDefault();
      csDropZone.classList.remove('drag');
      if (e.dataTransfer.files.length > 0) uploadCodeZip(e.dataTransfer.files[0]);
    });
    csFileInput.addEventListener('change', () => {
      if (csFileInput.files.length > 0) uploadCodeZip(csFileInput.files[0]);
      csFileInput.value = '';
    });

    function showToast(msg) {
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => toast.style.display = 'none', 2000);
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

    function downloadCurrentCode() {
      const author = document.getElementById('csDownloadAuthor').value.trim() || 'unknown';
      const note = document.getElementById('csDownloadNote').value.trim() || 'Source code download';
      const url = '/code-share/download-current?author=' + encodeURIComponent(author) + '&note=' + encodeURIComponent(note);
      downloadFile(url);
      showToast('Downloading...');
      setTimeout(loadVersions, 2000);
    }

    async function uploadCodeZip(file) {
      const author = document.getElementById('csUploadAuthor').value.trim() || 'unknown';
      const note = document.getElementById('csUploadNote').value.trim() || 'Source code upload';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('author', author);
      formData.append('note', note);

      csLoadingOverlay.classList.add('active');
      try {
        const res = await fetch('/code-share/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        showToast('Uploaded ' + data.version + ' successfully');
        loadVersions();
      } catch (err) {
        alert('Upload failed: ' + err.message);
      } finally {
        csLoadingOverlay.classList.remove('active');
      }
    }

    async function loadVersions() {
      try {
        const res = await fetch('/code-share/versions');
        const data = await res.json();
        if (data.versions.length === 0) {
          csEmptyState.style.display = 'block';
          csTableWrap.style.display = 'none';
          return;
        }
        csEmptyState.style.display = 'none';
        csTableWrap.style.display = 'block';
        csBody.innerHTML = '';
        data.versions.forEach(v => {
          const tr = document.createElement('tr');
          const dirBadge = v.direction === 'download'
            ? '<span class="version-badge version-download">Download</span>'
            : '<span class="version-badge version-upload">Upload</span>';
          const date = new Date(v.createdAt).toLocaleString();
          tr.innerHTML =
            '<td data-label="Version"><b>' + escHtml(v.version) + '</b></td>' +
            '<td data-label="Type">' + dirBadge + '</td>' +
            '<td class="name-cell" data-label="Filename" title="' + escHtml(v.filename) + '">' + escHtml(v.filename) + '</td>' +
            '<td class="size-cell" data-label="Size">' + (v.sizeFormatted || '\\u2014') + '</td>' +
            '<td data-label="Author">' + escHtml(v.createdBy || '') + '</td>' +
            '<td class="cs-note" data-label="Note" title="' + escHtml(v.note || '') + '">' + escHtml(v.note || '') + '</td>' +
            '<td data-label="Date" style="white-space:nowrap;font-size:12px;">' + date + '</td>' +
            '<td class="actions-cell" data-label="">' +
              (v.exists ? '<button class="btn-sm btn-dl-comp" onclick="downloadFile(\\'/code-share/download/' + v.id + '\\')">Download</button>' : '') +
              '<button class="btn-sm btn-del" onclick="deleteVersion(\\'' + v.id + '\\')">Delete</button>' +
            '</td>';
          csBody.appendChild(tr);
        });
      } catch (err) {
        console.error('Failed to load versions:', err);
      }
    }

    async function deleteVersion(id) {
      if (!confirm('Delete this version?')) return;
      await fetch('/code-share/' + id, { method: 'DELETE' });
      loadVersions();
    }

    // Load on page open
    loadVersions();
  </script>
</body>
</html>`;
}

module.exports = getCodeShareHtml;
