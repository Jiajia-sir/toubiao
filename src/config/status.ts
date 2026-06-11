export const statusConfig = {
  completed: {
    color: "#52c41a",
    bgColor: "#f6ffed",
    text: "已完成",
  },
  running: {
    color: "#1890ff",
    bgColor: "#e6f7ff",
    text: "进行中",
  },
  pending: {
    color: "#faad14",
    bgColor: "#fffbe6",
    text: "待处理",
  },
  failed: {
    color: "#ff4d4f",
    bgColor: "#fff1f0",
    text: "失败",
  },
};

export type StatusType = keyof typeof statusConfig;
