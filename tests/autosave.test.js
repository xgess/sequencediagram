import { startAutosave, stopAutosave, recoverAutosave } from '../public/src/storage/autosave.js';
import { vi } from 'vitest';

describe('autosave', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should start autosaving', () => {
    const getTextCallback = () => 'participant A';
    startAutosave(getTextCallback, 1000);
    vi.advanceTimersByTime(1000);
    const autosave = JSON.parse(localStorage.getItem('autosave'));
    expect(autosave).toBeDefined();
    expect(autosave.text).toBe('participant A');
    stopAutosave();
  });

  test('should stop autosaving', () => {
    const getTextCallback = () => 'participant A';
    startAutosave(getTextCallback, 1000);
    stopAutosave();
    vi.advanceTimersByTime(1000);
    const autosave = localStorage.getItem('autosave');
    expect(autosave).toBeNull();
  });

  test('should recover autosaved diagram', () => {
    const text = 'participant A';
    const timestamp = new Date().toISOString();
    localStorage.setItem('autosave', JSON.stringify({ text, timestamp }));
    
    global.confirm = () => true;
    const recoveredText = recoverAutosave();
    expect(recoveredText).toBe(text);
  });

  test('should not recover if user cancels', () => {
    const text = 'participant A';
    const timestamp = new Date().toISOString();
    localStorage.setItem('autosave', JSON.stringify({ text, timestamp }));
    
    global.confirm = () => false;
    const recoveredText = recoverAutosave();
    expect(recoveredText).toBeNull();
  });
});
