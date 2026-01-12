// PNG export functionality (BACKLOG-092)
// Converts SVG to PNG using Canvas

import { embedFontsInSVG } from './fonts.js';

/**
 * Export SVG element to PNG blob
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {number} scale - Scale factor (default 2 for high DPI)
 * @returns {Promise<Blob>} PNG blob
 */
export async function exportPNG(svgElement, scale = 2) {
  // Clone the SVG to avoid modifying the original
  const clonedSvg = svgElement.cloneNode(true);

  // Get the bounding box dimensions
  const bbox = svgElement.getBBox();
  const width = Math.ceil(bbox.width + bbox.x + 20); // Add padding
  const height = Math.ceil(bbox.height + bbox.y + 20);

  // Set explicit dimensions on the cloned SVG
  clonedSvg.setAttribute('width', width);
  clonedSvg.setAttribute('height', height);

  // Add white background
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', 'white');
  clonedSvg.insertBefore(background, clonedSvg.firstChild);

  // Embed fonts as base64 data URLs for canvas rendering
  await embedFontsInSVG(clonedSvg);

  // Inline all styles
  inlineStyles(clonedSvg);

  // Serialize the SVG
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);

  // Create a data URL from the SVG
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  // Create an image and load the SVG
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Create canvas with scaled dimensions
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');

      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Scale and draw the image
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      // Clean up the object URL
      URL.revokeObjectURL(url);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = url;
  });
}

/**
 * Export SVG to PNG and return as data URL
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {number} scale - Scale factor
 * @returns {Promise<string>} Data URL
 */
export async function exportPNGDataURL(svgElement, scale = 2) {
  const blob = await exportPNG(svgElement, scale);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Download PNG file
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {string} filename - Filename (default 'diagram.png')
 * @param {number} scale - Scale factor
 */
export async function downloadPNG(svgElement, filename = 'diagram.png', scale = 2) {
  const blob = await exportPNG(svgElement, scale);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Copy PNG to clipboard (BACKLOG-094)
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {number} scale - Scale factor
 * @returns {Promise<void>}
 */
export async function copyPNGToClipboard(svgElement, scale = 2) {
  const blob = await exportPNG(svgElement, scale);

  // Use the Clipboard API to write the image
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);
  } catch (err) {
    // Fallback error - Clipboard API may not be available or permission denied
    throw new Error(`Failed to copy to clipboard: ${err.message}`);
  }
}

/**
 * Inline CSS styles into SVG elements
 * This ensures styles are preserved when the SVG is rendered as an image
 * @param {SVGElement} svg - SVG element to process
 */
function inlineStyles(svg) {
  const elements = svg.querySelectorAll('*');

  elements.forEach(el => {
    const computedStyle = window.getComputedStyle(el);

    // List of style properties to inline
    const styleProps = [
      'fill',
      'stroke',
      'stroke-width',
      'stroke-dasharray',
      'font-family',
      'font-size',
      'font-weight',
      'text-anchor',
      'dominant-baseline',
      'opacity'
    ];

    styleProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== '') {
        el.style.setProperty(prop, value);
      }
    });
  });
}
