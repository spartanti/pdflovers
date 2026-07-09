import { getPDFLib } from '../lib-loader.js';
import { readArrayBuffer, parseRanges, baseName } from '../util.js';

export default {
  accept: 'application/pdf,.pdf',
  multiple: false,
  minFiles: 1,
  buttonLabel: 'Girar PDF',
  dropHint: 'ou arraste um PDF aqui',

  options: [
    {
      type: 'radio', name: 'angle', label: 'Rotação', default: '90',
      options: [
        { value: '90', label: '90° ↻' },
        { value: '180', label: '180°' },
        { value: '270', label: '90° ↺' },
      ],
    },
    {
      type: 'radio', name: 'which', label: 'Aplicar em', default: 'all',
      options: [{ value: 'all', label: 'Todas as páginas' }, { value: 'range', label: 'Selecionadas' }],
    },
    {
      type: 'text', name: 'ranges', label: 'Páginas', default: '1',
      placeholder: 'ex: 1-3, 5', showIf: (o) => o.which === 'range',
    },
  ],

  async process(files, opts, ctx) {
    const PDFLib = await getPDFLib();
    const { degrees } = PDFLib;
    const bytes = await readArrayBuffer(files[0]);
    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = doc.getPages();
    const delta = parseInt(opts.angle, 10);

    let targets = new Set(pages.map((_, i) => i));
    if (opts.which === 'range') {
      targets = new Set();
      parseRanges(opts.ranges || '', pages.length).forEach(([a, b]) => {
        for (let p = a; p <= b; p++) targets.add(p - 1);
      });
    }

    pages.forEach((page, i) => {
      if (!targets.has(i)) return;
      const current = page.getRotation().angle || 0;
      page.setRotation(degrees((current + delta) % 360));
    });

    ctx.progress(0.9, 'Finalizando…');
    const outBytes = await doc.save();
    return { blob: new Blob([outBytes], { type: 'application/pdf' }), filename: `${baseName(files[0].name)}-girado.pdf` };
  },
};
