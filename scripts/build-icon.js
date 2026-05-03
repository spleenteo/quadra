// Renderizza assets/icon.svg → assets/icon.png a 1024x1024 con sfondo trasparente,
// usando Electron in modo headless. Lanciare con: npx electron scripts/build-icon.js

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const SIZE = 1024;
const SVG_PATH = path.join(__dirname, '..', 'assets', 'icon.svg');
const PNG_PATH = path.join(__dirname, '..', 'assets', 'icon.png');

ipcMain.handle('save-png', async (_e, dataUrl) => {
  const base64 = dataUrl.split(',')[1];
  await fs.writeFile(PNG_PATH, Buffer.from(base64, 'base64'));
});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  const svg = await fs.readFile(SVG_PATH, 'utf8');
  const html = `<!DOCTYPE html>
<html><head><style>
  body, html { margin: 0; padding: 0; background: transparent; }
  canvas { display: block; }
</style></head>
<body>
  <canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
  <script>
    const { ipcRenderer } = require('electron');
    const svg = ${JSON.stringify(svg)};
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, ${SIZE}, ${SIZE});
      ctx.drawImage(img, 0, 0, ${SIZE}, ${SIZE});
      const dataUrl = canvas.toDataURL('image/png');
      await ipcRenderer.invoke('save-png', dataUrl);
      ipcRenderer.send('done');
    };
    img.onerror = (e) => { ipcRenderer.send('error', String(e)); };
    img.src = url;
  </script>
</body></html>`;

  ipcMain.once('done', () => {
    console.log('PNG salvato in', PNG_PATH);
    app.quit();
  });
  ipcMain.once('error', (_e, err) => {
    console.error('Errore:', err);
    app.exit(1);
  });

  await win.loadURL('data:text/html,' + encodeURIComponent(html));
});
