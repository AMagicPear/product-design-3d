import path from 'node:path'
import fs from 'node:fs';
import https from 'node:https';
import AdmZip from 'adm-zip';
import crypto from 'node:crypto';
import { app } from 'electron'
import { ModelRecord } from '../public/types';

// 下载文件的辅助函数
export function downloadFile(url: string, destination: string): Promise<void> {
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
export function extractZipFile(zipFilePath: string, extractDir: string): void {
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(extractDir, true);
}

// 查找GLB文件的辅助函数
export function findGlbFile(directory: string): string | null {
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

export const getCacheDirectory = () => {
  const cacheDir = path.join(app.getPath('userData'), 'model-cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
};

// 为文件URL生成唯一的缓存标识符
export const getCacheKey = (url: string): string => {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const extension = path.extname(new URL(url).pathname);
  return `${hash}${extension}`;
};

// 检查缓存是否存在
export const checkCacheExists = (cacheKey: string): string | null => {
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

export const readModelsRecord = async (): Promise<ModelRecord[]> => {
  const cacheDir = getCacheDirectory();
  const recordPath = path.join(cacheDir, 'models.json');
  if (!fs.existsSync(recordPath)) {
    return [];
  }
  const data = await fs.promises.readFile(recordPath, 'utf8');
  console.log('readModelsRecord', data, ', recordPath', recordPath);
  return JSON.parse(data);
}

export const writeModelsRecord = async (record: ModelRecord[]) => {
  const cacheDir = getCacheDirectory();
  const recordPath = path.join(cacheDir, 'models.json');
  await fs.promises.writeFile(recordPath, JSON.stringify(record, null, 2));
}