// Render fragment boxes (alt, loop, opt, etc.)
// See DESIGN.md for fragment rendering details

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Render a fragment node to SVG
 * @param {Object} node - Fragment AST node
 * @param {Object} layoutInfo - Position info {x, y, width, height}
 * @returns {SVGGElement} Rendered fragment group
 */
export function renderFragment(node, layoutInfo) {
  const { x, y, width, height } = layoutInfo;
  const style = node.style || {};

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'fragment');

  // Draw main fragment box (light background)
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('class', 'fragment-box');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('fill', style.fill || '#f8f8f8');
  rect.setAttribute('stroke', style.border || '#333');
  rect.setAttribute('stroke-width', style.borderWidth !== undefined ? style.borderWidth : 1);
  if (style.borderStyle === 'dashed') {
    rect.setAttribute('stroke-dasharray', '5,5');
  }
  group.appendChild(rect);

  // Draw fragment label box (top-left corner)
  const labelBoxWidth = 80;
  const labelBoxHeight = 22;
  const labelBox = document.createElementNS(SVG_NS, 'rect');
  labelBox.setAttribute('class', 'fragment-label-box');
  labelBox.setAttribute('x', x);
  labelBox.setAttribute('y', y);
  labelBox.setAttribute('width', labelBoxWidth);
  labelBox.setAttribute('height', labelBoxHeight);
  labelBox.setAttribute('fill', style.operatorColor || '#e8e8e8');
  labelBox.setAttribute('stroke', style.border || '#333');
  labelBox.setAttribute('stroke-width', style.borderWidth !== undefined ? style.borderWidth : 1);
  group.appendChild(labelBox);

  // Draw diagonal corner on label box
  const cornerPath = document.createElementNS(SVG_NS, 'path');
  cornerPath.setAttribute('d', `M ${x + labelBoxWidth} ${y} L ${x + labelBoxWidth} ${y + labelBoxHeight - 8} L ${x + labelBoxWidth - 8} ${y + labelBoxHeight} L ${x + labelBoxWidth} ${y + labelBoxHeight}`);
  cornerPath.setAttribute('fill', style.operatorColor || '#e8e8e8');
  cornerPath.setAttribute('stroke', style.border || '#333');
  cornerPath.setAttribute('stroke-width', style.borderWidth !== undefined ? style.borderWidth : 1);
  group.appendChild(cornerPath);

  // Draw fragment type label (e.g., "alt", "loop")
  const typeLabel = document.createElementNS(SVG_NS, 'text');
  typeLabel.setAttribute('class', 'fragment-label');
  typeLabel.setAttribute('x', x + 6);
  typeLabel.setAttribute('y', y + 15);
  typeLabel.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
  typeLabel.setAttribute('font-size', '11');
  typeLabel.setAttribute('font-weight', 'bold');
  // For expandable fragments, show "expandable" not "expandable+" or "expandable-"
  typeLabel.textContent = node.fragmentType === 'expandable' ? 'expandable' : node.fragmentType;
  group.appendChild(typeLabel);

  // For expandable fragments, add collapse/expand icon
  if (node.fragmentType === 'expandable') {
    const iconX = x + labelBoxWidth - 18;
    const iconY = y + 5;
    const iconSize = 12;

    // Draw toggle icon background
    const iconBg = document.createElementNS(SVG_NS, 'rect');
    iconBg.setAttribute('class', 'expandable-toggle');
    iconBg.setAttribute('x', iconX);
    iconBg.setAttribute('y', iconY);
    iconBg.setAttribute('width', iconSize);
    iconBg.setAttribute('height', iconSize);
    iconBg.setAttribute('fill', '#fff');
    iconBg.setAttribute('stroke', '#666');
    iconBg.setAttribute('stroke-width', '1');
    iconBg.setAttribute('rx', '2');
    iconBg.style.cursor = 'pointer';
    group.appendChild(iconBg);

    // Draw + or - symbol
    const iconSymbol = document.createElementNS(SVG_NS, 'text');
    iconSymbol.setAttribute('class', 'expandable-toggle-icon');
    iconSymbol.setAttribute('x', iconX + iconSize / 2);
    iconSymbol.setAttribute('y', iconY + iconSize / 2 + 1);
    iconSymbol.setAttribute('text-anchor', 'middle');
    iconSymbol.setAttribute('dominant-baseline', 'middle');
    iconSymbol.setAttribute('font-size', '12');
    iconSymbol.setAttribute('font-weight', 'bold');
    iconSymbol.setAttribute('fill', '#333');
    iconSymbol.style.cursor = 'pointer';
    iconSymbol.textContent = node.collapsed ? '+' : '−';
    group.appendChild(iconSymbol);
  }

  // Draw condition text (after label box)
  if (node.condition) {
    const conditionLabel = document.createElementNS(SVG_NS, 'text');
    conditionLabel.setAttribute('class', 'fragment-condition');
    conditionLabel.setAttribute('x', x + labelBoxWidth + 8);
    conditionLabel.setAttribute('y', y + 15);
    conditionLabel.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
    conditionLabel.setAttribute('font-size', '11');
    conditionLabel.textContent = `[${node.condition}]`;
    group.appendChild(conditionLabel);
  }

  // Draw else clause dividers
  for (const elseClause of node.elseClauses) {
    if (elseClause.dividerY !== undefined) {
      // Draw horizontal divider line
      const divider = document.createElementNS(SVG_NS, 'line');
      divider.setAttribute('class', 'fragment-divider');
      divider.setAttribute('x1', x);
      divider.setAttribute('y1', elseClause.dividerY);
      divider.setAttribute('x2', x + width);
      divider.setAttribute('y2', elseClause.dividerY);
      divider.setAttribute('stroke', style.border || '#333');
      divider.setAttribute('stroke-width', style.borderWidth !== undefined ? style.borderWidth : 1);
      divider.setAttribute('stroke-dasharray', '5,5');
      group.appendChild(divider);

      // Draw else label
      const elseLabel = document.createElementNS(SVG_NS, 'text');
      elseLabel.setAttribute('class', 'fragment-else-label');
      elseLabel.setAttribute('x', x + 6);
      elseLabel.setAttribute('y', elseClause.dividerY + 14);
      elseLabel.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
      elseLabel.setAttribute('font-size', '10');
      elseLabel.textContent = elseClause.condition ? `[else ${elseClause.condition}]` : '[else]';
      group.appendChild(elseLabel);
    }
  }

  return group;
}
