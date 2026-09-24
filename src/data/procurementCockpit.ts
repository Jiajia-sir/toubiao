export const PROCUREMENT_UNITS = [
  '市教育局',
  '市卫健委',
  '市交通局',
  '市水务局',
  '市公安局',
  '市文旅局',
  '市城管局',
  '市财政局',
];

export const PROCUREMENT_METHODS = [
  '公开招标',
  '邀请招标',
  '竞争性谈判',
  '竞争性磋商',
  '询价',
  '单一来源',
];

export const PROCUREMENT_TYPES = ['货物', '工程', '服务'];
export const PROCUREMENT_STATUSES = ['已完成', '进行中', '已超期', '已终止'];
export const PROCUREMENT_STAGES = [
  '需求申报',
  '采购计划',
  '招标公告',
  '开标评标',
  '定标公示',
  '合同签订',
  '履约验收',
];

export const PROCUREMENT_SUPPLIERS = [
  '华信科技有限公司',
  '中联建设集团',
  '博远信息技术',
  '恒达医疗器械',
  '东方数码',
  '瑞丰工程咨询',
  '天成物业服务',
  '蓝海软件',
  '金盾安防',
  '绿源环保',
  '鼎新教育装备',
  '长河交通设施',
];

export type ProcurementProject = {
  id: string;
  name: string;
  unit: string;
  method: string;
  type: string;
  status: string;
  stage: string;
  stageIndex: number;
  budget: number;
  amount: number;
  supplier: string;
  bidders: string[];
  start: string;
  plannedDays: number;
  actualDays: number;
  stageDays: number[];
};

function createRandom(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

const METHOD_DAYS: Record<string, number> = {
  公开招标: 60,
  邀请招标: 45,
  竞争性谈判: 30,
  竞争性磋商: 35,
  询价: 20,
  单一来源: 25,
};

const PROJECT_UNIT_NAMES: Record<string, string> = {
  市教育局: '教育条线',
  市卫健委: '卫生健康条线',
  市交通局: '交通运输条线',
  市水务局: '水务运行条线',
  市公安局: '公共安全条线',
  市文旅局: '文体旅条线',
  市城管局: '城市治理条线',
  市财政局: '财务保障条线',
};

/**
 * 面向采购运行态势页面的可替换演示数据生成器。
 * 后续接入真实采购接口时，只需要替换页面中的 ALL_PROJECTS 数据源即可。
 */
export function generateProcurementProjects(): ProcurementProject[] {
  const random = createRandom(20260924);
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)]!;
  const list: ProcurementProject[] = [];

  for (let index = 0; index < 360; index += 1) {
    const unit = pick(PROCUREMENT_UNITS);
    const method = random() < 0.35 ? '公开招标' : pick(PROCUREMENT_METHODS);
    const type = pick(PROCUREMENT_TYPES);
    const startDate = new Date(2024, 0, 1 + Math.floor(random() * 995));
    const budget =
      Math.round(
        (type === '工程' ? 200 : 20) + random() * random() * (type === '工程' ? 3000 : 800),
      ) * 10000;
    const plannedDays = METHOD_DAYS[method]! + Math.floor(random() * 15);
    const ageDays = Math.floor((new Date(2026, 8, 24).getTime() - startDate.getTime()) / 86400000);
    const roll = random();
    let status: string;
    let stageIndex: number;

    if (roll < 0.04) {
      status = '已终止';
      stageIndex = Math.floor(random() * 4);
    } else if (ageDays > plannedDays + 30 && roll < 0.75) {
      status = '已完成';
      stageIndex = 6;
    } else {
      stageIndex = Math.floor(random() * 6);
      status = ageDays > plannedDays ? '已超期' : '进行中';
    }

    const actualDays =
      status === '已完成'
        ? Math.round(plannedDays * (0.75 + random() * 0.55))
        : Math.min(ageDays, plannedDays * 2);
    const stageDays = PROCUREMENT_STAGES.map((_, stageIndexItem) =>
      stageIndexItem <= stageIndex
        ? Math.round(2 + random() * (stageIndexItem === 3 ? 15 : stageIndexItem === 6 ? 20 : 8))
        : 0,
    );
    const preferredSupplier =
      unit === '市卫健委' && random() < 0.5
        ? '恒达医疗器械'
        : unit === '市教育局' && random() < 0.4
          ? '鼎新教育装备'
          : pick(PROCUREMENT_SUPPLIERS);
    const bidders =
      method === '单一来源'
        ? [preferredSupplier]
        : Array.from(
            new Set([
              preferredSupplier,
              pick(PROCUREMENT_SUPPLIERS),
              pick(PROCUREMENT_SUPPLIERS),
              pick(PROCUREMENT_SUPPLIERS),
            ]),
          );
    const amount =
      status === '已完成' || stageIndex >= 4 ? Math.round(budget * (0.82 + random() * 0.16)) : 0;

    list.push({
      id: `CG${startDate.getFullYear()}${String(index + 1).padStart(4, '0')}`,
      name: `${PROJECT_UNIT_NAMES[unit] ?? unit.replace('市', '')}${pick([
        '数字化改造',
        '资产配置',
        '运维提升',
        '后勤保障',
        '综合物资',
        '安全能力建设',
        '专业咨询',
        '运营耗材',
      ])}项目`,
      unit,
      method,
      type,
      status,
      stage: PROCUREMENT_STAGES[stageIndex]!,
      stageIndex,
      budget,
      amount,
      supplier: amount ? preferredSupplier : '',
      bidders,
      start: startDate.toISOString().slice(0, 10),
      plannedDays,
      actualDays,
      stageDays,
    });
  }

  return list;
}

export const formatWan = (value: number) =>
  (value / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 1 });
