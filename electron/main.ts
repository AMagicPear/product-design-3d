import { BrowserWindow, ipcMain, app, Notification } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'
import axios from 'axios'
import fs from 'node:fs';
import { checkCacheExists, downloadFile, extractZipFile, findGlbFile, getCacheDirectory, getCacheKey, readModelsRecord, writeModelsRecord } from './utils'
import { ModelRecord, ModelShow } from '../public/types'


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

    console.log('Generating model with URL:', url);

    const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

    const requestBody = {
      model: 'doubao-seed3d-1-0-250928',
      content: [
        {
          type: "text",
          text: "--subdivisionlevel medium --fileformat glb"
        },
        {
          type: "image_url",
          image_url: {
            url: url
          }
        }
      ]
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(baseUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ARK_API_KEY}`
      },
      timeout: 30000 // 添加超时设置
    });

    const responseData = response.data;
    console.log('Response received:', responseData);
    // 返回任务ID
    return responseData;

  } catch (error) {
    // 改进错误处理，输出更多详细信息
    if (axios.isAxiosError(error)) {
      console.error('API请求失败：', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('未知错误：', error);
    }
    throw error; // 重新抛出错误以便前端处理
  }
});

ipcMain.handle('get-model-status', async (_event, taskId: string) => {
  try {
    if (!process.env.ARK_API_KEY) {
      throw new Error('ARK_API_KEY not found in environment variables')
    }
    console.log('get-model-status', taskId)
    const baseUrl = `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`

    // 轮询直到模型状态为succeeded
    while (true) {
      const response = await axios.get(
        baseUrl,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ARK_API_KEY}`
          }
        }
      );
      const modelStatus = response.data;
      console.log('模型状态：', modelStatus);

      // 检查状态是否为succeeded
      if (modelStatus.status === 'succeeded') {
        console.log('模型生成成功，返回content');
        return modelStatus.content; // 返回content而不是整个modelStatus
      }

      // 如果状态不是succeeded，等待5秒后继续轮询
      console.log('模型状态不是succeeded，5秒后重试');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error('请求失败：', error);
    throw error; // 重新抛出错误以便前端处理
  }
})

ipcMain.handle('download-and-extract-model', async (_event, fileUrl: string): Promise<ModelShow> => {
  const cacheKey = getCacheKey(fileUrl);
  const tempDir = path.join(app.getPath('temp'), `model_${cacheKey}`)
  try {
    console.log('开始处理模型文件:', fileUrl);
    console.log(`缓存键: ${cacheKey}`);
    let cachedFilePath: string | null = checkCacheExists(cacheKey);
    // 如果没有缓存，执行下载流程
    if (!cachedFilePath) {
      console.log('缓存不存在，开始下载');
      if (!fs.existsSync(tempDir)) { fs.mkdirSync(tempDir, { recursive: true }); }
      const tempZipPath = path.join(tempDir, 'model.zip')
      await downloadFile(fileUrl, tempZipPath)
      console.info('模型文件下载完成:', tempZipPath)
      const cacheDir = getCacheDirectory();
      cachedFilePath = path.join(cacheDir, cacheKey);
      fs.copyFileSync(tempZipPath, cachedFilePath);
      console.info('模型已缓存到:', cachedFilePath);
      new Notification({
        title: '模型下载完成',
        body: '您的模型文件已成功下载并缓存。'
      }).show()
    }
    // 解压ZIP文件
    const extractDir = path.join(tempDir, 'extracted');
    extractZipFile(cachedFilePath, extractDir);
    console.log('模型文件解压完成:', extractDir);

    // 查找解压后的glb文件
    let glbFilePath = findGlbFile(path.join(extractDir, 'pbr'));
    if (!glbFilePath) {
      glbFilePath = findGlbFile(path.join(extractDir, 'rgb'));
    }
    if (!glbFilePath) {
      throw new Error('未找到GLB模型文件');
    }

    // 更新模型记录
    const record: ModelRecord = {
      url: fileUrl,
      cacheKey,
      cachedZIPPath: cachedFilePath,
      timestamp: Date.now()
    };
    const records = await readModelsRecord();
    if (!records.find(r => r.cacheKey === cacheKey)) {
      records.push(record);
      await writeModelsRecord(records);
    }
    const data = await fs.promises.readFile(glbFilePath);

    // 转换为buffer供前端使用
    return { glbFileUrl: glbFilePath, buffer: data.buffer } as ModelShow;

  } catch (error) {
    console.error('下载和解压模型失败:', error);
    throw error;
  }
});

ipcMain.handle('get-all-models', async (_event) => {
  return await readModelsRecord()
})

ipcMain.handle('delete-model', async (_event, cacheKey: string) => {
  const records = await readModelsRecord();
  const index = records.findIndex(r => r.cacheKey === cacheKey);
  if (index !== -1) {
    records.splice(index, 1);
    await writeModelsRecord(records);
    console.log(`模型 ${cacheKey} 已删除`);
    return true;
  }
  console.log(`未找到模型 ${cacheKey}`);
  return false;
});

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
