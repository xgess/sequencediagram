export function initSplitter(splitter, leftPane, rightPane) {
  let isDragging = false;

  splitter.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const container = splitter.parentElement;
    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = e.clientX - containerRect.left;

    if (newLeftWidth > 100 && newLeftWidth < container.clientWidth - 100) {
      leftPane.style.flex = `0 0 ${newLeftWidth}px`;
      rightPane.style.flex = '1 1 auto';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}
