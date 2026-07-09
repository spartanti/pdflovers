// Carregamento sob demanda das bibliotecas pesadas.
// Só baixa o que a ferramenta realmente usa → menos rede e memória.

const loaded = new Map();

function loadScript(src) {
  if (loaded.has(src)) return loaded.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar ' + src));
    document.head.appendChild(s);
  });
  loaded.set(src, p);
  return p;
}

export async function getPDFLib() {
  await loadScript('/vendor/pdf-lib.min.js');
  return window.PDFLib;
}

export async function getPdfjs() {
  await loadScript('/vendor/pdf.min.js');
  const pdfjsLib = window.pdfjsLib;
  // O worker roda o parsing/render fora da thread principal → UI fluida.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
  return pdfjsLib;
}

export async function getJsPDF() {
  await loadScript('/vendor/jspdf.umd.min.js');
  return window.jspdf.jsPDF;
}
