/**
 * Tests for image participant type (FEATURE-001)
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';

// Small 1x1 pixel red PNG as base64 for testing
const TEST_IMAGE_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

describe('Image Participant Parsing (FEATURE-001)', () => {
  it('should parse simple image participant', () => {
    const ast = parse(`image ${TEST_IMAGE_DATA} MyIcon`);
    const participant = ast.find(n => n.type === 'participant');

    expect(participant).toBeDefined();
    expect(participant.participantType).toBe('image');
    expect(participant.imageData).toBe(TEST_IMAGE_DATA);
    expect(participant.alias).toBe('MyIcon');
    expect(participant.displayName).toBe('MyIcon');
  });

  it('should parse image participant with quoted display name and alias', () => {
    const ast = parse(`image ${TEST_IMAGE_DATA} "My Custom Icon" as Icon1`);
    const participant = ast.find(n => n.type === 'participant');

    expect(participant).toBeDefined();
    expect(participant.participantType).toBe('image');
    expect(participant.imageData).toBe(TEST_IMAGE_DATA);
    expect(participant.alias).toBe('Icon1');
    expect(participant.displayName).toBe('My Custom Icon');
  });

  it('should parse image participant with styling', () => {
    const ast = parse(`image ${TEST_IMAGE_DATA} MyIcon #lightblue`);
    const participant = ast.find(n => n.type === 'participant');

    expect(participant).toBeDefined();
    expect(participant.style).toBeDefined();
    expect(participant.style.fill).toBe('#lightblue');
  });
});

describe('Image Participant Serialization', () => {
  it('should round-trip simple image participant', () => {
    const input = `image ${TEST_IMAGE_DATA} MyIcon`;
    const ast = parse(input);
    const output = serialize(ast);
    expect(output).toBe(input);
  });

  it('should round-trip image participant with quoted name and alias', () => {
    const input = `image ${TEST_IMAGE_DATA} "Display Name" as Alias`;
    const ast = parse(input);
    const output = serialize(ast);
    expect(output).toBe(input);
  });
});

describe('Image Participant Rendering', () => {
  it('should render image participant with SVG image element', () => {
    const ast = parse(`image ${TEST_IMAGE_DATA} MyIcon`);
    const svg = render(ast);

    const participant = svg.querySelector('.participant');
    expect(participant).not.toBeNull();

    // Should have an image element
    const image = participant.querySelector('image');
    expect(image).not.toBeNull();

    // Image should have the data URL as href
    const href = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    expect(href).toBe(TEST_IMAGE_DATA);
  });

  it('should render image participant with text label', () => {
    const ast = parse(`image ${TEST_IMAGE_DATA} MyIcon`);
    const svg = render(ast);

    const text = svg.querySelector('.participant text');
    expect(text).not.toBeNull();
    expect(text.textContent).toBe('MyIcon');
  });

  it('should support messages between image participants', () => {
    const ast = parse(`image ${TEST_IMAGE_DATA} A
image ${TEST_IMAGE_DATA} B
A->B:Hello`);
    const svg = render(ast);

    // Should have 2 image participants
    const images = svg.querySelectorAll('.participant image');
    expect(images.length).toBe(2);

    // Should have a message
    const message = svg.querySelector('.message');
    expect(message).not.toBeNull();
  });
});
