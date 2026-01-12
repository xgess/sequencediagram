// Font embedding for SVG/PNG export
// Converts font URLs to base64 data URLs for standalone SVG files

// Cache for loaded font data URLs
const fontCache = new Map();

// Font file paths
const FONT_PATHS = {
  'fa-solid': 'lib/fontawesome/webfonts/fa-solid-900.woff2',
  'fa-regular': 'lib/fontawesome/webfonts/fa-regular-400.woff2',
  'fa-brands': 'lib/fontawesome/webfonts/fa-brands-400.woff2',
  'mdi': 'lib/mdi/fonts/materialdesignicons-webfont.woff2'
};

/**
 * Load a font file and convert to base64 data URL
 * @param {string} fontPath - Path to font file
 * @returns {Promise<string>} Base64 data URL
 */
async function loadFontAsDataURL(fontPath) {
  if (fontCache.has(fontPath)) {
    return fontCache.get(fontPath);
  }

  try {
    const response = await fetch(fontPath);
    if (!response.ok) {
      throw new Error(`Failed to load font: ${fontPath}`);
    }

    const blob = await response.blob();
    const dataURL = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read font file'));
      reader.readAsDataURL(blob);
    });

    fontCache.set(fontPath, dataURL);
    return dataURL;
  } catch (error) {
    console.warn(`Could not load font ${fontPath}:`, error);
    return null;
  }
}

/**
 * Detect which icon fonts are used in an SVG
 * @param {SVGElement} svg - SVG element to check
 * @returns {Set<string>} Set of font keys ('fa-solid', 'fa-regular', 'fa-brands', 'mdi')
 */
export function detectUsedFonts(svg) {
  const usedFonts = new Set();

  const textElements = svg.querySelectorAll('text');
  textElements.forEach(text => {
    const fontFamily = text.getAttribute('font-family') || '';
    if (fontFamily.includes('FA7-Solid-SVG')) {
      usedFonts.add('fa-solid');
    }
    if (fontFamily.includes('FA7-Regular-SVG')) {
      usedFonts.add('fa-regular');
    }
    if (fontFamily.includes('FA7-Brands-SVG')) {
      usedFonts.add('fa-brands');
    }
    if (fontFamily.includes('MDI-SVG')) {
      usedFonts.add('mdi');
    }
  });

  return usedFonts;
}

/**
 * Generate CSS @font-face rules with embedded base64 fonts
 * @param {Set<string>} neededFonts - Set of font keys to embed
 * @returns {Promise<string>} CSS text with embedded fonts
 */
export async function generateEmbeddedFontCSS(neededFonts) {
  let cssRules = '';

  if (neededFonts.has('fa-solid')) {
    const dataURL = await loadFontAsDataURL(FONT_PATHS['fa-solid']);
    if (dataURL) {
      cssRules += `
        @font-face {
          font-family: "FA7-Solid-SVG";
          font-weight: 900;
          src: url("${dataURL}") format("woff2");
        }
      `;
    }
  }

  if (neededFonts.has('fa-regular')) {
    const dataURL = await loadFontAsDataURL(FONT_PATHS['fa-regular']);
    if (dataURL) {
      cssRules += `
        @font-face {
          font-family: "FA7-Regular-SVG";
          font-weight: 400;
          src: url("${dataURL}") format("woff2");
        }
      `;
    }
  }

  if (neededFonts.has('fa-brands')) {
    const dataURL = await loadFontAsDataURL(FONT_PATHS['fa-brands']);
    if (dataURL) {
      cssRules += `
        @font-face {
          font-family: "FA7-Brands-SVG";
          font-weight: 400;
          src: url("${dataURL}") format("woff2");
        }
      `;
    }
  }

  if (neededFonts.has('mdi')) {
    const dataURL = await loadFontAsDataURL(FONT_PATHS['mdi']);
    if (dataURL) {
      cssRules += `
        @font-face {
          font-family: "MDI-SVG";
          font-weight: normal;
          src: url("${dataURL}") format("woff2");
        }
      `;
    }
  }

  return cssRules;
}

/**
 * Embed fonts into an SVG element for export
 * Replaces relative URL font-face rules with embedded base64 data URLs
 * @param {SVGElement} svg - Cloned SVG element to modify
 * @returns {Promise<void>}
 */
export async function embedFontsInSVG(svg) {
  // Detect which fonts are used
  const usedFonts = detectUsedFonts(svg);
  if (usedFonts.size === 0) {
    return;
  }

  // Generate embedded font CSS
  const embeddedCSS = await generateEmbeddedFontCSS(usedFonts);
  if (!embeddedCSS) {
    return;
  }

  // Find existing style element in defs or create one
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  // Find and replace existing font-face style, or create new one
  const existingStyle = defs.querySelector('style');
  if (existingStyle) {
    // Replace URL-based font-face rules with embedded ones
    existingStyle.textContent = embeddedCSS;
  } else {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = embeddedCSS;
    defs.appendChild(style);
  }
}

/**
 * Preload all icon fonts (call on app init for faster exports)
 * @returns {Promise<void>}
 */
export async function preloadFonts() {
  const loadPromises = Object.values(FONT_PATHS).map(path =>
    loadFontAsDataURL(path).catch(() => null)
  );
  await Promise.all(loadPromises);
}
