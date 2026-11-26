/* Ink-wash filters. SVG filters only work from inside the same document, so this
   file injects them. Load it before the shots are drawn:
     <script src=".../styles/ink-wash/ink.js"></script>
   Classes that use them are in ink.css. */
(function () {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <!-- brush edge: a slight wobble so no line is ruler-straight -->
    <filter id="ink-rough" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="8" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -0.55" result="pits"/>
      <feComposite in="d" in2="pits" operator="in"/>
    </filter>
    <!-- dry brush: vertical streaks eaten out of the shape -->
    <filter id="ink-dry" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.11 0.004" numOctaves="2" seed="5" result="s"/>
      <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  5.5 0 0 0 -1.7" result="streak"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="9" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feComposite in="d" in2="streak" operator="in"/>
    </filter>
    <!-- wash: watery area with a soft, uneven edge -->
    <filter id="ink-wash" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="5" result="b"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="2" seed="2" result="p"/>
      <feColorMatrix in="p" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 0.25" result="pool"/>
      <feComposite in="b" in2="pool" operator="in"/>
    </filter>
    <!-- the same two, scaled for shapes under about 150 px, which the big filters tear apart -->
    <filter id="ink-dry-small" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.32 0.012" numOctaves="2" seed="5" result="s"/>
      <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  5.5 0 0 0 -1.35" result="streak"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="9" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feComposite in="d" in2="streak" operator="in"/>
    </filter>
    <filter id="ink-wash-small" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="1.6"/>
    </filter>
    <!-- mist: far hills, nearly gone -->
    <filter id="ink-mist" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" seed="21" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="60" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="16"/>
    </filter>
  </defs>
</svg>`;
  const mount = () => document.body.insertAdjacentHTML('afterbegin', svg);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
