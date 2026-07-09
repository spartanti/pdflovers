// GERADO por build.mjs — não edite à mão. Fonte: TOOLS em build.mjs.
export const TOOLS = [
  {
    "id": "juntar",
    "icon": "📎",
    "title": "Juntar PDF",
    "desc": "Combine vários PDFs em um só, na ordem que você quiser.",
    "category": "Organizar"
  },
  {
    "id": "dividir",
    "icon": "✂️",
    "title": "Dividir PDF",
    "desc": "Separe páginas ou extraia intervalos para novos arquivos.",
    "category": "Organizar"
  },
  {
    "id": "organizar",
    "icon": "🗂️",
    "title": "Organizar PDF",
    "desc": "Reordene, inverta e remova páginas do seu PDF.",
    "category": "Organizar"
  },
  {
    "id": "comprimir",
    "icon": "🗜️",
    "title": "Comprimir PDF",
    "desc": "Reduza o tamanho do arquivo mantendo qualidade aceitável.",
    "category": "Otimizar"
  },
  {
    "id": "girar",
    "icon": "🔄",
    "title": "Girar PDF",
    "desc": "Gire páginas em 90°, 180° ou 270°, todas ou selecionadas.",
    "category": "Editar"
  },
  {
    "id": "marca-dagua",
    "icon": "💧",
    "title": "Marca d’água",
    "desc": "Adicione texto de marca d’água sobre todas as páginas.",
    "category": "Editar"
  },
  {
    "id": "numeros-de-pagina",
    "icon": "#️⃣",
    "title": "Números de página",
    "desc": "Insira numeração automática na posição que preferir.",
    "category": "Editar"
  },
  {
    "id": "pdf-para-jpg",
    "icon": "🖼️",
    "title": "PDF para JPG",
    "desc": "Converta cada página do PDF em uma imagem JPG ou PNG.",
    "category": "Converter"
  },
  {
    "id": "jpg-para-pdf",
    "icon": "📷",
    "title": "JPG para PDF",
    "desc": "Transforme imagens (JPG, PNG, WebP) em um único PDF.",
    "category": "Converter"
  }
];

export function getTool(id) {
  return TOOLS.find((t) => t.id === id);
}
