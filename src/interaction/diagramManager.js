import { listDiagrams, deleteDiagram } from '../storage/localstorage.js';

function showDiagramManager(loadCallback) {
  const diagrams = listDiagrams();

  const modal = document.createElement('div');
  modal.className = 'diagram-manager-modal';

  const header = document.createElement('h2');
  header.textContent = 'Manage Diagrams';
  modal.appendChild(header);

  const list = document.createElement('ul');
  diagrams.forEach(diagram => {
    const item = document.createElement('li');
    
    const name = document.createElement('span');
    name.textContent = `${diagram.name} - ${new Date(diagram.modified).toLocaleString()}`;
    name.addEventListener('click', () => {
      if (loadCallback) {
        loadCallback(diagram.text);
      }
      modal.remove();
    });
    item.appendChild(name);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete "${diagram.name}"?`)) {
        deleteDiagram(diagram.id);
        modal.remove();
        showDiagramManager(loadCallback);
      }
    });
    item.appendChild(deleteButton);

    list.appendChild(item);
  });
  modal.appendChild(list);

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => {
    modal.remove();
  });
  modal.appendChild(closeButton);

  document.body.appendChild(modal);
}

export { showDiagramManager };
