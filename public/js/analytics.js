// Carrega Google Analytics (GA4) e Google AdSense — apenas se configurados.
// Sem IDs em config.js, nada é baixado (zero rede extra, zero cookies).
const cfg = window.PDFLOVERS_CONFIG || {};

// ---- Google Analytics 4 ----
if (cfg.GA_ID && /^G-/.test(cfg.GA_ID)) {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.GA_ID);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', cfg.GA_ID, { anonymize_ip: true });
}

// ---- Google AdSense (Auto Ads) ----
if (cfg.ADSENSE_ID && /^ca-pub-/.test(cfg.ADSENSE_ID)) {
  const meta = document.createElement('meta');
  meta.name = 'google-adsense-account';
  meta.content = cfg.ADSENSE_ID;
  document.head.appendChild(meta);

  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.ADSENSE_ID);
  document.head.appendChild(s);

  // Ativa qualquer bloco <ins class="adsbygoogle"> já presente na página.
  document.querySelectorAll('ins.adsbygoogle').forEach(() => {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  });
}
