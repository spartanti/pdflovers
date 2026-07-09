// Engine compartilhada das páginas de ferramenta.
// Monta toda a UI a partir do módulo da ferramenta + manifesto. Zero duplicação.
import { getTool } from './tools-manifest.js';
import { formatBytes, downloadBlob } from './util.js';
import { makeZip } from './zip.js';

const mount = document.getElementById('tool-app');
const toolId = mount.dataset.tool;

const state = {
  files: [],   // File[]
  busy: false,
};

let tool; // módulo carregado

init();

async function init() {
  const meta = getTool(toolId);
  document.title = `${meta.title} — PdfLovers`;

  // Painel base
  mount.innerHTML = `
    <div class="tool-panel">
      <label class="dropzone" id="dz">
        <div class="dz-ic">⬆️</div>
        <strong id="dz-title">Selecionar arquivos</strong>
        <span id="dz-sub">ou arraste e solte aqui</span>
        <input type="file" id="file-input">
      </label>
      <ul class="file-list" id="file-list"></ul>
      <div class="options" id="options"></div>
      <div id="notice-area"></div>
      <div class="actions">
        <button class="btn btn-primary btn-block" id="run-btn" disabled></button>
      </div>
      <div class="progress hidden" id="progress">
        <div class="progress-bar"><i id="progress-fill"></i></div>
        <div class="progress-msg" id="progress-msg">Processando…</div>
      </div>
      <div class="result hidden" id="result"></div>
    </div>
  `;

  try {
    const mod = await import(`./tools/${toolId}.js`);
    tool = mod.default;
  } catch (e) {
    showNotice('Não foi possível carregar esta ferramenta. Recarregue a página.', 'err');
    console.error(e);
    return;
  }

  setupDropzone();
  renderOptions();
  updateRunButton();
}

// ---------- Dropzone ----------
function setupDropzone() {
  const dz = document.getElementById('dz');
  const input = document.getElementById('file-input');
  input.accept = tool.accept || '';
  input.multiple = tool.multiple !== false;

  document.getElementById('dz-title').textContent =
    tool.dropTitle || (tool.multiple !== false ? 'Selecionar arquivos' : 'Selecionar arquivo');
  document.getElementById('dz-sub').textContent = tool.dropHint || 'ou arraste e solte aqui';

  input.addEventListener('change', () => {
    addFiles([...input.files]);
    input.value = '';
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); })
  );
  dz.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files) addFiles([...e.dataTransfer.files]);
  });
}

function accepts(file) {
  const accept = tool.accept || '';
  if (!accept) return true;
  return accept.split(',').some((rule) => {
    rule = rule.trim();
    if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1));
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
    return file.type === rule;
  });
}

function addFiles(files) {
  hideResult();
  clearNotice();
  const valid = files.filter(accepts);
  if (valid.length < files.length) {
    showNotice('Alguns arquivos foram ignorados por não serem do tipo aceito.', 'info');
  }
  if (tool.multiple === false) {
    state.files = valid.slice(0, 1);
  } else {
    state.files.push(...valid);
  }
  renderFileList();
  updateRunButton();
}

function removeFile(i) {
  state.files.splice(i, 1);
  hideResult();
  renderFileList();
  updateRunButton();
}

// ---------- Lista de arquivos (com reordenação por arrasto) ----------
function renderFileList() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';
  state.files.forEach((f, i) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.innerHTML = `
      ${tool.reorder ? '<span class="grip" title="Arraste para reordenar">⋮⋮</span>' : ''}
      <span class="fi-ic">${f.type.startsWith('image/') ? '🖼️' : '📄'}</span>
      <span class="fi-meta">
        <span class="fi-name">${escapeHtml(f.name)}</span>
        <span class="fi-size">${formatBytes(f.size)}</span>
      </span>
      <button class="fi-x" title="Remover" aria-label="Remover">×</button>
    `;
    li.querySelector('.fi-x').addEventListener('click', () => removeFile(i));

    if (tool.reorder) {
      li.draggable = true;
      li.addEventListener('dragstart', () => { li.classList.add('dragging'); li._idx = i; });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
    }
    list.appendChild(li);
  });

  if (tool.reorder) enableReorder(list);
}

function enableReorder(list) {
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dragging = list.querySelector('.dragging');
    if (!dragging) return;
    const after = getDragAfter(list, e.clientY);
    if (after == null) list.appendChild(dragging);
    else list.insertBefore(dragging, after);
  });
  list.addEventListener('drop', () => {
    // Reconstrói a ordem de state.files a partir do DOM.
    const order = [...list.querySelectorAll('.file-item')].map((el) => el._idx);
    state.files = order.map((idx) => state.files[idx]);
    renderFileList();
  });
}

function getDragAfter(list, y) {
  const items = [...list.querySelectorAll('.file-item:not(.dragging)')];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: -Infinity, element: null }).element;
}

// ---------- Opções declarativas ----------
function renderOptions() {
  const wrap = document.getElementById('options');
  wrap.innerHTML = '';
  const fields = typeof tool.options === 'function' ? tool.options() : (tool.options || []);
  fields.forEach((f) => wrap.appendChild(renderField(f)));
  refreshConditional();
  wrap.addEventListener('change', refreshConditional);
  wrap.addEventListener('input', refreshConditional);
}

function renderField(f) {
  const div = document.createElement('div');
  div.className = 'field';
  div.dataset.name = f.name;
  if (f.showIf) div.dataset.showif = '1';

  const hint = f.hint ? `<span class="hint"> — ${f.hint}</span>` : '';
  const labelHtml = f.label ? `<label>${f.label}${hint}</label>` : '';

  if (f.type === 'radio') {
    div.innerHTML = labelHtml + `<div class="radio-row">` + f.options.map((o) => `
      <label class="seg ${o.value === f.default ? 'active' : ''}">
        <input type="radio" name="${f.name}" value="${o.value}" ${o.value === f.default ? 'checked' : ''}>
        ${o.label}
      </label>`).join('') + `</div>`;
    div.querySelectorAll('.seg').forEach((seg) => {
      seg.addEventListener('click', () => {
        div.querySelectorAll('.seg').forEach((s) => s.classList.remove('active'));
        seg.classList.add('active');
      });
    });
  } else if (f.type === 'select') {
    div.innerHTML = labelHtml + `<select name="${f.name}">` +
      f.options.map((o) => `<option value="${o.value}" ${o.value === f.default ? 'selected' : ''}>${o.label}</option>`).join('') +
      `</select>`;
  } else if (f.type === 'checkbox') {
    div.innerHTML = `<label class="check-row" style="cursor:pointer">
      <input type="checkbox" name="${f.name}" ${f.default ? 'checked' : ''}> ${f.label}${hint}</label>`;
  } else if (f.type === 'textarea') {
    div.innerHTML = labelHtml + `<textarea name="${f.name}" rows="${f.rows || 3}" placeholder="${f.placeholder || ''}">${f.default || ''}</textarea>`;
  } else {
    const attrs = [
      f.min != null ? `min="${f.min}"` : '',
      f.max != null ? `max="${f.max}"` : '',
      f.step != null ? `step="${f.step}"` : '',
      f.placeholder ? `placeholder="${f.placeholder}"` : '',
    ].join(' ');
    div.innerHTML = labelHtml + `<input type="${f.type}" name="${f.name}" value="${f.default != null ? f.default : ''}" ${attrs}>`;
  }
  return div;
}

function refreshConditional() {
  const fields = typeof tool.options === 'function' ? tool.options() : (tool.options || []);
  const opts = collectOptions();
  fields.forEach((f) => {
    if (!f.showIf) return;
    const el = document.querySelector(`#options .field[data-name="${f.name}"]`);
    if (el) el.classList.toggle('hidden', !f.showIf(opts));
  });
}

function collectOptions() {
  const opts = {};
  document.querySelectorAll('#options [name]').forEach((el) => {
    if (el.type === 'radio') { if (el.checked) opts[el.name] = el.value; }
    else if (el.type === 'checkbox') opts[el.name] = el.checked;
    else if (el.type === 'number') opts[el.name] = el.value === '' ? null : Number(el.value);
    else opts[el.name] = el.value;
  });
  return opts;
}

// ---------- Botão / execução ----------
function updateRunButton() {
  const btn = document.getElementById('run-btn');
  const min = tool.minFiles || 1;
  const enough = state.files.length >= min;
  btn.disabled = !enough || state.busy;
  btn.textContent = state.busy
    ? 'Processando…'
    : (tool.buttonLabel || 'Processar') + (enough ? '' : ` (mín. ${min} arquivo${min > 1 ? 's' : ''})`);
  btn.onclick = run;
}

async function run() {
  if (state.busy) return;
  state.busy = true;
  clearNotice();
  hideResult();
  updateRunButton();
  showProgress(0, 'Preparando…');

  const ctx = {
    progress: (frac, msg) => showProgress(frac, msg),
  };

  try {
    const opts = collectOptions();
    if (tool.validate) tool.validate(opts, state.files);
    let out = await tool.process(state.files, opts, ctx);
    if (!Array.isArray(out)) out = [out];
    showProgress(1, 'Concluído');
    showResult(out);
  } catch (e) {
    console.error(e);
    showNotice(e.message || 'Ocorreu um erro ao processar. Verifique os arquivos e tente novamente.', 'err');
    hideProgress();
  } finally {
    state.busy = false;
    updateRunButton();
  }
}

// ---------- UI helpers ----------
function showProgress(frac, msg) {
  document.getElementById('progress').classList.remove('hidden');
  document.getElementById('progress-fill').style.width = Math.round(frac * 100) + '%';
  if (msg) document.getElementById('progress-msg').textContent = msg;
}
function hideProgress() { document.getElementById('progress').classList.add('hidden'); }

function showResult(outputs) {
  hideProgress();
  const box = document.getElementById('result');
  const total = outputs.reduce((s, o) => s + o.blob.size, 0);
  box.innerHTML = `
    <div class="ok-ic">✅</div>
    <h3>Pronto!</h3>
    <p>${outputs.length} arquivo${outputs.length > 1 ? 's' : ''} gerado${outputs.length > 1 ? 's' : ''} · ${formatBytes(total)}</p>
    <div class="dl-list" id="dl-list"></div>
  `;
  const dl = box.querySelector('#dl-list');

  if (outputs.length === 1) {
    const b = mkBtn(`⬇️ Baixar ${outputs[0].filename}`, 'btn-primary');
    b.onclick = () => downloadBlob(outputs[0].blob, outputs[0].filename);
    dl.appendChild(b);
  } else {
    const zipBtn = mkBtn(`⬇️ Baixar tudo (.zip)`, 'btn-primary');
    zipBtn.onclick = async () => {
      const files = await Promise.all(outputs.map(async (o) => ({
        name: o.filename, data: new Uint8Array(await o.blob.arrayBuffer()),
      })));
      downloadBlob(makeZip(files), (tool.zipName || 'pdflovers') + '.zip');
    };
    dl.appendChild(zipBtn);
    outputs.forEach((o) => {
      const b = mkBtn(`⬇️ ${o.filename}`, 'btn-ghost');
      b.onclick = () => downloadBlob(o.blob, o.filename);
      dl.appendChild(b);
    });
  }

  const again = mkBtn('↺ Processar outros arquivos', 'btn-ghost');
  again.onclick = reset;
  dl.appendChild(again);
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResult() { document.getElementById('result').classList.add('hidden'); }

function reset() {
  state.files = [];
  renderFileList();
  hideResult();
  clearNotice();
  updateRunButton();
}

function mkBtn(label, cls) {
  const b = document.createElement('button');
  b.className = `btn ${cls} btn-block`;
  b.textContent = label;
  return b;
}

function showNotice(msg, kind) {
  document.getElementById('notice-area').innerHTML =
    `<div class="notice notice-${kind === 'err' ? 'err' : 'info'}">${escapeHtml(msg)}</div>`;
}
function clearNotice() { document.getElementById('notice-area').innerHTML = ''; }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
