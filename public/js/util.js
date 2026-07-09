// Utilitários pequenos e sem dependências.

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Libera memória assim que o download começa.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function baseName(name) {
  return name.replace(/\.[^/.]+$/, '');
}

export function sanitize(name) {
  return name.replace(/[^\w.\- ]+/g, '_').trim() || 'arquivo';
}

// Converte "1-3, 5, 8-10" em [ [1,3], [5,5], [8,10] ] (1-indexado).
export function parseRanges(str, maxPage) {
  const out = [];
  for (const part of str.split(',')) {
    const s = part.trim();
    if (!s) continue;
    const m = s.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) throw new Error(`Intervalo inválido: "${s}"`);
    let a = parseInt(m[1], 10);
    let b = m[2] ? parseInt(m[2], 10) : a;
    if (a > b) [a, b] = [b, a];
    a = Math.max(1, a);
    b = Math.min(maxPage, b);
    if (a <= b) out.push([a, b]);
  }
  if (!out.length) throw new Error('Nenhum intervalo válido informado.');
  return out;
}

// Lê um File como ArrayBuffer via Promise (compat ampla).
export function readArrayBuffer(file) {
  return file.arrayBuffer
    ? file.arrayBuffer()
    : new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsArrayBuffer(file);
      });
}
