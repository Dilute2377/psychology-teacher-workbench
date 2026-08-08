const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  saveBackupFile: (payload) => ipcRenderer.invoke('save-backup-file', payload),
  selectBackupFolder: () => ipcRenderer.invoke('select-backup-folder'),
  storeBackupPassword: (password) => ipcRenderer.invoke('store-backup-password', password),
  getBackupPassword: () => ipcRenderer.invoke('get-backup-password'),
})
