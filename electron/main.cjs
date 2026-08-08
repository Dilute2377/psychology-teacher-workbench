const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const isDevelopment = !app.isPackaged
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (isDevelopment) {
    mainWindow.loadURL('http://127.0.0.1:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
}

function validateBackupFilePayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('备份文件参数无效。')
  const folderPath = typeof payload.folderPath === 'string' ? path.resolve(payload.folderPath) : ''
  const fileName = typeof payload.fileName === 'string' ? payload.fileName : ''
  const fileContent = typeof payload.fileContent === 'string' ? payload.fileContent : ''
  if (!folderPath || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) throw new Error('备份目录不存在或不可写。')
  if (!fileName || path.basename(fileName) !== fileName || !fileName.endsWith('.mindbag')) throw new Error('备份文件名无效。')
  if (!fileContent || fileContent.length > 100 * 1024 * 1024) throw new Error('备份内容为空或超过 100 MB 限制。')
  return { folderPath, fileName, fileContent }
}

ipcMain.handle('save-backup-file', (_event, payload) => {
  const { folderPath, fileName, fileContent } = validateBackupFilePayload(payload)
  const targetPath = path.join(folderPath, fileName)
  fs.writeFileSync(targetPath, fileContent, 'utf8')
  return { ok: true, path: targetPath }
})

ipcMain.handle('select-backup-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
  return result.canceled ? { canceled: true } : { canceled: false, folderPath: result.filePaths[0] ?? '' }
})

function backupPasswordPath() {
  return path.join(app.getPath('userData'), 'backup-password.bin')
}

ipcMain.handle('store-backup-password', (_event, password) => {
  if (typeof password !== 'string' || !password) return { ok: false }
  if (!safeStorage.isEncryptionAvailable()) return { ok: false }
  fs.mkdirSync(app.getPath('userData'), { recursive: true })
  fs.writeFileSync(backupPasswordPath(), safeStorage.encryptString(password))
  return { ok: true }
})

ipcMain.handle('get-backup-password', () => {
  try {
    if (!safeStorage.isEncryptionAvailable() || !fs.existsSync(backupPasswordPath())) return { password: '' }
    return { password: safeStorage.decryptString(fs.readFileSync(backupPasswordPath())) }
  } catch {
    return { password: '' }
  }
})

app.setName('心理老师工作台')

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
