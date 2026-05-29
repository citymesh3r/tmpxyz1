(function () {
  "use strict";

  const cfg = window.CITYMESH3R_DATA?.analytics || {};
  if (!cfg.enabled || !cfg.googleTagId || cfg.googleTagId === "G-XXXXXXXXXX") return;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.googleTagId);
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", cfg.googleTagId);
})();
