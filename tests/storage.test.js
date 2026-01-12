import { saveDiagram, listDiagrams, deleteDiagram } from '../public/src/storage/localstorage.js';

describe('localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should save a diagram to localStorage', () => {
    const name = 'Test Diagram';
    const text = 'participant A';
    const id = saveDiagram(name, text);

    const diagrams = JSON.parse(localStorage.getItem('diagrams'));
    expect(diagrams[id]).toBeDefined();
    expect(diagrams[id].name).toBe(name);
    expect(diagrams[id].text).toBe(text);
  });

  test('should list all saved diagrams', () => {
    saveDiagram('Diagram 1', 'participant A');
    saveDiagram('Diagram 2', 'participant B');

    const diagrams = listDiagrams();
    expect(diagrams.length).toBe(2);
    expect(diagrams[0].name).toBe('Diagram 1');
    expect(diagrams[1].name).toBe('Diagram 2');
  });

  test('should delete a diagram from localStorage', () => {
    const id = saveDiagram('Test Diagram', 'participant A');
    deleteDiagram(id);
    const diagrams = listDiagrams();
    expect(diagrams.length).toBe(0);
  });
});
