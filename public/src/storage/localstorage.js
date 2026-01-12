
function deleteDiagram(id) {
  const diagrams = JSON.parse(localStorage.getItem('diagrams') || '{}');
  delete diagrams[id];
  localStorage.setItem('diagrams', JSON.stringify(diagrams));
}

function listDiagrams() {
  const diagrams = JSON.parse(localStorage.getItem('diagrams') || '{}');
  return Object.keys(diagrams).map(id => ({ id, ...diagrams[id] }));
}

function saveDiagram(name, text) {
  const diagrams = JSON.parse(localStorage.getItem('diagrams') || '{}');
  const id = `diagram-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  diagrams[id] = {
    name,
    text,
    modified: new Date().toISOString()
  };
  localStorage.setItem('diagrams', JSON.stringify(diagrams));
  return id;
}

export { deleteDiagram, listDiagrams, saveDiagram };
