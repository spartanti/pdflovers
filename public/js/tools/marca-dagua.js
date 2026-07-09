import { getPDFLib } from '../lib-loader.js';
import { readArrayBuffer, baseName } from '../util.js';

const COLORS = {
  cinza: [0.5, 0.5, 0.5],
  vermelho: [0.86, 0.15, 0.15],
  azul: [0.15, 0.35, 0.86],
  preto: [0, 0, 0],
};

export default {
  accept: 'application/pdf,.pdf',
  multiple: false,
  minFiles: 1,
  buttonLabel: 'Adicionar marca d’água',
  dropHint: 'ou arraste um PDF aqui',

  options: [
    { type: 'text', name: 'text', label: 'Texto', default: 'CONFIDENCIAL', placeholder: 'Seu texto aqui' },
    {
      type: 'radio', name: 'layout', label: 'Disposição', default: 'diagonal',
      options: [
        { value: 'diagonal', label: 'Diagonal' },
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'mosaico', label: 'Mosaico' },
      ],
    },
    {
      type: 'select', name: 'color', label: 'Cor', default: 'cinza',
      options: [
        { value: 'cinza', label: 'Cinza' }, { value: 'vermelho', label: 'Vermelho' },
        { value: 'azul', label: 'Azul' }, { value: 'preto', label: 'Preto' },
      ],
    },
    { type: 'number', name: 'size', label: 'Tamanho da fonte', default: 50, min: 8, max: 200 },
    { type: 'number', name: 'opacity', label: 'Opacidade (%)', default: 30, min: 5, max: 100 },
  ],

  async process(files, opts, ctx) {
    const PDFLib = await getPDFLib();
    const { rgb, degrees, StandardFonts } = PDFLib;
    const bytes = await readArrayBuffer(files[0]);
    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.HelveticaBold);

    const text = opts.text || 'CONFIDENCIAL';
    const size = opts.size || 50;
    const opacity = Math.min(1, Math.max(0.05, (opts.opacity || 30) / 100));
    const [r, g, b] = COLORS[opts.color] || COLORS.cinza;
    const color = rgb(r, g, b);
    const tw = font.widthOfTextAtSize(text, size);
    const th = font.heightAtSize(size);

    const pages = doc.getPages();
    pages.forEach((page, idx) => {
      ctx.progress(idx / pages.length, `Marcando página ${idx + 1}…`);
      const { width, height } = page.getSize();
      const common = { font, size, color, opacity };

      if (opts.layout === 'mosaico') {
        const stepX = tw + 60;
        const stepY = th + 90;
        for (let y = 0; y < height + stepY; y += stepY) {
          for (let x = -tw; x < width + stepX; x += stepX) {
            page.drawText(text, { ...common, x, y, rotate: degrees(30) });
          }
        }
      } else if (opts.layout === 'horizontal') {
        page.drawText(text, { ...common, x: (width - tw) / 2, y: (height - th) / 2 });
      } else {
        // Diagonal centralizada
        page.drawText(text, {
          ...common,
          x: width / 2 - (tw / 2) * Math.cos(Math.PI / 4),
          y: height / 2 - (tw / 2) * Math.sin(Math.PI / 4),
          rotate: degrees(45),
        });
      }
    });

    ctx.progress(0.95, 'Finalizando…');
    const outBytes = await doc.save();
    return { blob: new Blob([outBytes], { type: 'application/pdf' }), filename: `${baseName(files[0].name)}-marca.pdf` };
  },
};
