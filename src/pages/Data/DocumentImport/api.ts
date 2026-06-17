import { request } from '@umijs/max';
import { API_PREFIX } from '@/constants';

// 分片初始化任务接口
export function initChunkFileTask(data: {
  fileName: string;
  fileSize: number;
  lastModified: number;
  fingerprint: string;
  sampleHash: string;
  chunkSize: number;
  chunkTotal: number;
}) {
  return request(`${API_PREFIX}/infra/file/shard/init`, {
    method: 'POST',
    data,
  });
}

// 分片上传接口
export function createChunkFileTask(data: FormData) {
  return request(`${API_PREFIX}/infra/file/shard/upload`, {
    method: 'POST',
    data,
    requestType: 'form',
  });
}

// 分片合并接口
export function mergeChunkFileTask(data: { uploadId: string }) {
  return request(`${API_PREFIX}/infra/file/shard/complete`, {
    method: 'POST',
    data,
  });
}

// 素材解析
export function createFileBaseData(data: {
  fileList: any[];
  dealRepeat: number;
  level: number;
}) {
  return request(`${API_PREFIX}/intelligent/file-base-data/create`, {
    method: 'POST',
    data,
  });
}
