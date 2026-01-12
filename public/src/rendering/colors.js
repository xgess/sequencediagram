// Color utilities for SVG rendering
// Handles conversion between parser format (#colorname) and SVG format (colorname or #hex)

/**
 * Standard CSS named colors mapped to their hex values.
 * This list can be easily extended with additional colors.
 * See: https://www.w3.org/TR/css-color-4/#named-colors
 */
export const NAMED_COLORS = {
  // Basic colors
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',

  // Gray shades
  gray: '#808080',
  grey: '#808080',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  silver: '#c0c0c0',
  dimgray: '#696969',
  dimgrey: '#696969',

  // Light colors (commonly used)
  lightblue: '#add8e6',
  lightgreen: '#90ee90',
  lightyellow: '#ffffe0',
  lightpink: '#ffb6c1',
  lightcyan: '#e0ffff',
  lightcoral: '#f08080',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightgoldenrodyellow: '#fafad2',

  // Common colors
  orange: '#ffa500',
  pink: '#ffc0cb',
  purple: '#800080',
  violet: '#ee82ee',
  brown: '#a52a2a',
  gold: '#ffd700',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  maroon: '#800000',
  aqua: '#00ffff',
  lime: '#00ff00',
  fuchsia: '#ff00ff',

  // Blues
  aliceblue: '#f0f8ff',
  azure: '#f0ffff',
  cadetblue: '#5f9ea0',
  cornflowerblue: '#6495ed',
  darkblue: '#00008b',
  deepskyblue: '#00bfff',
  dodgerblue: '#1e90ff',
  mediumblue: '#0000cd',
  midnightblue: '#191970',
  powderblue: '#b0e0e6',
  royalblue: '#4169e1',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  steelblue: '#4682b4',

  // Greens
  chartreuse: '#7fff00',
  darkgreen: '#006400',
  darkolivegreen: '#556b2f',
  darkseagreen: '#8fbc8f',
  forestgreen: '#228b22',
  lawngreen: '#7cfc00',
  limegreen: '#32cd32',
  mediumseagreen: '#3cb371',
  mediumspringgreen: '#00fa9a',
  palegreen: '#98fb98',
  seagreen: '#2e8b57',
  springgreen: '#00ff7f',
  yellowgreen: '#9acd32',
  greenyellow: '#adff2f',

  // Reds/Pinks
  coral: '#ff7f50',
  crimson: '#dc143c',
  darkred: '#8b0000',
  deeppink: '#ff1493',
  firebrick: '#b22222',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  mediumvioletred: '#c71585',
  orangered: '#ff4500',
  palevioletred: '#db7093',
  salmon: '#fa8072',
  tomato: '#ff6347',

  // Yellows/Oranges
  bisque: '#ffe4c4',
  blanchedalmond: '#ffebcd',
  burlywood: '#deb887',
  cornsilk: '#fff8dc',
  darkorange: '#ff8c00',
  darkgoldenrod: '#b8860b',
  goldenrod: '#daa520',
  khaki: '#f0e68c',
  lemonchiffon: '#fffacd',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  oldlace: '#fdf5e6',
  palegoldenrod: '#eee8aa',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  wheat: '#f5deb3',

  // Purples
  blueviolet: '#8a2be2',
  darkorchid: '#9932cc',
  darkviolet: '#9400d3',
  indigo: '#4b0082',
  lavender: '#e6e6fa',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  orchid: '#da70d6',
  plum: '#dda0dd',
  rebeccapurple: '#663399',
  thistle: '#d8bfd8',

  // Browns
  chocolate: '#d2691e',
  peru: '#cd853f',
  rosybrown: '#bc8f8f',
  saddlebrown: '#8b4513',
  sandybrown: '#f4a460',
  sienna: '#a0522d',
  tan: '#d2b48c',

  // Whites/Creams
  antiquewhite: '#faebd7',
  beige: '#f5f5dc',
  floralwhite: '#fffaf0',
  ghostwhite: '#f8f8ff',
  honeydew: '#f0fff0',
  ivory: '#fffff0',
  lavenderblush: '#fff0f5',
  linen: '#faf0e6',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  seashell: '#fff5ee',
  snow: '#fffafa',
  whitesmoke: '#f5f5f5',

  // Others
  aquamarine: '#7fffd4',
  darkcyan: '#008b8b',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darksalmon: '#e9967a',
  darkturquoise: '#00ced1',
  mediumaquamarine: '#66cdaa',
  mediumturquoise: '#48d1cc',
  paleturquoise: '#afeeee',
  turquoise: '#40e0d0',
  slategray: '#708090',
  slategrey: '#708090',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  gainsboro: '#dcdcdc',
};

/**
 * Check if a color string is a valid hex color
 * @param {string} color - Color string (with or without #)
 * @returns {boolean} True if valid hex color
 */
function isHexColor(color) {
  if (!color) return false;
  const hex = color.startsWith('#') ? color.slice(1) : color;
  // Valid hex: 3, 4, 6, or 8 hex digits (with optional alpha)
  return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{4}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(hex);
}

/**
 * Resolve a color from parser format to SVG-compatible format.
 *
 * Parser stores colors as:
 *   - "#ff0000" for hex colors
 *   - "#lightblue" for named colors
 *
 * SVG expects:
 *   - "#ff0000" for hex colors
 *   - "lightblue" for named colors (no #)
 *
 * @param {string} color - Color from parser (e.g., "#lightblue" or "#ff0000")
 * @returns {string|null} SVG-compatible color string, or null if invalid
 */
export function resolveColor(color) {
  if (!color) return null;

  // If it doesn't start with #, return as-is (already in correct format)
  if (!color.startsWith('#')) {
    return color;
  }

  const value = color.slice(1); // Remove the #

  // Check if it's a valid hex color (keep the #)
  if (isHexColor(color)) {
    return color;
  }

  // Check if it's a known named color
  const lowerValue = value.toLowerCase();
  if (NAMED_COLORS[lowerValue]) {
    // Return the named color without # (SVG will understand it)
    // Or return the hex equivalent - both work, hex is more explicit
    return lowerValue;
  }

  // Unknown color - return as named color without # and let browser handle it
  // This allows any CSS color name to work even if not in our list
  return lowerValue;
}

/**
 * Get the hex value for a named color
 * @param {string} colorName - Color name (e.g., "lightblue" or "#lightblue")
 * @returns {string|null} Hex color value or null if not found
 */
export function getHexValue(colorName) {
  if (!colorName) return null;
  const name = colorName.replace(/^#/, '').toLowerCase();
  return NAMED_COLORS[name] || null;
}
