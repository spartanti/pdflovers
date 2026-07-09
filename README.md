# PdfLovers ❤

Ferramentas de PDF gratuitas no estilo iLovePDF — **100% no navegador**. Junte, divida, comprima, gire, adicione marca d'água, numere páginas e converta entre PDF e imagens, sem enviar nada para servidor nenhum.

> **Filosofia:** o servidor só entrega arquivos estáticos pequenos. Todo o processamento pesado (via `pdf-lib`, `pdf.js` e `jsPDF`) roda no dispositivo do usuário. Resultado: **pouca memória, pouca CPU e pouca rede no servidor** — além de privacidade total e escala praticamente gratuita.

## ✨ Ferramentas

| Ferramenta | O que faz |
|---|---|
| Juntar PDF | Combina vários PDFs em um só (com reordenação) |
| Dividir PDF | Extrai páginas, divide por intervalos, por página ou a cada N |
| Organizar PDF | Reordena, inverte e remove páginas |
| Comprimir PDF | Rasteriza e reembute como JPEG para reduzir tamanho |
| Girar PDF | Gira 90/180/270°, todas ou páginas selecionadas |
| Marca d'água | Texto sobreposto (diagonal, horizontal ou mosaico) |
| Números de página | Numeração automática, posição e formato configuráveis |
| PDF para JPG | Cada página vira imagem JPG ou PNG |
| JPG para PDF | Junta imagens (JPG/PNG/WebP) em um PDF |

## 🏗️ Arquitetura

```
pdflovers/
├── server.js            # Servidor estático Node puro (zero dependências): gzip, cache, ETag
├── build.mjs            # Gerador: cria HTML das páginas, guias, sitemap, llms.txt, robots
├── railway.json         # Config de deploy no Railway
└── public/              # Tudo que é servido
    ├── index.html, 404.html, tools/*.html, guias/*.html   (GERADOS por build.mjs)
    ├── sitemap.xml, robots.txt, llms.txt, site.webmanifest (GERADOS)
    ├── config.js        # ⚙️ Ponto único p/ Analytics e AdSense
    ├── ads.txt          # Google AdSense (preencher após aprovação)
    ├── css/style.css
    ├── vendor/          # pdf-lib, pdf.js (+worker), jsPDF (cache imutável)
    └── js/
        ├── tool-page.js       # Engine de UI compartilhada (dropzone, opções, progresso)
        ├── tools-manifest.js  # GERADO — lista de ferramentas
        ├── lib-loader.js      # Carrega libs sob demanda
        ├── canvas-util.js, util.js, zip.js, analytics.js
        └── tools/*.js         # Uma ferramenta = um módulo pequeno
```

**Importante:** os arquivos HTML e o `tools-manifest.js` são **gerados** por `build.mjs`. Não edite à mão — edite `build.mjs` (fonte única de textos, guias e SEO) e rode `npm run build`.

## 🚀 Rodando localmente

```bash
npm run build     # gera as páginas a partir de build.mjs
npm start         # sobe o servidor (porta 8080 por padrão, ou $PORT)
# abra http://localhost:8080
```

Não há dependências para instalar (`node_modules` vazio) — só Node 18+.

## ⚙️ Configurar Analytics e AdSense

Edite **apenas** `public/config.js`:

```js
window.PDFLOVERS_CONFIG = {
  SITE_URL: 'https://SEU-DOMINIO',
  GA_ID: 'G-XXXXXXXXXX',            // Google Analytics 4 (opcional)
  ADSENSE_ID: 'ca-pub-XXXXXXXXXXXX' // Google AdSense (opcional)
};
```

Sem IDs, nada é carregado (zero rede extra, zero cookies). Para o AdSense, após a aprovação da conta edite também `public/ads.txt`.

Se mudar o domínio, gere o sitemap/canonicals corretos:
```bash
SITE_URL=https://seu-dominio npm run build
```

## 🔎 SEO e IA

- **JSON-LD** por página: `SoftwareApplication`, `HowTo`, `FAQPage`, `BreadcrumbList`.
- `sitemap.xml`, `robots.txt` (libera GPTBot, ClaudeBot, PerplexityBot etc.) e **`llms.txt`** para assistentes de IA.
- Guias de uso em `/guias/` com passo a passo, dicas e FAQ.
- Open Graph/Twitter Cards, canonical, PWA manifest.

## ☁️ Deploy no Railway

O `railway.json` já define `node server.js`. O servidor escuta em `$PORT` (injetada pelo Railway). Após o deploy, gere um domínio em **Settings → Networking**.

## 📄 Licença

MIT. Bibliotecas de terceiros mantêm suas licenças (pdf-lib, pdf.js, jsPDF).
