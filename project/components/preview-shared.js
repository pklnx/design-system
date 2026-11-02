/* Shared by the previews that render React components or logos.
   Loaded with <script src="../preview-shared.js"></script> at the end of the <body>, before the preview's own script.
   - P and h: the components (window.Pklnx, from bundle.js) and React.createElement.
   - Every element with data-logo="wordmark|mark" (data-h: height in px, data-mono: single color) becomes a Logo. */
var P = window.Pklnx, h = React.createElement;
(function () {
  function mountLogos() {
    document.querySelectorAll('[data-logo]').forEach(function (el) {
      ReactDOM.createRoot(el).render(h(P.Logo, { variant: el.getAttribute('data-logo'), height: +el.getAttribute('data-h'), mono: el.hasAttribute('data-mono') }));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountLogos); else mountLogos();
})();
