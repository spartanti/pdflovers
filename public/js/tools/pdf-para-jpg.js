import { getPdfjs } from '../lib-loader.js';
import { readArrayBuffer, baseName } from '../util.js';
import { renderPageToCanvas, canvasToBlob, releaseCanvas } from '../canvas-util.js';

const SCALES = { '1': 1.0, '1.5': 1.5, '2': 2.0, '3': 3.0 };

export default {
  accept: 'application/pdf,.pdf',
  multiple: false,
  minFiles: 1,
  buttonLabel: 'Converter para imagem',
  dropHint: 'ou arraste um PDF aqui',
  zipName: 'pdflovers-imagens',

  options: [
    {
      type: 'radio', name: 'format', label: 'Formato', default: 'jpg',
      options: [{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }],
    },
    {
      type: 'radio', name: 'scale', label: 'Resolução', default: '1.5',
      options: [
        { value: '1', label: 'Tela (72dpi)' },
        { value: '1.5', label: 'Boa' },
        { value: '2', label: 'Alta' },
        { value: '3', label: 'Máxima' },
      ],
    },
    {
      type: 'number', name: 'quality', label: 'Qualidade JPG (%)', default: 85, min: 30, max: 100,
      showIf: (o) => o.format === 'jpg',
    },
  ],

  async process(files, opts, ctx) {
    const pdfjs = await getPdfjs();
    const scale = SCALES[opts.scale] || 1.5;
    const isJpg = opts.format === 'jpg';
    const type = isJpg ? 'image/jpeg' : 'image/png';
    const ext = isJpg ? 'jpg' : 'png';
    const quality = isJpg ? Math.min(1, Math.max(0.3, (opts.quality || 85) / 100)) : undefined;

    const data = await readArrayBuffer(files[0]);
    const src = await pdfjs.getDocument({ data, disableAutoFetch: true, disableStream: true }).promise;
    const stem = baseName(files[0].name);
    const n = src.numPages;
    const pad = String(n).length;

    const out = [];
    for (let i = 1; i <= n; i++) {
      ctx.progress((i - 1) / n, `Renderizando página ${i} de ${n}…`);
      const page = await src.getPage(i);
      const canvas = await renderPageToCanvas(page, scale);
      const blob = await canvasToBlob(canvas, type, quality);
      releaseCanvas(canvas);
      page.cleanup();
      out.push({ blob, filename: `${stem}-${String(i).padStart(pad, '0')}.${ext}` });
    }
    return out;
  },
};
