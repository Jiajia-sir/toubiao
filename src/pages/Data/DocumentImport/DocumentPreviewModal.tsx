import { useMemo } from 'react';
import { Modal } from 'antd';
import { FileViewer } from '@open-file-viewer/react';
import {
  imagePlugin,
  videoPlugin,
  audioPlugin,
  textPlugin,
  pdfPlugin,
  officePlugin,
  archivePlugin,
  emailPlugin,
  fallbackPlugin,
} from '@open-file-viewer/core';
import '@open-file-viewer/core/style.css';
// pdf.js worker 已复制到 public 目录作为静态资源，规避 webpack 对 ?url / worker 的打包问题
import type { DocumentRecord } from './index';

interface DocumentPreviewModalProps {
  visible: boolean;
  record: DocumentRecord | null;
  onClose: () => void;
}

/** 把后端返回的 filePath 规范成浏览器可访问的完整 URL */
const resolveFileUrl = (filePath: string) => {
  const trimmed = (filePath || '').trim();
  if (!trimmed) return '';
  const isFullUrl = /^(https?:)?\/\//i.test(trimmed) || /^(blob|data):/i.test(trimmed);
  return isFullUrl || trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  visible,
  record,
  onClose,
}) => {
  const plugins = useMemo(
    () => [
      imagePlugin(),
      videoPlugin(),
      audioPlugin(),
      textPlugin(),
      // umi/max 环境下开启 useFetchData 避免 pdf.js worker 流式读取通道不兼容
      pdfPlugin({ workerSrc: '/pdf.worker.min.mjs', useFetchData: true }),
      officePlugin(),
      archivePlugin(),
      emailPlugin(),
      fallbackPlugin(),
    ],
    [],
  );

  const fileUrl = record ? resolveFileUrl(record.filePath) : '';
  const fileName = record?.name && record.name !== '-' ? record.name : record?.filePath || '预览';

  return (
    <Modal
      title={`文档预览 - ${fileName}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ top: 20 }}
      styles={{ body: { padding: 0, height: '85vh', overflow: 'hidden' } }}
      destroyOnClose
    >
      {visible && fileUrl ? (
        <FileViewer
          file={fileUrl}
          fileName={fileName}
          width="100%"
          height="100%"
          fit="contain"
          toolbar
          theme="light"
          plugins={plugins}
        />
      ) : null}
    </Modal>
  );
};

export default DocumentPreviewModal;
