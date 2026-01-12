let autosaveInterval;

function startAutosave(getTextCallback, interval = 60000) {
  stopAutosave();
  autosaveInterval = setInterval(() => {
    const text = getTextCallback();
    if (text) {
      localStorage.setItem('autosave', JSON.stringify({
        text,
        timestamp: new Date().toISOString()
      }));
    }
  }, interval);
}

function stopAutosave() {
  clearInterval(autosaveInterval);
}

function recoverAutosave() {
  const autosave = localStorage.getItem('autosave');
  if (autosave) {
    try {
      const { text, timestamp } = JSON.parse(autosave);
      // Only offer recovery if there's actual content
      if (text && text.trim()) {
        if (confirm(`There is an autosaved diagram from ${new Date(timestamp).toLocaleString()}. Do you want to recover it?`)) {
          return text;
        }
      }
    } catch (e) {
      // Invalid autosave data, ignore it
      console.warn('Invalid autosave data:', e);
    }
  }
  return null;
}

export { startAutosave, stopAutosave, recoverAutosave };
