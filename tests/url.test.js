import { createShareURL, loadFromURL } from '../src/storage/url.js';
import { JSDOM } from 'jsdom';

describe('url', () => {
  const dom = new JSDOM('', { url: 'http://localhost' });
  global.window = dom.window;
  global.location = dom.window.location;

  test('should create a shareable URL', () => {
    const text = 'participant A';
    const url = createShareURL(text);
    expect(url).toContain('#initialData=');
  });

  test('should load data from a shareable URL', () => {
    const text = 'participant A';
    const url = createShareURL(text);
    window.location.hash = url.split('#')[1];

    const data = loadFromURL();
    expect(data.text).toBe(text);
  });

  test('should handle presentation and shrinkToFit options', () => {
    const text = 'participant A';
    const url = createShareURL(text, { presentation: true, shrinkToFit: true });
    window.location.hash = url.split('#')[1];

    const data = loadFromURL();
    expect(data.presentation).toBe(true);
    expect(data.shrinkToFit).toBe(true);
  });
});
