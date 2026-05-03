const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, handler) {
  const listener = (_e, ...args) => handler(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('api', {
  openImage: () => ipcRenderer.invoke('dialog:open-image'),
  readImage: (filePath) => ipcRenderer.invoke('fs:read-image', filePath),
  saveAsDialog: (suggestedPath) => ipcRenderer.invoke('dialog:save-as', suggestedPath),
  writeImage: (filePath, bytes) => ipcRenderer.invoke('fs:write-image', { filePath, bytes }),
  onMenuOpen: (handler) => subscribe('menu:open', handler),
  onMenuSave: (handler) => subscribe('menu:save', handler),
  onMenuSaveAs: (handler) => subscribe('menu:save-as', handler),
  onMenuResetAll: (handler) => subscribe('menu:reset-all', handler),
  onOSOpenFile: (handler) => subscribe('os:open-file', handler),
});
