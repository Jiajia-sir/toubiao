import { useEffect, useMemo, useRef } from 'react';
import { Empty } from 'antd';
import { FileViewer } from '@open-file-viewer/react';
import {
  archivePlugin,
  audioPlugin,
  emailPlugin,
  fallbackPlugin,
  imagePlugin,
  officePlugin,
  pdfPlugin,
  textPlugin,
  videoPlugin,
} from '@open-file-viewer/core';
import '@open-file-viewer/core/style.css';

export interface DocumentFilePreviewProps {
  filePath?: string | null;
  fileName?: string | null;
  searchKeyword?: string | null;
  height?: string | number;
}

export const resolvePreviewFileUrl = (filePath: string) => {
  const trimmed = (filePath || '').trim();
  if (!trimmed) return '';
  const isFullUrl = /^(https?:)?\/\//i.test(trimmed) || /^(blob|data):/i.test(trimmed);
  return isFullUrl || trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const extractPreviewFileName = (filePath: string) => {
  const trimmed = (filePath || '').trim();
  if (!trimmed) return '';
  const normalized = trimmed.split(/[?#]/)[0].replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
};

const applySearchKeyword = (scope: ParentNode, keyword: string) => {
  const searchInput = scope.querySelector<HTMLInputElement>('.ofv-toolbar-search input[type="search"]');
  if (!searchInput) {
    return false;
  }

  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(searchInput, keyword);
  } else {
    searchInput.value = keyword;
  }

  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
};

const DocumentFilePreview: React.FC<DocumentFilePreviewProps> = ({
  filePath,
  fileName,
  searchKeyword,
  height = '100%',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plugins = useMemo(
    () => [
      imagePlugin(),
      videoPlugin(),
      audioPlugin(),
      textPlugin(),
      pdfPlugin({ workerSrc: '/pdf.worker.min.mjs', useFetchData: true }),
      officePlugin(),
      archivePlugin(),
      emailPlugin(),
      fallbackPlugin(),
    ],
    [],
  );

  const fileUrl = resolvePreviewFileUrl(String(filePath || ''));
  const resolvedFileName = fileName?.trim() || extractPreviewFileName(String(filePath || '')) || '预览';
  const normalizedSearchKeyword = String(searchKeyword || '').trim();

  useEffect(() => {
    if (!normalizedSearchKeyword || !containerRef.current) {
      return;
    }

    let cancelled = false;
    let attempt = 0;
    let timer: number | null = null;

    const tryApply = () => {
      if (cancelled || !containerRef.current) {
        return;
      }

      attempt += 1;
      const applied = applySearchKeyword(containerRef.current, normalizedSearchKeyword);

      if (applied) {
        // Run one follow-up pass after the document body finishes mounting.
        if (attempt < 3) {
          timer = window.setTimeout(tryApply, 400);
        }
        return;
      }

      if (attempt < 20) {
        timer = window.setTimeout(tryApply, 250);
      }
    };

    tryApply();

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [fileUrl, resolvedFileName, normalizedSearchKeyword]);

  if (!fileUrl) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fbfcff',
        }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="原文件路径不存在，无法预览" />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height, background: '#fff' }}>
      <FileViewer
        key={`${fileUrl}::${resolvedFileName}`}
        file={fileUrl}
        fileName={resolvedFileName}
        width="100%"
        height="100%"
        fit="contain"
        toolbar
        theme="light"
        plugins={plugins}
      />
    </div>
  );
};

export default DocumentFilePreview;
