import { getPDFLib, getPdfjs } from '../lib-loader.js';
import { readArrayBuffer, baseName } from '../util.js';
import { renderPageToCanvas, canvasToBytes, releaseCanvas } from '../canvas-util.js';

// Comprime rasterizando cada página e reembutindo como JPEG.
// Ideal para PDFs digitalizados / cheios de imagens. O texto deixa de ser
// selecionável (vira imagem), em troca de arquivos bem menores.
const LEVELS = {
  extrema: { scale: 1.0, quality: 0.5 },
  recomendada: { scale: 1.5, quality: 0.65 },
  leve: { scale: 2.0, quality: 0.8 },
};

export default {
  accept: 'application/pdf,.pdf',
  multiple: false,
  minFiles: 1,
  buttonLabel: 'Comprimir PDF',
  dropHint: 'ou arraste um PDF aqui',

  options: [
    {
      type: 'radio', name: 'level', label: 'Nível de compressão', default: 'recomendada',
      options: [
        { value: 'extrema', label: 'Máxima (menor)' },
        { value: 'recomendada', label: 'Recomendada' },
        { value: 'leve', label: 'Leve (melhor)' },
      ],
    },
  ],

  async process(files, opts, ctx) {
    const level = LEVELS[opts.level] || LEVELS.recomendada;
    const PDFLib = await getPDFLib();
    const pdfjs = await getPdfjs();

    const data = await readArrayBuffer(files[0]);
    const src = await pdfjs.getDocument({ data, disableAutoFetch: true, disableStream: true }).promise;
    const out = await PDFLib.PDFDocument.create();
    const n = src.numPages;

    for (let i = 1; i <= n; i++) {
      ctx.progress((i - 1) / n, `Comprimindo página ${i} de ${n}…`);
      const page = await src.getPage(i);
      const base = page.getViewport({ scale: 1 }); // tamanho em pontos (72dpi)
      const canvas = await renderPageToCanvas(page, level.scale);
      const jpg = await canvasToBytes(canvas, 'image/jpeg', level.quality);
      releaseCanvas(canvas);

      const img = await out.embedJpg(jpg);
      const p = out.addPage([base.width, base.height]);
      p.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
      page.cleanup();
    }

    ctx.progress(0.97, 'Finalizando…');
    const bytes = await out.save();
    const outBlob = new Blob([bytes], { type: 'application/pdf' });

    // Se não reduziu (PDF já otimizado / muito texto), avisa via nome.
    const smaller = outBlob.size < files[0].size;
    return {
      blob: outBlob,
      filename: `${baseName(files[0].name)}${smaller ? '-comprimido' : '-rasterizado'}.pdf`,
    };
  },
};
