export interface ModelRecord {
  url: string;
  cacheKey: string;
  cachedZIPPath: string;
  timestamp: number;
}

export interface ModelShow {
  glbFileUrl: string;
  buffer: ArrayBuffer;
}