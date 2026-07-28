import { Modal } from 'antd';
import DocumentFilePreview from '@/components/DocumentFilePreview';
import type { DocumentRecord } from './index';

interface DocumentPreviewModalProps {
  visible: boolean;
  record: DocumentRecord | null;
  onClose: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  visible,
  record,
  onClose,
}) => {
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
      {visible ? <DocumentFilePreview filePath={record?.filePath} fileName={fileName} /> : null}
    </Modal>
  );
};

export default DocumentPreviewModal;
