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

export function initErrorSplitter(splitter, editorPane, errorsPane) {
  let isDragging = false;

  splitter.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const container = splitter.parentElement;
    const containerRect = container.getBoundingClientRect();
    const mouseY = e.clientY - containerRect.top;
    const containerHeight = container.clientHeight;

    // Calculate new error panel height (from bottom)
    const newErrorHeight = containerHeight - mouseY - splitter.offsetHeight;

    // Constrain between 50px and 50% of container
    const minHeight = 50;
    const maxHeight = containerHeight * 0.5;

    if (newErrorHeight >= minHeight && newErrorHeight <= maxHeight) {
      errorsPane.style.height = `${newErrorHeight}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}
