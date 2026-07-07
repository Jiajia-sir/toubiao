import * as CryptoJS from 'crypto-js';
import {
  initChunkFileTask,
  createChunkFileTask,
  mergeChunkFileTask,
} from '@/pages/Data/DocumentImport/api';

const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB

export const UPLOADING_STATUS_LIST = ['分片任务初始化', '分片上传中', '分片合并中', '解析中'];

export type UploadStatus =
  | '准备上传'
  | '分片任务初始化'
  | '分片上传中'
  | '分片合并中'
  | '解析中'
  | '上传成功'
  | '失败';

export interface UploadFileItem {
  uid: string;
  name: string;
  size: number;
  file: File;
  uploadStatus: UploadStatus;
  percentage: number;
  errorMsg?: string;
  responseData?: any[];
}

/**
 * SHA256 哈希计算
 */
function sha256(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  const wordArray = CryptoJS.lib.WordArray.create(uint8Array);
  return CryptoJS.SHA256(wordArray).toString();
}

/**
 * 计算采样哈希（首尾各取256KB）
 */
export async function calcSampleHash(file: File): Promise<string> {
  const sampleSize = 256 * 1024;
  const threshold = sampleSize * 2;

  // 文件小于 512KB，全量计算
  if (file.size <= threshold) {
    const fullBuffer = await file.arrayBuffer();
    return sha256(fullBuffer);
  }

  // 首尾各取 256KB
  const headBuffer = await file.slice(0, sampleSize).arrayBuffer();
  const tailBuffer = await file.slice(file.size - sampleSize, file.size).arrayBuffer();

  const merged = new Uint8Array(headBuffer.byteLength + tailBuffer.byteLength);
  merged.set(new Uint8Array(headBuffer), 0);
  merged.set(new Uint8Array(tailBuffer), headBuffer.byteLength);

  return sha256(merged.buffer);
}

/**
 * 计算文件指纹: name|size|lastModified|sampleHash
 */
export async function calcFingerprint(file: File): Promise<string> {
  const sampleHash = await calcSampleHash(file);
  return [file.name, file.size, file.lastModified, sampleHash].join('|');
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取初始化参数
 */
async function getInitParams(file: File) {
  return {
    fileName: file.name,
    fileSize: file.size,
    lastModified: file.lastModified,
    fingerprint: await calcFingerprint(file),
    sampleHash: await calcSampleHash(file),
    chunkSize: CHUNK_SIZE,
    chunkTotal: Math.ceil(file.size / CHUNK_SIZE),
  };
}

/**
 * 更新文件状态
 */
type OnStatusChange = (
  uid: string,
  status: UploadStatus,
  percentage: number,
  errorMsg?: string,
  responseData?: any[],
) => void;

/**
 * 上传单个分片（递归）
 */
async function uploadChunk(
  chunkedfiles: {
    chunkedfile: Blob;
    chunk: number;
    chunks: number;
    fileName: string;
    guid: string;
  }[],
  chunkNo: number,
  uploadId: string,
  onStatusChange: OnStatusChange,
): Promise<any[]> {
  const current = chunkedfiles[chunkNo];
  onStatusChange(current.guid, '分片上传中', 0);

  const formData = new FormData();
  formData.append('uploadId', uploadId);
  formData.append('chunkNo', String(chunkNo));
  formData.append('chunkSize', String(CHUNK_SIZE));
  formData.append('file', current.chunkedfile, current.fileName);

  try {
    await createChunkFileTask(formData);

    // 更新进度
    const percentage = +((current.chunk / current.chunks) * 100).toFixed(0);
    onStatusChange(current.guid, '分片上传中', percentage);

    if (chunkNo === chunkedfiles.length - 1) {
      // 所有分片上传完成，合并
      return await mergeChunks(uploadId, current.guid, onStatusChange);
    } else {
      // 继续下一个分片
      return await uploadChunk(chunkedfiles, chunkNo + 1, uploadId, onStatusChange);
    }
  } catch (err: any) {
    const errorMsg = err?.message || err?.data?.msg || '上传分片失败';
    onStatusChange(current.guid, '失败', 0, errorMsg);
    console.error('上传分片失败', err);
    throw err;
  }
}

/**
 * 合并分片
 */
async function mergeChunks(
  uploadId: string,
  guid: string,
  onStatusChange: OnStatusChange,
): Promise<any[]> {
  onStatusChange(guid, '分片合并中', 95);

  try {
    const res = await mergeChunkFileTask({ uploadId });
    const responseData = Array.isArray(res?.data) ? res.data : res?.data ? [res.data] : [];

    // 合并成功，先不执行素材解析
    // await parseMaterial(res.data, guid, onStatusChange);
    onStatusChange(guid, '上传成功', 100, undefined, responseData);
    return responseData;
  } catch (err: any) {
    const errorMsg = err?.message || err?.data?.msg || '合并分片文件失败';
    onStatusChange(guid, '失败', 0, errorMsg);
    console.error('合并分片文件失败', err);
    throw err;
  }
}

/**
 * 素材解析
 */
// async function parseMaterial(
//   resData: any,
//   guid: string,
//   onStatusChange: OnStatusChange,
// ): Promise<void> {
//   onStatusChange(guid, '解析中', 98);
//
//   try {
//     const parseParams = {
//       fileList: [resData],
//       dealRepeat: 0,
//       level: 0,
//     };
//
//     await createFileBaseData(parseParams);
//     onStatusChange(guid, '上传成功', 100);
//   } catch (err: any) {
//     const errorMsg = err?.message || err?.data?.msg || '素材解析失败';
//     onStatusChange(guid, '失败', 0, errorMsg);
//     console.error('素材解析文件失败', err);
//   }
// }

/**
 * 分片上传主入口
 * @param file File 对象
 * @param onStatusChange 状态回调
 * @param uid 外部传入的唯一标识（用于状态更新）
 */
export async function chunkUpload(
  file: File,
  onStatusChange: OnStatusChange,
  uid?: string,
): Promise<any[]> {
  const guid = uid || `${file.name}-${file.size}-${file.lastModified}-${Date.now()}`;

  try {
    const initParams = await getInitParams(file);
    const res = await initChunkFileTask(initParams);

    // 秒传：服务端已存在该文件
    if (res.data?.status === 'SUCCESS') {
      const mergeRes = await mergeChunkFileTask({ uploadId: res.data.uploadId });
      const responseData = Array.isArray(mergeRes?.data)
        ? mergeRes.data
        : mergeRes?.data
          ? [mergeRes.data]
          : [];
      onStatusChange(guid, '上传成功', 100, undefined, responseData);
      return responseData;
    }

    // 初始化失败或无 uploadId
    if (!res.data?.uploadId) {
      const errorMsg = res.msg || '初始化失败，未获取到uploadId';
      onStatusChange(guid, '失败', 0, errorMsg);
      throw new Error(errorMsg);
    }

    onStatusChange(guid, '分片任务初始化', 5);

    // 构建分片列表（chunk 从 1 开始）
    const chunkedfiles: {
      chunkedfile: Blob;
      chunk: number;
      chunks: number;
      fileName: string;
      guid: string;
    }[] = [];
    for (let chunk = 1; chunk <= initParams.chunkTotal; chunk++) {
      const start = (chunk - 1) * initParams.chunkSize;
      const end = Math.min(file.size, start + initParams.chunkSize);
      const chunkedfile = file.slice(start, end);

      chunkedfiles.push({
        chunkedfile,
        chunk,
        chunks: initParams.chunkTotal,
        fileName: file.name,
        guid,
      });
    }

    // 开始上传分片
    return await uploadChunk(chunkedfiles, 0, res.data.uploadId, onStatusChange);
  } catch (err: any) {
    const errorMsg = err?.message || err?.data?.msg || '分片上传失败';
    onStatusChange(guid, '失败', 0, errorMsg);
    console.error('分片上传失败', err);
    throw err;
  }
}
