export {}

declare global {
  interface Window {
    electronAPI?: {
      saveBackupFile(payload: { folderPath: string; fileName: string; fileContent: string }): Promise<{ ok: boolean; path: string }>
      selectBackupFolder(): Promise<{ canceled: boolean; folderPath?: string }>
      storeBackupPassword(password: string): Promise<{ ok: boolean }>
      getBackupPassword(): Promise<{ password: string }>
    }
  }
}
