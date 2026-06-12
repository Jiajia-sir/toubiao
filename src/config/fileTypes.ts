export const fileTypeConfig = {
  PDF: {
    color: "#ff4d4f",
    bgColor: "#fff1f0",
  },
  Excel: {
    color: "#52c41a",
    bgColor: "#f6ffed",
  },
  Markdown: {
    color: "#1890ff",
    bgColor: "#e6f7ff",
  },
  Figma: {
    color: "#722ed1",
    bgColor: "#f9f0ff",
  },
  DOCX: {
    color: "#1890ff",
    bgColor: "#e6f7ff",
  },
  XLSX: {
    color: "#52c41a",
    bgColor: "#f6ffed",
  },
  PPTX: {
    color: "#fa8c16",
    bgColor: "#fff7e6",
  },
  HTML: {
    color: "#eb2f96",
    bgColor: "#fce4ec",
  },
  EML: {
    color: "#1890ff",
    bgColor: "#e6f7ff",
  },
  TXT: {
    color: "#8c8c8c",
    bgColor: "#f5f5f5",
  },
  default: {
    color: "#8c8c8c",
    bgColor: "#f5f5f5",
  },
};

export type FileType = keyof typeof fileTypeConfig;
