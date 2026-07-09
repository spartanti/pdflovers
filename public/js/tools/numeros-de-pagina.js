import { getPDFLib } from '../lib-loader.js';
import { readArrayBuffer, baseName } from '../util.js';

export default {
  accept: 'application/pdf,.pdf',
  multiple: false,
  minFiles: 1,
  buttonLabel: 'Numerar páginas',
  dropHint: 'ou arraste um PDF aqui',

  options: [
    {
      type: 'select', name: 'position', label: 'Posição', default: 'bottom-center',
      options: [
        { value: 'bottom-center', label: 'Inferior centro' },
        { value: 'bottom-right', label: 'Inferior direita' },
        { value: 'bottom-left', label: 'Inferior esquerda' },
        { value: 'top-center', label: 'Superior centro' },
        { value: 'top-right', label: 'Superior direita' },
        { value: 'top-left', label: 'Superior esquerda' },
      ],
    },
    {
      type: 'select', name: 'format', label: 'Formato', default: 'n',
      options: [
        { value: 'n', label: '1, 2, 3…' },
        { value: 'n_de_total', label: '1 de N' },
        { value: 'pagina_n', label: 'Página 1' },
      ],
    },
    { type: 'number', name: 'start', label: 'Começar em', default: 1, min: 0 },
    { type: 'number', name: 'size', label: 'Tamanho da fonte', default: 12, min: 6, max: 48 },
  ],

  async process(files, opts, ctx) {
    const PDFLib = await getPDFLib();
    const { rgb, StandardFonts } = PDFLib;
    const bytes = await readArrayBuffer(files[0]);
    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const size = opts.size || 12;
    const start = opts.start != null ? opts.start : 1;
    const margin = 28;

    const pages = doc.getPages();
    const total = pages.length;

    pages.forEach((page, i) => {
      ctx.progress(i / total, `Numerando página ${i + 1}…`);
      const num = start + i;
      let label = String(num);
      if (opts.format === 'n_de_total') label = `${num} de ${start + total - 1}`;
      else if (opts.format === 'pagina_n') label = `Página ${num}`;

      const { width, height } = page.getSize();
      const tw = font.widthOfTextAtSize(label, size);
      const [vpos, hpos] = opts.position.split('-');
      const y = vpos === 'top' ? height - margin - size : margin;
      let x = margin;
      if (hpos === 'center') x = (width - tw) / 2;
      else if (hpos === 'right') x = width - margin - tw;

      page.drawText(label, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
    });

    ctx.progress(0.95, 'Finalizando…');
    const outBytes = await doc.save();
    return { blob: new Blob([outBytes], { type: 'application/pdf' }), filename: `${baseName(files[0].name)}-numerado.pdf` };
  },
};
