import { getPDFLib } from '../lib-loader.js';
import { readArrayBuffer } from '../util.js';

export default {
  accept: 'application/pdf,.pdf',
  multiple: true,
  minFiles: 2,
  reorder: true,
  buttonLabel: 'Juntar PDFs',
  dropHint: 'ou arraste seus PDFs aqui — arraste na lista para ordenar',
  zipName: 'pdflovers-juntado',

  async process(files, opts, ctx) {
    const PDFLib = await getPDFLib();
    const out = await PDFLib.PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      ctx.progress(i / files.length, `Adicionando ${files[i].name}…`);
      const bytes = await readArrayBuffer(files[i]);
      const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }

    ctx.progress(0.95, 'Finalizando…');
    const bytes = await out.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: 'juntado.pdf' };
  },
};
