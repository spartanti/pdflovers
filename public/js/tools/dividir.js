import { getPDFLib } from '../lib-loader.js';
import { readArrayBuffer, parseRanges, baseName } from '../util.js';

export default {
  accept: 'application/pdf,.pdf',
  multiple: false,
  minFiles: 1,
  buttonLabel: 'Dividir PDF',
  dropHint: 'ou arraste um PDF aqui',
  zipName: 'pdflovers-dividido',

  options: [
    {
      type: 'radio', name: 'mode', label: 'Como dividir?', default: 'extract',
      options: [
        { value: 'extract', label: 'Extrair páginas' },
        { value: 'ranges', label: 'Intervalos → arquivos' },
        { value: 'each', label: 'Uma por arquivo' },
        { value: 'every', label: 'A cada N páginas' },
      ],
    },
    {
      type: 'text', name: 'ranges', label: 'Páginas', default: '1-1',
      placeholder: 'ex: 1-3, 5, 8-10', hint: 'quais páginas usar',
      showIf: (o) => o.mode === 'extract' || o.mode === 'ranges',
    },
    {
      type: 'number', name: 'n', label: 'Páginas por arquivo', default: 2, min: 1,
      showIf: (o) => o.mode === 'every',
    },
  ],

  async process(files, opts, ctx) {
    const PDFLib = await getPDFLib();
    const bytes = await readArrayBuffer(files[0]);
    const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const total = src.getPageCount();
    const stem = baseName(files[0].name);

    // Constrói um PDF a partir de índices (0-indexado) do documento fonte.
    const build = async (indices) => {
      const doc = await PDFLib.PDFDocument.create();
      const pages = await doc.copyPages(src, indices);
      pages.forEach((p) => doc.addPage(p));
      const b = await doc.save();
      return new Blob([b], { type: 'application/pdf' });
    };

    let groups = []; // { indices, name }

    if (opts.mode === 'extract') {
      const ranges = parseRanges(opts.ranges || '', total);
      const idx = [];
      ranges.forEach(([a, b]) => { for (let p = a; p <= b; p++) idx.push(p - 1); });
      groups.push({ indices: idx, name: `${stem}-extraido.pdf` });
    } else if (opts.mode === 'ranges') {
      const ranges = parseRanges(opts.ranges || '', total);
      ranges.forEach(([a, b]) => {
        const idx = [];
        for (let p = a; p <= b; p++) idx.push(p - 1);
        groups.push({ indices: idx, name: `${stem}-${a}${b > a ? '-' + b : ''}.pdf` });
      });
    } else if (opts.mode === 'each') {
      for (let p = 0; p < total; p++) {
        groups.push({ indices: [p], name: `${stem}-pagina-${p + 1}.pdf` });
      }
    } else if (opts.mode === 'every') {
      const n = Math.max(1, opts.n || 1);
      for (let start = 0, part = 1; start < total; start += n, part++) {
        const idx = [];
        for (let p = start; p < Math.min(start + n, total); p++) idx.push(p);
        groups.push({ indices: idx, name: `${stem}-parte-${part}.pdf` });
      }
    }

    const out = [];
    for (let i = 0; i < groups.length; i++) {
      ctx.progress(i / groups.length, `Gerando ${groups[i].name}…`);
      out.push({ blob: await build(groups[i].indices), filename: groups[i].name });
    }
    return out;
  },
};
