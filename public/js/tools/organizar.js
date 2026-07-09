import { getPDFLib } from '../lib-loader.js';
import { readArrayBuffer, parseRanges, baseName } from '../util.js';

export default {
  accept: 'application/pdf,.pdf',
  multiple: false,
  minFiles: 1,
  buttonLabel: 'Organizar PDF',
  dropHint: 'ou arraste um PDF aqui',

  options: [
    {
      type: 'text', name: 'order', label: 'Ordem final das páginas',
      default: '', placeholder: 'ex: 1-3, 5, 4  (vazio = todas)',
      hint: 'liste as páginas na ordem desejada; as omitidas são removidas',
    },
    { type: 'checkbox', name: 'reverse', label: 'Inverter a ordem final', default: false },
  ],

  async process(files, opts, ctx) {
    const PDFLib = await getPDFLib();
    const bytes = await readArrayBuffer(files[0]);
    const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const total = src.getPageCount();

    let indices;
    if (opts.order && opts.order.trim()) {
      indices = [];
      parseRanges(opts.order, total).forEach(([a, b]) => {
        for (let p = a; p <= b; p++) indices.push(p - 1);
      });
    } else {
      indices = src.getPageIndices();
    }
    if (opts.reverse) indices = indices.slice().reverse();
    if (!indices.length) throw new Error('A ordem resultante ficou vazia.');

    ctx.progress(0.4, 'Reorganizando…');
    const out = await PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));

    ctx.progress(0.95, 'Finalizando…');
    const outBytes = await out.save();
    return { blob: new Blob([outBytes], { type: 'application/pdf' }), filename: `${baseName(files[0].name)}-organizado.pdf` };
  },
};
