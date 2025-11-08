import { app, BrowserWindow, ipcMain } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'
import axios from 'axios'

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')
dotenv.config({ path: path.join(process.env.APP_ROOT, '.env') })
console.log('ARK_API_KEY:', process.env.ARK_API_KEY)

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    width: 800,
    height: 600,
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

ipcMain.handle('generate-images', async (_event, description: string, sequentialImageGeneration: string) => {
  try {
    if (!process.env.ARK_API_KEY) {
      throw new Error('ARK_API_KEY not found in environment variables')
    }
    console.log('generate-images', description, sequentialImageGeneration)
    const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
    const response = await axios.post(
      baseUrl,
      {
        model: 'doubao-seedream-4-0-250828',
        prompt: description,
        "sequential_image_generation": sequentialImageGeneration,
        "response_format": "url",
        "size": "2K",
        "stream": false,
        "watermark": false,
        "sequential_image_generation_options": {
          'max_images': 6
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ARK_API_KEY}`
        }
      }
    );
    const imagesUrls = response.data.data.map((item: any) => item.url);
    console.log('生成的图片 URL：', imagesUrls);
    return imagesUrls;

  } catch (error) {
    console.error('请求失败：', error);
  }
})

ipcMain.handle('generate-model', async (_event, url: string) => {
  try {
    if (!process.env.ARK_API_KEY) {
      throw new Error('ARK_API_KEY not found in environment variables')
    }
    console.log('generate-model', url)
    const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks'
    const response = await axios.post(
      baseUrl,
      {
        model: 'doubao-seed3d-1-0-250928',
        "content": [
          {
            "type": "text",
            "text": "--subdivisionlevel medium --fileformat glb"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": url
            }
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ARK_API_KEY}`
        }
      }
    );
    const responseData = response.data
    return responseData;
  } catch (error) {
    console.error('请求失败：', error);
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
