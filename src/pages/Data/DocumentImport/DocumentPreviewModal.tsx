import { useMemo } from 'react';
import { Button, Empty, Modal, Space, Typography } from 'antd';
import { DownloadOutlined, ExportOutlined, FileTextOutlined } from '@ant-design/icons';
import type { DocumentRecord } from './index';

const { Text } = Typography;

interface DocumentPreviewModalProps {
  visible: boolean;
  record: DocumentRecord | null;
  onClose: () => void;
}

const resolveFileUrl = (filePath: string) => {
  const trimmed = (filePath || '').trim();
  if (!trimmed) return '';
  const isFullUrl = /^(https?:)?\/\//i.test(trimmed) || /^(blob|data):/i.test(trimmed);
  return isFullUrl || trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const getFileExt = (fileName: string) => {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
  return match?.[1] || '';
};

const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']);
const textExts = new Set(['txt', 'md', 'json', 'log', 'csv']);
const iframeExts = new Set(['pdf', 'html', 'htm']);
const audioExts = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac']);
const videoExts = new Set(['mp4', 'webm', 'ogg', 'mov']);

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  visible,
  record,
  onClose,
}) => {
  const fileUrl = record ? resolveFileUrl(record.filePath) : '';
  const fileName = record?.name && record.name !== '-' ? record.name : record?.filePath || '预览';
  const ext = useMemo(() => getFileExt(fileName || fileUrl), [fileName, fileUrl]);

  const actionButtons = (
    <Space>
      <Button
        icon={<ExportOutlined />}
        onClick={() => {
          if (fileUrl) {
            window.open(fileUrl, '_blank', 'noopener,noreferrer');
          }
        }}
      >
        新窗口打开
      </Button>
      <Button
        icon={<DownloadOutlined />}
        onClick={() => {
          if (!fileUrl) return;
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = fileName && fileName !== '-' ? fileName : '';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      >
        下载文件
      </Button>
    </Space>
  );

  const renderPreview = () => {
    if (!fileUrl) {
      return <Empty description="暂无可预览文件" />;
    }

    if (imageExts.has(ext)) {
      return (
        <div style={{ height: '100%', overflow: 'auto', textAlign: 'center', background: '#fafafa' }}>
          <img
            src={fileUrl}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      );
    }

    if (audioExts.has(ext)) {
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
          }}
        >
          <audio controls style={{ width: '80%' }}>
            <source src={fileUrl} />
          </audio>
        </div>
      );
    }

    if (videoExts.has(ext)) {
      return (
        <div style={{ height: '100%', background: '#000', display: 'flex', alignItems: 'center' }}>
          <video controls style={{ width: '100%', maxHeight: '100%' }}>
            <source src={fileUrl} />
          </video>
        </div>
      );
    }

    if (iframeExts.has(ext) || textExts.has(ext)) {
      return (
        <iframe
          title={fileName}
          src={fileUrl}
          style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
        />
      );
    }

    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          padding: 24,
        }}
      >
        <Empty
          image={<FileTextOutlined style={{ fontSize: 56, color: '#bfbfbf' }} />}
          description={
            <Space direction="vertical" size={8}>
              <Text>当前格式暂不支持内嵌预览</Text>
              <Text type="secondary">
                支持直接内嵌预览的格式：pdf、html、txt、md、csv、图片、音频、视频
              </Text>
              <Text type="secondary">
                当前文件可通过“新窗口打开”或“下载文件”查看
              </Text>
            </Space>
          }
        >
          {actionButtons}
        </Empty>
      </div>
    );
  };

  return (
    <Modal
      title={`文档预览 - ${fileName}`}
      open={visible}
      onCancel={onClose}
      footer={actionButtons}
      width="90vw"
      style={{ top: 20 }}
      styles={{ body: { padding: 0, height: '85vh', overflow: 'hidden' } }}
      destroyOnClose
    >
      {visible ? renderPreview() : null}
    </Modal>
  );
};

export default DocumentPreviewModal;
