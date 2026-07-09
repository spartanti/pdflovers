// Gerador de ZIP mínimo (método "store", sem compressão).
// Imagens/PDFs já são comprimidos, então empacotar sem recomprimir é rápido e leve.
// Evita depender de uma lib de zip externa.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// files: [{ name, data: Uint8Array }]
export function makeZip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  const u16 = (n) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);

    // Cabeçalho local
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(nameBytes.length), u16(0), nameBytes, data,
    ]);
    chunks.push(local);

    // Registro central
    central.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(offset), nameBytes,
    ]));

    offset += local.length;
  }

  const centralData = concat(central);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0),
    u16(files.length), u16(files.length),
    u32(centralData.length), u32(offset), u16(0),
  ]);

  return new Blob([concat(chunks), centralData, end], { type: 'application/zip' });
}

function concat(parts) {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}
