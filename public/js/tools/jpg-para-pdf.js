import { getPDFLib } from '../lib-loader.js';
import { readArrayBuffer } from '../util.js';
import { canvasToBytes } from '../canvas-util.js';

const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };

async function embedImage(out, file) {
  const bytes = new Uint8Array(await readArrayBuffer(file));
  if (file.type === 'image/jpeg') return out.embedJpg(bytes);
  if (file.type === 'image/png') return out.embedPng(bytes);
  // WebP/GIF/BMP etc. → rasteriza para JPEG via canvas.
  const bmp = await createImageBitmap(new Blob([bytes], { type: file.type }));
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(bmp.width, bmp.height)
    : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height });
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0);
  return out.embedJpg(await canvasToBytes(canvas, 'image/jpeg', 0.92));
}

export default {
  accept: 'image/*',
  multiple: true,
  minFiles: 1,
  reorder: true,
  buttonLabel: 'Converter para PDF',
  dropTitle: 'Selecionar imagens',
  dropHint: 'JPG, PNG, WebP — arraste na lista para ordenar',

  options: [
    {
      type: 'radio', name: 'size', label: 'Tamanho da página', default: 'fit',
      options: [
        { value: 'fit', label: 'Ajustar à imagem' },
        { value: 'a4', label: 'A4' },
        { value: 'letter', label: 'Carta' },
      ],
    },
    {
      type: 'radio', name: 'orient', label: 'Orientação', default: 'auto',
      options: [
        { value: 'auto', label: 'Automática' },
        { value: 'portrait', label: 'Retrato' },
        { value: 'landscape', label: 'Paisagem' },
      ],
      showIf: (o) => o.size !== 'fit',
    },
    { type: 'number', name: 'margin', label: 'Margem (pt)', default: 0, min: 0, max: 100 },
  ],

  async process(files, opts, ctx) {
    const PDFLib = await getPDFLib();
    const out = await PDFLib.PDFDocument.create();
    const margin = Math.max(0, opts.margin || 0);

    for (let i = 0; i < files.length; i++) {
      ctx.progress(i / files.length, `Adicionando ${files[i].name}…`);
      const img = await embedImage(out, files[i]);

      if (opts.size === 'fit') {
        const page = out.addPage([img.width + margin * 2, img.height + margin * 2]);
        page.drawImage(img, { x: margin, y: margin, width: img.width, height: img.height });
      } else {
        let [pw, ph] = SIZES[opts.size];
        const wide = img.width > img.height;
        if (opts.orient === 'landscape' || (opts.orient === 'auto' && wide)) [pw, ph] = [ph, pw];
        const page = out.addPage([pw, ph]);
        const availW = pw - margin * 2;
        const availH = ph - margin * 2;
        const scale = Math.min(availW / img.width, availH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      }
    }

    ctx.progress(0.97, 'Finalizando…');
    const bytes = await out.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: 'imagens.pdf' };
  },
};
