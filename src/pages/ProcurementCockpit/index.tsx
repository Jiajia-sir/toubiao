import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  BellOutlined,
  DownloadOutlined,
  ExpandOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FullscreenExitOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Empty, Progress, Select, Space, Tag, message, notification } from 'antd';
import {
  PROCUREMENT_METHODS,
  PROCUREMENT_STAGES,
  PROCUREMENT_STATUSES,
  PROCUREMENT_TYPES,
  PROCUREMENT_UNITS,
  formatWan,
  generateProcurementProjects,
  type ProcurementProject,
} from '@/data/procurementCockpit';
import './index.less';

const COLORS = ['#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#60a5fa'];
const ALL_PROJECTS = generateProcurementProjects();
const RECIPIENTS: Record<string, string> = {
  超期: '采购经办人、部门负责人',
  集中: '纪检监察室、采购中心主任',
  单一来源: '财政局采购监管处',
  围标: '纪检监察室',
};

const UNIT_LABELS: Record<string, string> = {
  市教育局: '教育条线',
  市卫健委: '卫生健康条线',
  市交通局: '交通运输条线',
  市水务局: '水务运行条线',
  市公安局: '公共安全条线',
  市文旅局: '文体旅条线',
  市城管局: '城市治理条线',
  市财政局: '财务保障条线',
};

const METHOD_LABELS: Record<string, string> = {
  公开招标: '公开竞采',
  邀请招标: '定向邀请',
  竞争性谈判: '协商采购',
  竞争性磋商: '综合磋商',
  询价: '比价采购',
  单一来源: '单一渠道',
};

const TYPE_LABELS: Record<string, string> = {
  货物: '货品类',
  工程: '建设类',
  服务: '服务类',
};

const STATUS_LABELS: Record<string, string> = {
  已完成: '已结项',
  进行中: '执行中',
  已超期: '进度滞后',
  已终止: '已关闭',
};

const STAGE_LABELS: Record<string, string> = {
  需求申报: '需求提出',
  采购计划: '计划编排',
  招标公告: '公告发布',
  开标评标: '评审定标',
  定标公示: '结果公示',
  合同签订: '协议签署',
  履约验收: '履约验收',
};

const ALERT_LEVEL_LABELS: Record<string, string> = { 高: '重点', 中: '关注' };
const ALERT_KIND_LABELS: Record<string, string> = {
  超期: '进度滞后',
  集中: '成交集中',
  单一来源: '渠道单一',
  围标: '共同投标',
};
const TIME_GROUP_LABELS = { 月度: '按月', 季度: '按季', 年度: '按年' } as const;

function unitLabel(value: string) {
  return UNIT_LABELS[value] ?? value.replace('市', '');
}

function methodLabel(value: string) {
  return METHOD_LABELS[value] ?? value;
}

function typeLabel(value: string) {
  return TYPE_LABELS[value] ?? value;
}

function statusLabel(value: string) {
  return STATUS_LABELS[value] ?? value;
}

function stageLabel(value: string) {
  return STAGE_LABELS[value] ?? value;
}

function alertLevelLabel(value: string) {
  return ALERT_LEVEL_LABELS[value] ?? value;
}

function alertKindLabel(value: string) {
  return ALERT_KIND_LABELS[value] ?? value;
}

type Filters = {
  from: string;
  to: string;
  unit: string;
  method: string;
  status: string;
};

type AlertItem = {
  id: string;
  level: '高' | '中';
  kind: string;
  title: string;
  detail: string;
};

const SECTION_LIST = [
  { key: 'unit', label: '部门概览' },
  { key: 'time', label: '时间走势' },
  { key: 'process', label: '流程效能' },
  { key: 'method', label: '交易渠道' },
  { key: 'amount', label: '资金分析' },
  { key: 'supplier', label: '主体画像' },
] as const;

type SectionKey = (typeof SECTION_LIST)[number]['key'];

const INITIAL_FILTERS: Filters = {
  from: '2024-01-01',
  to: '2026-12-31',
  unit: '',
  method: '',
  status: '',
};

const chartText = '#cbd5e1';
const mutedText = '#94a3b8';
const gridLine = 'rgba(34, 211, 238, 0.14)';

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const result = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item);
    result.set(key, (result.get(key) ?? 0) + 1);
  });
  return result;
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function useAnalytics(data: ProcurementProject[]) {
  return useMemo(() => {
    const completed = data.filter((project) => project.status === '已完成');
    const awarded = data.filter((project) => project.amount > 0);
    const budget = data.reduce((total, project) => total + project.budget, 0);
    const awardedBudget = awarded.reduce((total, project) => total + project.budget, 0);
    const amount = awarded.reduce((total, project) => total + project.amount, 0);

    const units = PROCUREMENT_UNITS.map((unit) => {
      const projects = data.filter((project) => project.unit === unit);
      const result: Record<string, number | string> = {
        unit: unitLabel(unit),
        项目数: projects.length,
        金额: +(projects.reduce((total, project) => total + project.budget, 0) / 10000).toFixed(0),
      };
      PROCUREMENT_STATUSES.forEach((status) => {
        result[status] = projects.filter((project) => project.status === status).length;
      });
      PROCUREMENT_TYPES.forEach((type) => {
        result[type] = projects.filter((project) => project.type === type).length;
      });
      return result;
    });

    const byMonth = new Map<string, { count: number; budget: number }>();
    data.forEach((project) => {
      const month = project.start.slice(0, 7);
      const current = byMonth.get(month) ?? { count: 0, budget: 0 };
      byMonth.set(month, {
        count: current.count + 1,
        budget: current.budget + project.budget,
      });
    });
    const monthly = [...byMonth.entries()].sort().map(([key, value]) => ({
      k: key,
      项目数: value.count,
      金额: +(value.budget / 10000).toFixed(0),
    }));

    const groupBy = (getGroup: (key: string) => string) => {
      const groups = new Map<string, { 项目数: number; 金额: number }>();
      monthly.forEach((item) => {
        const group = getGroup(item.k);
        const current = groups.get(group) ?? { 项目数: 0, 金额: 0 };
        groups.set(group, {
          项目数: current.项目数 + item.项目数,
          金额: current.金额 + item.金额,
        });
      });
      return [...groups.entries()].map(([key, value]) => ({ k: key, ...value }));
    };

    const quarterly = groupBy((key) => `${key.slice(0, 4)}Q${Math.ceil(Number(key.slice(5)) / 3)}`);
    const yearly = groupBy((key) => key.slice(0, 4));
    const stageAvg = PROCUREMENT_STAGES.map((stage, index) => ({
      stage,
      label: stageLabel(stage),
      平均耗时: +average(
        data
          .filter((project) => project.stageDays[index]! > 0)
          .map((project) => project.stageDays[index]!),
      ).toFixed(1),
    }));
    const overdue = data
      .filter((project) => project.status === '已超期')
      .sort(
        (left, right) =>
          right.actualDays - right.plannedDays - (left.actualDays - left.plannedDays),
      );
    const ongoing = data.filter(
      (project) => project.status === '进行中' || project.status === '已超期',
    );
    const stageDist = PROCUREMENT_STAGES.map((stage) => ({
      stage,
      label: stageLabel(stage),
      在途: ongoing.filter((project) => project.stage === stage && project.status === '进行中')
        .length,
      超期: ongoing.filter((project) => project.stage === stage && project.status === '已超期')
        .length,
    }));
    const bottleneck = [...stageAvg].sort((left, right) => right.平均耗时 - left.平均耗时)[0];
    const funnel = PROCUREMENT_STAGES.map((stage, index) => ({
      name: stageLabel(stage),
      value: data.filter((project) => project.stageIndex >= index && project.status !== '已终止')
        .length,
    }));

    const methods = PROCUREMENT_METHODS.map((method) => {
      const projects = data.filter((project) => project.method === method);
      const completedProjects = projects.filter((project) => project.status === '已完成');
      return {
        method,
        label: methodLabel(method),
        项目数: projects.length,
        平均周期: +average(completedProjects.map((project) => project.actualDays)).toFixed(1),
        计划周期: +average(projects.map((project) => project.plannedDays)).toFixed(1),
      };
    });

    const amountRanges = [
      [0, 50],
      [50, 100],
      [100, 200],
      [200, 500],
      [500, 1000],
      [1000, Infinity],
    ] as const;
    const amountDist = amountRanges.map(([start, end]) => ({
      range: end === Infinity ? `${start}万以上` : `${start}至${end}万`,
      项目数: data.filter(
        (project) => project.budget / 10000 >= start && project.budget / 10000 < end,
      ).length,
    }));
    const execByUnit = PROCUREMENT_UNITS.map((unit) => {
      const projects = awarded.filter((project) => project.unit === unit);
      const unitBudget = projects.reduce((total, project) => total + project.budget, 0);
      const unitAmount = projects.reduce((total, project) => total + project.amount, 0);
      return {
        unit: unitLabel(unit),
        执行率: unitBudget ? +((unitAmount / unitBudget) * 100).toFixed(1) : 0,
        节资率: unitBudget ? +((1 - unitAmount / unitBudget) * 100).toFixed(1) : 0,
      };
    });

    const winCount = countBy(awarded, (project) => project.supplier);
    const participationCount = countBy(
      data.flatMap((project) => project.bidders.map((bidder) => ({ bidder }))),
      (item) => item.bidder,
    );
    const suppliers = [...participationCount.entries()]
      .map(([supplier, participation]) => ({
        supplier,
        参与次数: participation,
        中标次数: winCount.get(supplier) ?? 0,
        中标金额: +(
          awarded
            .filter((project) => project.supplier === supplier)
            .reduce((total, project) => total + project.amount, 0) / 10000
        ).toFixed(0),
      }))
      .sort((left, right) => right.中标次数 - left.中标次数);

    const alerts: AlertItem[] = [];
    overdue.slice(0, 6).forEach((project) => {
      alerts.push({
        id: `od-${project.id}`,
        level: project.actualDays - project.plannedDays > 30 ? '高' : '中',
        kind: '超期',
        title: `${project.name} 进度滞后 ${project.actualDays - project.plannedDays} 天`,
        detail: `${project.id} · ${unitLabel(project.unit)} · 所处环节：${stageLabel(project.stage)}`,
      });
    });

    const supplierPairs = countBy(awarded, (project) => `${project.unit}|${project.supplier}`);
    [...supplierPairs.entries()]
      .filter(([, count]) => count >= 4)
      .sort((left, right) => right[1] - left[1])
      .forEach(([key, count]) => {
        const [unit, supplier] = key.split('|');
        alerts.push({
          id: `cc-${key}`,
          level: count >= 8 ? '高' : '中',
          kind: '集中',
          title: `${supplier} 在${unitLabel(unit)}已落地 ${count} 笔`,
          detail: '同一主体多次承接，建议关注关联关系',
        });
      });

    PROCUREMENT_UNITS.forEach((unit) => {
      const projects = data.filter((project) => project.unit === unit);
      const singleSourceRatio =
        projects.filter((project) => project.method === '单一来源').length / (projects.length || 1);
      if (singleSourceRatio > 0.18) {
        alerts.push({
          id: `ss-${unit}`,
          level: '中',
          kind: '单一来源',
          title: `${unitLabel(unit)} 单一渠道占比 ${percent(singleSourceRatio)}`,
          detail: '超过 18% 关注阈值',
        });
      }
    });

    const coBids = countBy(
      data
        .filter((project) => project.bidders.length >= 3)
        .map((project) => [...project.bidders].sort().slice(0, 2).join(' & ')),
      (item) => item,
    );
    [...coBids.entries()]
      .filter(([, count]) => count >= 6)
      .slice(0, 3)
      .forEach(([key, count]) => {
        alerts.push({
          id: `wb-${key}`,
          level: '中',
          kind: '围标',
          title: `${key} 共同参与 ${count} 次`,
          detail: '多个主体重复同场参与，建议核查关联投标',
        });
      });

    return {
      kpi: {
        total: data.length,
        budget,
        amount,
        done: completed.length,
        ongoing: ongoing.length,
        overdue: overdue.length,
        completion: data.length ? completed.length / data.length : 0,
        exec: awardedBudget ? amount / awardedBudget : 0,
        saving: awardedBudget ? 1 - amount / awardedBudget : 0,
        conversion: data.length ? awarded.length / data.length : 0,
        avgCycle: average(completed.map((project) => project.actualDays)),
      },
      units,
      monthly,
      quarterly,
      yearly,
      stageAvg,
      overdue,
      stageDist,
      bottleneck,
      funnel,
      methods,
      amountDist,
      execByUnit,
      suppliers,
      typeShare: PROCUREMENT_TYPES.map((type) => ({
        name: typeLabel(type),
        value: data.filter((project) => project.type === type).length,
      })),
      statusShare: PROCUREMENT_STATUSES.map((status) => ({
        name: statusLabel(status),
        value: data.filter((project) => project.status === status).length,
      })),
      alerts,
    };
  }, [data]);
}

type Analytics = ReturnType<typeof useAnalytics>;
type ChartOption = Record<string, any>;

function baseChart(option: ChartOption): ChartOption {
  return {
    animationDuration: 500,
    color: COLORS,
    textStyle: { color: chartText, fontFamily: 'Arial, Microsoft YaHei, sans-serif' },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#122338',
      borderColor: 'rgba(34,211,238,.35)',
      textStyle: { color: '#e2e8f0' },
    },
    grid: { left: 44, right: 24, top: 28, bottom: 36, containLabel: true },
    ...option,
  };
}

function axisOptions(data: string[], extra: ChartOption = {}) {
  return {
    type: 'category',
    data,
    axisLine: { lineStyle: { color: '#334155' } },
    axisTick: { show: false },
    axisLabel: { color: mutedText, fontSize: 11, interval: 0 },
    ...extra,
  };
}

function valueAxis(extra: ChartOption = {}) {
  return {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: mutedText, fontSize: 11 },
    splitLine: { lineStyle: { color: gridLine, type: 'dashed' } },
    ...extra,
  };
}

function pieOption(
  data: Array<{ name: string; value: number }>,
  verticalLegend = false,
): ChartOption {
  return baseChart({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: verticalLegend
      ? {
          type: 'scroll',
          orient: 'vertical',
          right: 0,
          top: 'center',
          textStyle: { color: mutedText, fontSize: 11 },
        }
      : {
          type: 'scroll',
          bottom: 0,
          left: 0,
          right: 0,
          textStyle: { color: mutedText, fontSize: 11 },
        },
    series: [
      {
        type: 'pie',
        radius: verticalLegend ? ['42%', '68%'] : ['48%', '72%'],
        center: verticalLegend ? ['36%', '50%'] : ['50%', '43%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#102034', borderWidth: 2 },
        label: { color: chartText, fontSize: 11, formatter: '{d}%' },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: { color: COLORS[index % COLORS.length] },
        })),
      },
    ],
  });
}

function Chart({ option, height = 260 }: { option: ChartOption; height?: number }) {
  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      opts={{ renderer: 'canvas' }}
      style={{ height, width: '100%' }}
    />
  );
}

function Panel({
  title,
  children,
  className = '',
  extra,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className={`cockpit-panel ${className}`}>
      <span className="cockpit-corner cockpit-corner-top-left" />
      <span className="cockpit-corner cockpit-corner-bottom-right" />
      <div className="cockpit-panel-title">
        <h3>
          <span className="cockpit-title-mark" />
          {title}
        </h3>
        {extra}
      </div>
      {children}
    </div>
  );
}

function Kpis({ analytics }: { analytics: Analytics }) {
  const { kpi } = analytics;
  const items: Array<{ label: string; value: string | number; unit: string; warning?: boolean }> = [
    { label: '事项规模', value: kpi.total, unit: '笔' },
    { label: '计划金额', value: formatWan(kpi.budget), unit: '万元' },
    { label: '已落地金额', value: formatWan(kpi.amount), unit: '万元' },
    { label: '执行中事项', value: kpi.ongoing, unit: '笔' },
    { label: '进度滞后', value: kpi.overdue, unit: '笔', warning: true },
    { label: '结项比例', value: percent(kpi.completion), unit: '' },
    { label: '资金优化率', value: percent(kpi.saving), unit: '' },
    { label: '平均办理', value: kpi.avgCycle.toFixed(1), unit: '天' },
  ];

  return (
    <div className="cockpit-kpis">
      {items.map((item) => (
        <div key={item.label} className="cockpit-kpi">
          <div className="cockpit-kpi-label">{item.label}</div>
          <div className={`cockpit-kpi-value ${item.warning ? 'is-warning' : ''}`}>
            {item.value}
            <span>{item.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function UnitSection({ analytics, height }: { analytics: Analytics; height: number }) {
  const labels = analytics.units.map((item) => String(item.unit));
  return (
    <div className="cockpit-grid cockpit-grid-3">
      <Panel title="各责任条线事项量与计划金额（万元）" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(labels),
            yAxis: [
              valueAxis({ name: '事项笔数' }),
              valueAxis({ name: '计划金额', splitLine: { show: false } }),
            ],
            series: [
              {
                name: '事项笔数',
                type: 'bar',
                barMaxWidth: 28,
                data: analytics.units.map((item) => Number(item.项目数)),
                itemStyle: { color: COLORS[0], borderRadius: [4, 4, 0, 0] },
              },
              {
                name: '计划金额（万元）',
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                data: analytics.units.map((item) => Number(item.金额)),
                lineStyle: { width: 2, color: COLORS[2] },
                itemStyle: { color: COLORS[2] },
              },
            ],
          })}
        />
      </Panel>
      <Panel title="业务类别构成">
        <Chart height={height} option={pieOption(analytics.typeShare)} />
      </Panel>
      <Panel title="各责任条线执行状态" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(labels),
            yAxis: valueAxis(),
            series: PROCUREMENT_STATUSES.map((status, index) => ({
              name: statusLabel(status),
              type: 'bar',
              stack: 'status',
              barMaxWidth: 28,
              data: analytics.units.map((item) => Number(item[status])),
              itemStyle: { color: [COLORS[1], COLORS[0], COLORS[4], COLORS[5]][index] },
            })),
          })}
        />
      </Panel>
      <Panel title="当前执行状态分布">
        <Chart height={height} option={pieOption(analytics.statusShare)} />
      </Panel>
    </div>
  );
}

function TimeSection({ analytics, height }: { analytics: Analytics; height: number }) {
  const [group, setGroup] = useState<'月度' | '季度' | '年度'>('月度');
  const trend =
    group === '月度'
      ? analytics.monthly
      : group === '季度'
        ? analytics.quarterly
        : analytics.yearly;
  return (
    <div className="cockpit-grid cockpit-grid-3">
      <Panel
        title={`${TIME_GROUP_LABELS[group]}走势`}
        className="cockpit-span-3"
        extra={
          <Space size={4}>
            {(['月度', '季度', '年度'] as const).map((item) => (
              <Button
                key={item}
                size="small"
                type={group === item ? 'primary' : 'text'}
                onClick={() => setGroup(item)}
              >
                {TIME_GROUP_LABELS[item]}
              </Button>
            ))}
          </Space>
        }
      >
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(trend.map((item) => item.k)),
            yAxis: [
              valueAxis({ name: '事项笔数' }),
              valueAxis({ name: '计划金额', splitLine: { show: false } }),
            ],
            series: [
              {
                name: '事项笔数',
                type: 'line',
                smooth: true,
                data: trend.map((item) => item.项目数),
                areaStyle: { color: 'rgba(34,211,238,.16)' },
                lineStyle: { width: 2, color: COLORS[0] },
                itemStyle: { color: COLORS[0] },
              },
              {
                name: '计划金额（万元）',
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                data: trend.map((item) => item.金额),
                lineStyle: { width: 2, color: COLORS[2] },
                itemStyle: { color: COLORS[2] },
              },
            ],
          })}
        />
      </Panel>
      <Panel title="各环节平均办理时长（天）" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            xAxis: axisOptions(analytics.stageAvg.map((item) => item.label)),
            yAxis: valueAxis(),
            series: [
              {
                name: '平均办理时长',
                type: 'bar',
                barMaxWidth: 34,
                data: analytics.stageAvg.map((item) => ({
                  value: item.平均耗时,
                  itemStyle: {
                    color: item.stage === analytics.bottleneck?.stage ? COLORS[4] : COLORS[1],
                  },
                })),
                label: { show: true, position: 'top', color: chartText, fontSize: 11 },
              },
            ],
          })}
        />
      </Panel>
      <Panel title={`进度滞后事项（${analytics.overdue.length}）`}>
        <div className="cockpit-overdue-list" style={{ height }}>
          {analytics.overdue.slice(0, 20).map((project) => (
            <div key={project.id} className="cockpit-overdue-item">
              <div>
                <strong>{project.name}</strong>
                <span>超出计划 {project.actualDays - project.plannedDays} 天</span>
              </div>
              <p>
                {unitLabel(project.unit)} · {stageLabel(project.stage)} · 计划 {project.plannedDays}{' '}
                天
              </p>
            </div>
          ))}
          {!analytics.overdue.length && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无进度滞后事项" />
          )}
        </div>
      </Panel>
    </div>
  );
}

function ProcessSection({ analytics, height }: { analytics: Analytics; height: number }) {
  return (
    <div className="cockpit-grid cockpit-grid-3">
      <Panel title="执行中事项环节分布" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(analytics.stageDist.map((item) => item.label)),
            yAxis: valueAxis(),
            series: [
              {
                name: '执行中',
                type: 'bar',
                stack: 'process',
                data: analytics.stageDist.map((item) => item.在途),
                itemStyle: { color: COLORS[0] },
              },
              {
                name: '滞后',
                type: 'bar',
                stack: 'process',
                data: analytics.stageDist.map((item) => item.超期),
                itemStyle: { color: COLORS[4], borderRadius: [4, 4, 0, 0] },
              },
            ],
          })}
        />
      </Panel>
      <Panel title="流程推进漏斗">
        <Chart
          height={height}
          option={baseChart({
            tooltip: { trigger: 'item', formatter: '{b}: {c}' },
            series: [
              {
                type: 'funnel',
                left: '8%',
                top: 16,
                bottom: 16,
                width: '84%',
                min: 0,
                max: Math.max(...analytics.funnel.map((item) => item.value), 1),
                minSize: '20%',
                maxSize: '100%',
                sort: 'descending',
                gap: 2,
                label: { color: chartText, fontSize: 11, position: 'inside' },
                data: analytics.funnel.map((item, index) => ({
                  ...item,
                  itemStyle: { color: COLORS[index % COLORS.length] },
                })),
              },
            ],
          })}
        />
      </Panel>
      <Panel title="环节耗时画像" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            radar: {
              center: ['50%', '52%'],
              radius: '68%',
              indicator: analytics.stageAvg.map((item) => ({ name: item.label, max: 20 })),
              axisName: { color: mutedText, fontSize: 11 },
              splitLine: { lineStyle: { color: gridLine } },
              splitArea: { areaStyle: { color: ['rgba(34,211,238,.03)', 'rgba(34,211,238,.07)'] } },
              axisLine: { lineStyle: { color: gridLine } },
            },
            series: [
              {
                type: 'radar',
                data: [
                  {
                    value: analytics.stageAvg.map((item) => item.平均耗时),
                    name: '环节平均时长',
                  },
                ],
                lineStyle: { color: COLORS[3], width: 2 },
                itemStyle: { color: COLORS[3] },
                areaStyle: { color: 'rgba(167,139,250,.3)' },
              },
            ],
          })}
        />
      </Panel>
      <Panel title="结项与落地表现">
        <div className="cockpit-progress-list" style={{ minHeight: height }}>
          {[
            ['结项比例', analytics.kpi.completion, COLORS[1]],
            ['落地转化率', analytics.kpi.conversion, COLORS[0]],
            ['进度滞后率', analytics.kpi.overdue / (analytics.kpi.total || 1), COLORS[4]],
          ].map(([label, value, color]) => (
            <div key={String(label)}>
              <div className="cockpit-progress-title">
                <span>{String(label)}</span>
                <strong>{percent(Number(value))}</strong>
              </div>
              <Progress
                percent={Number(value) * 100}
                showInfo={false}
                strokeColor={String(color)}
                trailColor="#20334a"
              />
            </div>
          ))}
          <p>
            重点耗时环节：<span>{stageLabel(analytics.bottleneck?.stage || '') || '暂无数据'}</span>
            （平均 {analytics.bottleneck?.平均耗时?.toFixed(1) || '0.0'} 天）
          </p>
        </div>
      </Panel>
    </div>
  );
}

function MethodSection({ analytics, height }: { analytics: Analytics; height: number }) {
  return (
    <div className="cockpit-grid cockpit-grid-3">
      <Panel title="交易渠道构成">
        <Chart
          height={height}
          option={pieOption(
            analytics.methods.map((item) => ({ name: item.label, value: item.项目数 })),
          )}
        />
      </Panel>
      <Panel title="办理时长对比（天）" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(analytics.methods.map((item) => item.label)),
            yAxis: valueAxis(),
            series: [
              {
                name: '计划天数',
                type: 'bar',
                barMaxWidth: 30,
                data: analytics.methods.map((item) => item.计划周期),
                itemStyle: { color: COLORS[5], borderRadius: [4, 4, 0, 0] },
              },
              {
                name: '实际均值',
                type: 'bar',
                barMaxWidth: 30,
                data: analytics.methods.map((item) => item.平均周期),
                itemStyle: { color: COLORS[0], borderRadius: [4, 4, 0, 0] },
              },
            ],
          })}
        />
      </Panel>
    </div>
  );
}

function AmountSection({ analytics, height }: { analytics: Analytics; height: number }) {
  return (
    <div className="cockpit-grid cockpit-grid-3">
      <Panel title="计划金额梯度">
        <Chart
          height={height}
          option={baseChart({
            grid: { left: 72, right: 24, top: 24, bottom: 32, containLabel: true },
            xAxis: valueAxis(),
            yAxis: axisOptions(
              analytics.amountDist.map((item) => item.range),
              { type: 'category', inverse: true },
            ),
            series: [
              {
                name: '事项笔数',
                type: 'bar',
                data: analytics.amountDist.map((item, index) => ({
                  value: item.项目数,
                  itemStyle: { color: COLORS[index % COLORS.length], borderRadius: [0, 4, 4, 0] },
                })),
              },
            ],
          })}
        />
      </Panel>
      <Panel
        title="各责任条线资金执行与优化（%）"
        className="cockpit-span-2"
        extra={
          <span className="cockpit-panel-extra">
            总体落地率 <b>{percent(analytics.kpi.exec)}</b> · 总体优化率{' '}
            <b>{percent(analytics.kpi.saving)}</b>
          </span>
        }
      >
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(analytics.execByUnit.map((item) => item.unit)),
            yAxis: [valueAxis({ min: 70, max: 100 }), valueAxis({ splitLine: { show: false } })],
            series: [
              {
                name: '资金落地率',
                type: 'bar',
                barMaxWidth: 30,
                data: analytics.execByUnit.map((item) => item.执行率),
                itemStyle: { color: COLORS[0], borderRadius: [4, 4, 0, 0] },
              },
              {
                name: '优化率',
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                data: analytics.execByUnit.map((item) => item.节资率),
                lineStyle: { color: COLORS[1], width: 2 },
                itemStyle: { color: COLORS[1] },
              },
            ],
          })}
        />
      </Panel>
    </div>
  );
}

function SupplierSection({ analytics, height }: { analytics: Analytics; height: number }) {
  const topSuppliers = analytics.suppliers.slice(0, 10);
  const relationAlerts = analytics.alerts.filter(
    (item) => item.kind === '集中' || item.kind === '围标',
  );
  return (
    <div className="cockpit-grid cockpit-grid-3">
      <Panel title="成交主体金额构成（万元）">
        <Chart
          height={height}
          option={pieOption(
            topSuppliers.slice(0, 8).map((item) => ({ name: item.supplier, value: item.中标金额 })),
            true,
          )}
        />
      </Panel>
      <Panel title="供应商参与与落地次数" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(
              topSuppliers.map((item) => item.supplier),
              {
                axisLabel: {
                  color: mutedText,
                  fontSize: 11,
                  interval: 0,
                  formatter: (value: string) => value.slice(0, 4),
                },
              },
            ),
            yAxis: valueAxis(),
            series: [
              {
                name: '参与笔数',
                type: 'bar',
                barMaxWidth: 28,
                data: topSuppliers.map((item) => item.参与次数),
                itemStyle: { color: COLORS[5], borderRadius: [4, 4, 0, 0] },
              },
              {
                name: '落地笔数',
                type: 'bar',
                barMaxWidth: 28,
                data: topSuppliers.map((item) => item.中标次数),
                itemStyle: { color: COLORS[2], borderRadius: [4, 4, 0, 0] },
              },
            ],
          })}
        />
      </Panel>
      <Panel title={`关联风险提示（${relationAlerts.length}）`} className="cockpit-span-3">
        <div className="cockpit-relation-alerts">
          {relationAlerts.length === 0 && <p className="cockpit-muted">暂无关联风险提示</p>}
          {relationAlerts.map((item) => (
            <div key={item.id} className="cockpit-relation-alert">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const SECTION_RENDERERS: Record<
  SectionKey,
  (props: { analytics: Analytics; height: number }) => React.ReactNode
> = {
  unit: UnitSection,
  time: TimeSection,
  process: ProcessSection,
  method: MethodSection,
  amount: AmountSection,
  supplier: SupplierSection,
};

function AlertCenter({
  alerts,
  pushed,
  onPush,
}: {
  alerts: AlertItem[];
  pushed: Set<string>;
  onPush: (items: AlertItem[]) => void;
}) {
  return (
    <Panel
      title={`风险提示中心（${alerts.length}）`}
      extra={
        <Button danger size="small" icon={<SendOutlined />} onClick={() => onPush(alerts)}>
          批量通知
        </Button>
      }
    >
      <div className="cockpit-alert-list">
        {alerts.map((item) => (
          <div key={item.id} className="cockpit-alert-item">
            <Tag color={item.level === '高' ? 'error' : 'warning'}>
              {alertLevelLabel(item.level)}
            </Tag>
            <div className="cockpit-alert-content">
              <strong>{item.title}</strong>
              <span>
                【{alertKindLabel(item.kind)}】{item.detail} · 通知至：
                {RECIPIENTS[item.kind] || '相关责任人'}
              </span>
            </div>
            {pushed.has(item.id) ? (
              <span className="cockpit-pushed">已通知</span>
            ) : (
              <Button type="link" size="small" onClick={() => onPush([item])}>
                通知
              </Button>
            )}
          </div>
        ))}
        {!alerts.length && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无风险提示" />
        )}
      </div>
    </Panel>
  );
}

function ProcurementCockpitPage() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [tab, setTab] = useState<SectionKey | 'all'>('all');
  const [bigScreen, setBigScreen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [slide, setSlide] = useState(0);
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [pushed, setPushed] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(
    () =>
      ALL_PROJECTS.filter(
        (project) =>
          project.start >= filters.from &&
          project.start <= filters.to &&
          (!filters.unit || project.unit === filters.unit) &&
          (!filters.method || project.method === filters.method) &&
          (!filters.status || project.status === filters.status),
      ),
    [filters],
  );
  const analytics = useAnalytics(filteredData);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString('zh-CN', { hour12: false }));
    };
    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!bigScreen || !playing) return undefined;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % SECTION_LIST.length);
    }, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [bigScreen, playing, intervalSeconds]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setBigScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const highRisk = analytics.alerts.filter((item) => item.level === '高');
    if (!highRisk.length) return undefined;
    const timer = window.setTimeout(() => {
      notification.warning({
        message: `检测到 ${highRisk.length} 条重点风险提示`,
        description: '已自动通知相关责任人',
        placement: 'topRight',
      });
      setPushed((current) => new Set([...current, ...highRisk.map((item) => item.id)]));
    }, 800);
    return () => window.clearTimeout(timer);
    // 首次加载时提醒重点风险，筛选变化由用户手动通知。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushAlerts = (items: AlertItem[]) => {
    const fresh = items.filter((item) => !pushed.has(item.id));
    if (!fresh.length) {
      message.info('所选风险均已通知');
      return;
    }
    setPushed((current) => new Set([...current, ...fresh.map((item) => item.id)]));
    fresh.slice(0, 3).forEach((item) => {
      notification.error({
        message: item.title,
        description: `已通知至：${RECIPIENTS[item.kind] || '相关责任人'}`,
        placement: 'topRight',
      });
    });
    if (fresh.length > 3) message.success(`共通知 ${fresh.length} 条风险提示`);
  };

  const toggleBigScreen = async () => {
    if (!bigScreen) {
      setSlide(0);
      try {
        await rootRef.current?.requestFullscreen?.();
      } catch {
        message.info('当前浏览器不支持全屏，将使用页面展示模式');
      }
      setBigScreen(true);
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
    setBigScreen(false);
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const addSheet = (name: string, rows: object[]) => {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
      };
      const { kpi } = analytics;
      addSheet('指标总览', [
        {
          事项规模: kpi.total,
          '计划金额(万元)': Number(formatWan(kpi.budget).replace(/,/g, '')),
          '已落地金额(万元)': Number(formatWan(kpi.amount).replace(/,/g, '')),
          执行中事项: kpi.ongoing,
          进度滞后: kpi.overdue,
          结项比例: percent(kpi.completion),
          资金落地率: percent(kpi.exec),
          资金优化率: percent(kpi.saving),
          平均办理天数: +kpi.avgCycle.toFixed(1),
        },
      ]);
      addSheet(
        '责任条线概览',
        analytics.units.map((item) => ({
          责任条线: item.unit,
          事项笔数: item.项目数,
          '计划金额(万元)': item.金额,
          已结项: item.已完成,
          执行中: item.进行中,
          进度滞后: item.已超期,
          已关闭: item.已终止,
          货品类: item.货物,
          建设类: item.工程,
          服务类: item.服务,
        })),
      );
      const trendRows = (rows: typeof analytics.monthly) =>
        rows.map((item) => ({ 周期: item.k, 事项笔数: item.项目数, '计划金额(万元)': item.金额 }));
      addSheet('按月走势', trendRows(analytics.monthly));
      addSheet('按季走势', trendRows(analytics.quarterly));
      addSheet('按年走势', trendRows(analytics.yearly));
      addSheet(
        '环节时长',
        analytics.stageAvg.map((item) => ({ 环节: item.label, 平均办理时长: item.平均耗时 })),
      );
      addSheet(
        '执行中环节',
        analytics.stageDist.map((item) => ({
          环节: item.label,
          执行中: item.在途,
          滞后: item.超期,
        })),
      );
      addSheet(
        '交易渠道',
        analytics.methods.map((item) => ({
          交易渠道: item.label,
          事项笔数: item.项目数,
          计划天数: item.计划周期,
          实际均值: item.平均周期,
        })),
      );
      addSheet(
        '金额梯度',
        analytics.amountDist.map((item) => ({ 金额梯度: item.range, 事项笔数: item.项目数 })),
      );
      addSheet(
        '资金执行',
        analytics.execByUnit.map((item) => ({
          责任条线: item.unit,
          资金落地率: item.执行率,
          优化率: item.节资率,
        })),
      );
      addSheet(
        '成交主体',
        analytics.suppliers.map((item) => ({
          主体: item.supplier,
          参与笔数: item.参与次数,
          落地笔数: item.中标次数,
          '落地金额(万元)': item.中标金额,
        })),
      );
      addSheet(
        '风险提示',
        analytics.alerts.map((item) => ({
          等级: alertLevelLabel(item.level),
          类型: alertKindLabel(item.kind),
          提示: item.title,
          说明: item.detail,
          通知对象: RECIPIENTS[item.kind] || '相关责任人',
        })),
      );
      addSheet(
        '事项明细',
        filteredData.map((project) => ({
          事项编号: project.id,
          事项名称: project.name,
          责任条线: unitLabel(project.unit),
          交易渠道: methodLabel(project.method),
          业务类别: typeLabel(project.type),
          执行状态: statusLabel(project.status),
          当前环节: stageLabel(project.stage),
          '计划金额(万元)': project.budget / 10000,
          '落地金额(万元)': project.amount / 10000,
          成交主体: project.supplier,
          立项时间: project.start,
        })),
      );
      XLSX.writeFile(workbook, `采购运行态势报表_${new Date().toISOString().slice(0, 10)}.xlsx`);
      message.success('工作簿已导出');
    } catch (error) {
      console.error('导出 Excel 失败', error);
      message.error('工作簿导出失败');
    }
  };

  const exportPdf = async () => {
    const report = reportRef.current;
    if (!report || exportingPdf) return;

    const messageKey = 'procurement-cockpit-pdf-export';
    setExportingPdf(true);
    message.loading({ content: '正在生成态势 PDF…', key: messageKey, duration: 0 });

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(report, {
        backgroundColor: '#071526',
        logging: false,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
      });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      const image = canvas.toDataURL('image/jpeg', 0.92);

      for (let offset = 0; offset < imageHeight; offset += pageHeight) {
        if (offset > 0) pdf.addPage();
        pdf.addImage(image, 'JPEG', 0, -offset, pageWidth, imageHeight);
      }

      pdf.save(`采购运行态势报表_${new Date().toISOString().slice(0, 10)}.pdf`);
      message.success({ content: 'PDF 态势报表已导出', key: messageKey });
    } catch (error) {
      console.error('导出 PDF 失败', error);
      message.error({ content: '态势 PDF 导出失败', key: messageKey });
    } finally {
      setExportingPdf(false);
    }
  };

  const visibleSections =
    tab === 'all' ? SECTION_LIST : SECTION_LIST.filter((item) => item.key === tab);
  const activeBigSection = SECTION_LIST[slide]!;
  const renderSection = (section: (typeof SECTION_LIST)[number], height: number) => {
    const Renderer = SECTION_RENDERERS[section.key];
    return <Renderer analytics={analytics} height={height} />;
  };

  const header = (
    <header className="cockpit-header">
      <div>
        <h1>采购运行态势驾驶舱</h1>
        <p>
          统计区间 {filters.from} 至 {filters.to} · 覆盖 {filteredData.length} 笔事项
        </p>
      </div>
      <time>{currentTime}</time>
    </header>
  );

  return (
    <div ref={rootRef} className={`procurement-cockpit ${bigScreen ? 'is-bigscreen' : ''}`}>
      {bigScreen ? (
        <div className="cockpit-bigscreen-inner">
          {header}
          <Kpis analytics={analytics} />
          <div className="cockpit-bigscreen-controls">
            <Space wrap>
              {SECTION_LIST.map((section, index) => (
                <Button
                  key={section.key}
                  type={index === slide ? 'primary' : 'default'}
                  onClick={() => setSlide(index)}
                >
                  {section.label}
                </Button>
              ))}
            </Space>
            <Space>
              <Button
                aria-label={playing ? '暂停轮播' : '开始轮播'}
                icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={() => setPlaying((current) => !current)}
              />
              <span>轮播周期</span>
              <Select
                value={intervalSeconds}
                aria-label="轮播周期"
                popupClassName="cockpit-interval-dropdown"
                getPopupContainer={() => rootRef.current || document.body}
                placement="bottomRight"
                onChange={(value) => setIntervalSeconds(Number(value))}
                options={[5, 10, 15, 30].map((value) => ({ value, label: `${value} 秒` }))}
              />
              <Button icon={<FullscreenExitOutlined />} onClick={toggleBigScreen}>
                退出展示
              </Button>
            </Space>
          </div>
          <div className="cockpit-bigscreen-section" key={activeBigSection.key}>
            {renderSection(activeBigSection, 330)}
          </div>
        </div>
      ) : (
        <div className="cockpit-page-inner">
          {header}
          <div className="cockpit-toolbar">
            <label>
              <span>起始时间</span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, from: event.target.value }))
                }
              />
            </label>
            <label>
              <span>截止时间</span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, to: event.target.value }))
                }
              />
            </label>
            <label>
              <span>责任条线</span>
              <Select
                value={filters.unit || undefined}
                placeholder="不限"
                allowClear
                options={PROCUREMENT_UNITS.map((value) => ({ value, label: unitLabel(value) }))}
                onChange={(value) => setFilters((current) => ({ ...current, unit: value || '' }))}
              />
            </label>
            <label>
              <span>交易渠道</span>
              <Select
                value={filters.method || undefined}
                placeholder="不限"
                allowClear
                options={PROCUREMENT_METHODS.map((value) => ({ value, label: methodLabel(value) }))}
                onChange={(value) => setFilters((current) => ({ ...current, method: value || '' }))}
              />
            </label>
            <label>
              <span>执行状态</span>
              <Select
                value={filters.status || undefined}
                placeholder="不限"
                allowClear
                options={PROCUREMENT_STATUSES.map((value) => ({
                  value,
                  label: statusLabel(value),
                }))}
                onChange={(value) => setFilters((current) => ({ ...current, status: value || '' }))}
              />
            </label>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setFilters(INITIAL_FILTERS);
                message.success('查询条件已恢复');
              }}
            >
              恢复默认
            </Button>
            <div className="cockpit-toolbar-actions">
              <Button icon={<FileExcelOutlined />} onClick={exportExcel}>
                导出工作簿
              </Button>
              <Button icon={<FilePdfOutlined />} loading={exportingPdf} onClick={exportPdf}>
                导出态势 PDF
              </Button>
              <Button type="primary" icon={<ExpandOutlined />} onClick={toggleBigScreen}>
                展示模式
              </Button>
            </div>
          </div>

          <div className="cockpit-tabs">
            <Space wrap>
              <Button type={tab === 'all' ? 'primary' : 'default'} onClick={() => setTab('all')}>
                总览
              </Button>
              {SECTION_LIST.map((section) => (
                <Button
                  key={section.key}
                  type={tab === section.key ? 'primary' : 'default'}
                  onClick={() => setTab(section.key)}
                >
                  {section.label}
                </Button>
              ))}
            </Space>
            <span className="cockpit-pushed-count">
              <BellOutlined /> 已通知 {pushed.size} 条风险
            </span>
          </div>

          <div ref={reportRef} className="cockpit-report">
            <Kpis analytics={analytics} />
            <AlertCenter alerts={analytics.alerts} pushed={pushed} onPush={pushAlerts} />
            {!filteredData.length ? (
              <div className="cockpit-empty">
                <WarningOutlined /> 当前条件下没有匹配事项
              </div>
            ) : (
              visibleSections.map((section) => (
                <section key={section.key} className="cockpit-section">
                  <h2>
                    <DownloadOutlined />
                    {section.label}
                  </h2>
                  {renderSection(section, 260)}
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProcurementCockpitPage;
