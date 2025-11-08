import { BrowserWindow, ipcMain, app } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'
import axios from 'axios'
import fs from 'node:fs';
import https from 'node:https';
import AdmZip from 'adm-zip';
import crypto from 'node:crypto';

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


ipcMain.handle('download-and-extract-model', async (_event, fileUrl: string) => {
  try {
    console.log('开始处理模型文件:', fileUrl);
    
    // 生成缓存键
    const cacheKey = getCacheKey(fileUrl);
    console.log(`缓存键: ${cacheKey}`);
    
    // 检查是否有有效的缓存
    const cachedFilePath = checkCacheExists(cacheKey);
    
    if (cachedFilePath) {
      // 直接使用缓存的文件
      console.log('使用缓存文件:', cachedFilePath);
      return { 
        glbFileUrl: `file://${cachedFilePath}`,
        tempDir: null // 因为使用缓存，不需要清理临时目录
      };
    }
    
    // 如果没有缓存，执行下载和解压流程
    console.log('缓存不存在，开始下载');
    
    // 创建临时目录
    const tempDir = path.join(app.getPath('temp'), `model_${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 下载ZIP文件
    const zipFilePath = path.join(tempDir, 'model.zip');
    await downloadFile(fileUrl, zipFilePath);
    console.log('模型文件下载完成:', zipFilePath);
    
    // 解压ZIP文件
    const extractDir = path.join(tempDir, 'extracted');
    extractZipFile(zipFilePath, extractDir);
    console.log('模型文件解压完成:', extractDir);
    
    // 查找解压后的glb文件
    let glbFilePath = findGlbFile(path.join(extractDir, 'rgb'));
    if (!glbFilePath) {
      glbFilePath = findGlbFile(path.join(extractDir, 'pbr'));
    }
    
    if (!glbFilePath) {
      throw new Error('未找到GLB模型文件');
    }
    
    console.log('找到GLB模型文件:', glbFilePath);
    
    // 复制到缓存目录，以便下次使用
    const cacheDir = getCacheDirectory();
    const cachedGLBPath = path.join(cacheDir, cacheKey);
    fs.copyFileSync(glbFilePath, cachedGLBPath);
    console.log('模型已缓存到:', cachedGLBPath);
    
    // 将文件路径转换为可在渲染进程中使用的URL
    const glbFileUrl = `file://${glbFilePath}`;
    return { glbFileUrl, tempDir };
    
  } catch (error) {
    console.error('下载和解压模型失败:', error);
    throw error;
  }
});

// 添加一个清除缓存的IPC处理器（可选）
ipcMain.handle('clear-model-cache', async () => {
  try {
    const cacheDir = getCacheDirectory();
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir); // 重新创建缓存目录
      console.log('模型缓存已清空');
    }
    return { success: true };
  } catch (error) {
    console.error('清空模型缓存失败:', error);
    return { success: false, error: String(error) };
  }
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

// 下载文件的辅助函数
function downloadFile(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`下载文件失败，状态码: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }).on('error', (error) => {
      fs.unlink(destination, () => {
        reject(error);
      });
    });
  });
}

// 解压ZIP文件的辅助函数
function extractZipFile(zipFilePath: string, extractDir: string): void {
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(extractDir, true);
}

// 查找GLB文件的辅助函数
function findGlbFile(directory: string): string | null {
  if (!fs.existsSync(directory)) {
    return null;
  }

  const files = fs.readdirSync(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const nestedGlb = findGlbFile(filePath);
      if (nestedGlb) return nestedGlb;
    } else if (file.toLowerCase().endsWith('.glb')) {
      return filePath;
    }
  }

  return null;
}

const getCacheDirectory = () => {
  const cacheDir = path.join(app.getPath('userData'), 'model-cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
};

// 为文件URL生成唯一的缓存标识符
const getCacheKey = (url: string): string => {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  // 获取文件扩展名
  const extension = path.extname(new URL(url).pathname) || '.glb';
  return `${hash}${extension}`;
};

// 检查缓存是否存在
const checkCacheExists = (cacheKey: string): string | null => {
  const cacheDir = getCacheDirectory();
  const cachedFilePath = path.join(cacheDir, cacheKey);
  
  if (fs.existsSync(cachedFilePath)) {
    // 可以在这里添加缓存过期检查逻辑
    // 例如：检查文件创建时间，如果超过一定天数则视为过期
    const stats = fs.statSync(cachedFilePath);
    const now = Date.now();
    const cacheAge = now - stats.ctimeMs;
    const maxCacheAge = 30 * 24 * 60 * 60 * 1000; // 30天
    
    if (cacheAge < maxCacheAge) {
      console.log(`缓存文件有效，路径: ${cachedFilePath}`);
      return cachedFilePath;
    } else {
      console.log(`缓存文件已过期，将重新下载`);
      return null;
    }
  }
  
  return null;
};

