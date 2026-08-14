import dayjs from 'dayjs';

export type DateTimeValue =
  | string
  | number
  | Date
  | null
  | undefined
  | Array<number | undefined>;

function normalizeTimestamp(value: string | number) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;
  return String(Math.abs(raw)).length <= 10 ? raw * 1000 : raw;
}

// 统一时间展示格式，兼容秒/毫秒时间戳、时间字符串、Date 和后端数组时间。
export function formatDateTime(value: DateTimeValue, fallback = ''): string {
  if (value === null || value === undefined || value === '') return fallback;

  if (typeof value === 'string') {
    // 纯数字字符串按时间戳处理，兼容秒级和毫秒级。
    if (/^\d+$/.test(value)) {
      const timestamp = normalizeTimestamp(value);
      if (timestamp === null) return value;
      const parsed = dayjs(timestamp);
      return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value;
    }
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value;
  }

  if (typeof value === 'number') {
    // 数字入参默认视为时间戳，长度不足 13 位时按秒补齐到毫秒。
    const timestamp = normalizeTimestamp(value);
    if (timestamp === null) return String(value);
    const parsed = dayjs(timestamp);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : String(value);
  }

  if (value instanceof Date) {
    // 原生 Date 直接格式化。
    return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  }

  if (Array.isArray(value) && value.length >= 3) {
    // 兼容后端把 LocalDateTime 序列化成数组的场景：[y, m, d, h, mi, s].
    const [y, m, d, h = 0, mi = 0, s = 0] = value;
    const parsed = dayjs(new Date(y || 0, ((m || 1) as number) - 1, d || 1, h, mi, s));
    return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : String(value);
  }

  try {
    // 最后兜底交给 dayjs，尽量兼容可被解析的对象类型。
    const parsed = dayjs(value as any);
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD HH:mm:ss');
  } catch {
    // ignore parsing failures and fall back to string output
  }

  return String(value);
}
