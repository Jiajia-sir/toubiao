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
  { key: 'unit', label: '单位统计' },
  { key: 'time', label: '时间节点' },
  { key: 'process', label: '进程分析' },
  { key: 'method', label: '采购方式' },
  { key: 'amount', label: '金额分析' },
  { key: 'supplier', label: '供应商分析' },
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
        unit: unit.replace('市', ''),
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
      在途: ongoing.filter((project) => project.stage === stage && project.status === '进行中')
        .length,
      超期: ongoing.filter((project) => project.stage === stage && project.status === '已超期')
        .length,
    }));
    const bottleneck = [...stageAvg].sort((left, right) => right.平均耗时 - left.平均耗时)[0];
    const funnel = PROCUREMENT_STAGES.map((stage, index) => ({
      name: stage,
      value: data.filter((project) => project.stageIndex >= index && project.status !== '已终止')
        .length,
    }));

    const methods = PROCUREMENT_METHODS.map((method) => {
      const projects = data.filter((project) => project.method === method);
      const completedProjects = projects.filter((project) => project.status === '已完成');
      return {
        method,
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
      range: end === Infinity ? `${start}万以上` : `${start}-${end}万`,
      项目数: data.filter(
        (project) => project.budget / 10000 >= start && project.budget / 10000 < end,
      ).length,
    }));
    const execByUnit = PROCUREMENT_UNITS.map((unit) => {
      const projects = awarded.filter((project) => project.unit === unit);
      const unitBudget = projects.reduce((total, project) => total + project.budget, 0);
      const unitAmount = projects.reduce((total, project) => total + project.amount, 0);
      return {
        unit: unit.replace('市', ''),
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
        title: `${project.name} 超期 ${project.actualDays - project.plannedDays} 天`,
        detail: `${project.id} · ${project.unit} · 当前阶段：${project.stage}`,
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
          title: `${supplier} 在${unit}累计成交 ${count} 次`,
          detail: '单一供应商多次成交，存在利益关联风险',
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
          title: `${unit} 单一来源占比 ${percent(singleSourceRatio)}`,
          detail: '超过 18% 警戒线',
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
          title: `${key} 同时投标 ${count} 次`,
          detail: '频繁共同参与投标，疑似关联投标',
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
        name: type,
        value: data.filter((project) => project.type === type).length,
      })),
      statusShare: PROCUREMENT_STATUSES.map((status) => ({
        name: status,
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
    { label: '项目总数', value: kpi.total, unit: '个' },
    { label: '预算总额', value: formatWan(kpi.budget), unit: '万元' },
    { label: '成交金额', value: formatWan(kpi.amount), unit: '万元' },
    { label: '在途项目', value: kpi.ongoing, unit: '个' },
    { label: '超期项目', value: kpi.overdue, unit: '个', warning: true },
    { label: '完成率', value: percent(kpi.completion), unit: '' },
    { label: '节资率', value: percent(kpi.saving), unit: '' },
    { label: '平均周期', value: kpi.avgCycle.toFixed(1), unit: '天' },
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
      <Panel title="各单位项目数量与金额（万元）" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(labels),
            yAxis: [
              valueAxis({ name: '项目数' }),
              valueAxis({ name: '金额', splitLine: { show: false } }),
            ],
            series: [
              {
                name: '项目数',
                type: 'bar',
                barMaxWidth: 28,
                data: analytics.units.map((item) => Number(item.项目数)),
                itemStyle: { color: COLORS[0], borderRadius: [4, 4, 0, 0] },
              },
              {
                name: '金额（万元）',
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
      <Panel title="项目类型占比">
        <Chart height={height} option={pieOption(analytics.typeShare)} />
      </Panel>
      <Panel title="各单位项目状态" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(labels),
            yAxis: valueAxis(),
            series: PROCUREMENT_STATUSES.map((status, index) => ({
              name: status,
              type: 'bar',
              stack: 'status',
              barMaxWidth: 28,
              data: analytics.units.map((item) => Number(item[status])),
              itemStyle: { color: [COLORS[1], COLORS[0], COLORS[4], COLORS[5]][index] },
            })),
          })}
        />
      </Panel>
      <Panel title="项目状态占比">
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
        title={`${group}趋势`}
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
                {item}
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
              valueAxis({ name: '项目数' }),
              valueAxis({ name: '金额', splitLine: { show: false } }),
            ],
            series: [
              {
                name: '项目数',
                type: 'line',
                smooth: true,
                data: trend.map((item) => item.项目数),
                areaStyle: { color: 'rgba(34,211,238,.16)' },
                lineStyle: { width: 2, color: COLORS[0] },
                itemStyle: { color: COLORS[0] },
              },
              {
                name: '金额（万元）',
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
      <Panel title="各阶段平均耗时（天）" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            xAxis: axisOptions(analytics.stageAvg.map((item) => item.stage)),
            yAxis: valueAxis(),
            series: [
              {
                name: '平均耗时',
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
      <Panel title={`超期预警（${analytics.overdue.length}）`}>
        <div className="cockpit-overdue-list" style={{ height }}>
          {analytics.overdue.slice(0, 20).map((project) => (
            <div key={project.id} className="cockpit-overdue-item">
              <div>
                <strong>{project.name}</strong>
                <span>+{project.actualDays - project.plannedDays}天</span>
              </div>
              <p>
                {project.unit} · {project.stage} · 计划{project.plannedDays}天
              </p>
            </div>
          ))}
          {!analytics.overdue.length && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无超期项目" />
          )}
        </div>
      </Panel>
    </div>
  );
}

function ProcessSection({ analytics, height }: { analytics: Analytics; height: number }) {
  return (
    <div className="cockpit-grid cockpit-grid-3">
      <Panel title="在途项目阶段分布" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(analytics.stageDist.map((item) => item.stage)),
            yAxis: valueAxis(),
            series: [
              {
                name: '在途',
                type: 'bar',
                stack: 'process',
                data: analytics.stageDist.map((item) => item.在途),
                itemStyle: { color: COLORS[0] },
              },
              {
                name: '超期',
                type: 'bar',
                stack: 'process',
                data: analytics.stageDist.map((item) => item.超期),
                itemStyle: { color: COLORS[4], borderRadius: [4, 4, 0, 0] },
              },
            ],
          })}
        />
      </Panel>
      <Panel title="流程转化漏斗">
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
      <Panel title="流程瓶颈分析" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            radar: {
              center: ['50%', '52%'],
              radius: '68%',
              indicator: analytics.stageAvg.map((item) => ({ name: item.stage, max: 20 })),
              axisName: { color: mutedText, fontSize: 11 },
              splitLine: { lineStyle: { color: gridLine } },
              splitArea: { areaStyle: { color: ['rgba(34,211,238,.03)', 'rgba(34,211,238,.07)'] } },
              axisLine: { lineStyle: { color: gridLine } },
            },
            series: [
              {
                type: 'radar',
                data: [
                  { value: analytics.stageAvg.map((item) => item.平均耗时), name: '平均耗时' },
                ],
                lineStyle: { color: COLORS[3], width: 2 },
                itemStyle: { color: COLORS[3] },
                areaStyle: { color: 'rgba(167,139,250,.3)' },
              },
            ],
          })}
        />
      </Panel>
      <Panel title="完成率与转化率">
        <div className="cockpit-progress-list" style={{ minHeight: height }}>
          {[
            ['项目完成率', analytics.kpi.completion, COLORS[1]],
            ['成交转化率', analytics.kpi.conversion, COLORS[0]],
            ['超期率', analytics.kpi.overdue / (analytics.kpi.total || 1), COLORS[4]],
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
            瓶颈环节：<span>{analytics.bottleneck?.stage || '暂无数据'}</span>（平均{' '}
            {analytics.bottleneck?.平均耗时?.toFixed(1) || '0.0'} 天）
          </p>
        </div>
      </Panel>
    </div>
  );
}

function MethodSection({ analytics, height }: { analytics: Analytics; height: number }) {
  return (
    <div className="cockpit-grid cockpit-grid-3">
      <Panel title="采购方式使用占比">
        <Chart
          height={height}
          option={pieOption(
            analytics.methods.map((item) => ({ name: item.method, value: item.项目数 })),
          )}
        />
      </Panel>
      <Panel title="平均周期对比（天）" className="cockpit-span-2">
        <Chart
          height={height}
          option={baseChart({
            legend: { top: 0, textStyle: { color: mutedText } },
            xAxis: axisOptions(analytics.methods.map((item) => item.method)),
            yAxis: valueAxis(),
            series: [
              {
                name: '计划周期',
                type: 'bar',
                barMaxWidth: 30,
                data: analytics.methods.map((item) => item.计划周期),
                itemStyle: { color: COLORS[5], borderRadius: [4, 4, 0, 0] },
              },
              {
                name: '实际平均周期',
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
      <Panel title="金额区间分布">
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
                name: '项目数',
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
        title="各单位预算执行率与节资率（%）"
        className="cockpit-span-2"
        extra={
          <span className="cockpit-panel-extra">
            总执行率 <b>{percent(analytics.kpi.exec)}</b> · 总节资率{' '}
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
                name: '执行率',
                type: 'bar',
                barMaxWidth: 30,
                data: analytics.execByUnit.map((item) => item.执行率),
                itemStyle: { color: COLORS[0], borderRadius: [4, 4, 0, 0] },
              },
              {
                name: '节资率',
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
      <Panel title="中标供应商分布（金额·万元）">
        <Chart
          height={height}
          option={pieOption(
            topSuppliers.slice(0, 8).map((item) => ({ name: item.supplier, value: item.中标金额 })),
            true,
          )}
        />
      </Panel>
      <Panel title="供应商参与频次 / 中标次数" className="cockpit-span-2">
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
                name: '参与次数',
                type: 'bar',
                barMaxWidth: 28,
                data: topSuppliers.map((item) => item.参与次数),
                itemStyle: { color: COLORS[5], borderRadius: [4, 4, 0, 0] },
              },
              {
                name: '中标次数',
                type: 'bar',
                barMaxWidth: 28,
                data: topSuppliers.map((item) => item.中标次数),
                itemStyle: { color: COLORS[2], borderRadius: [4, 4, 0, 0] },
              },
            ],
          })}
        />
      </Panel>
      <Panel title={`关联预警（${relationAlerts.length}）`} className="cockpit-span-3">
        <div className="cockpit-relation-alerts">
          {relationAlerts.length === 0 && <p className="cockpit-muted">暂无关联风险</p>}
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
      title={`异常预警中心（${alerts.length}）`}
      extra={
        <Button danger size="small" icon={<SendOutlined />} onClick={() => onPush(alerts)}>
          全部推送
        </Button>
      }
    >
      <div className="cockpit-alert-list">
        {alerts.map((item) => (
          <div key={item.id} className="cockpit-alert-item">
            <Tag color={item.level === '高' ? 'error' : 'warning'}>{item.level}</Tag>
            <div className="cockpit-alert-content">
              <strong>{item.title}</strong>
              <span>
                {item.detail} · 推送至：{RECIPIENTS[item.kind] || '相关责任人'}
              </span>
            </div>
            {pushed.has(item.id) ? (
              <span className="cockpit-pushed">已推送</span>
            ) : (
              <Button type="link" size="small" onClick={() => onPush([item])}>
                推送
              </Button>
            )}
          </div>
        ))}
        {!alerts.length && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无异常预警" />
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
        message: `检测到 ${highRisk.length} 条高风险异常`,
        description: '已自动推送至相关责任人',
        placement: 'topRight',
      });
      setPushed((current) => new Set([...current, ...highRisk.map((item) => item.id)]));
    }, 800);
    return () => window.clearTimeout(timer);
    // 首次加载时提醒高风险预警，筛选变化由用户手动推送。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushAlerts = (items: AlertItem[]) => {
    const fresh = items.filter((item) => !pushed.has(item.id));
    if (!fresh.length) {
      message.info('所选预警均已推送');
      return;
    }
    setPushed((current) => new Set([...current, ...fresh.map((item) => item.id)]));
    fresh.slice(0, 3).forEach((item) => {
      notification.error({
        message: item.title,
        description: `已推送至：${RECIPIENTS[item.kind] || '相关责任人'}`,
        placement: 'topRight',
      });
    });
    if (fresh.length > 3) message.success(`共推送 ${fresh.length} 条预警消息`);
  };

  const toggleBigScreen = async () => {
    if (!bigScreen) {
      setSlide(0);
      try {
        await rootRef.current?.requestFullscreen?.();
      } catch {
        message.info('当前浏览器不支持全屏，将使用页面大屏模式');
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
      addSheet('核心指标', [
        {
          项目总数: kpi.total,
          '预算总额(万元)': Number(formatWan(kpi.budget).replace(/,/g, '')),
          '成交金额(万元)': Number(formatWan(kpi.amount).replace(/,/g, '')),
          在途项目: kpi.ongoing,
          超期项目: kpi.overdue,
          完成率: percent(kpi.completion),
          预算执行率: percent(kpi.exec),
          节资率: percent(kpi.saving),
          '平均周期(天)': +kpi.avgCycle.toFixed(1),
        },
      ]);
      addSheet('单位统计', analytics.units);
      addSheet('月度趋势', analytics.monthly);
      addSheet('季度趋势', analytics.quarterly);
      addSheet('年度趋势', analytics.yearly);
      addSheet('阶段耗时', analytics.stageAvg);
      addSheet('在途阶段分布', analytics.stageDist);
      addSheet('采购方式', analytics.methods);
      addSheet('金额区间', analytics.amountDist);
      addSheet('执行率与节资率', analytics.execByUnit);
      addSheet('供应商', analytics.suppliers);
      addSheet(
        '异常预警',
        analytics.alerts.map((item) => ({
          等级: item.level,
          类型: item.kind,
          预警: item.title,
          说明: item.detail,
          推送对象: RECIPIENTS[item.kind] || '相关责任人',
        })),
      );
      addSheet(
        '项目明细',
        filteredData.map((project) => ({
          编号: project.id,
          名称: project.name,
          单位: project.unit,
          方式: project.method,
          类型: project.type,
          状态: project.status,
          阶段: project.stage,
          '预算(万元)': project.budget / 10000,
          '成交(万元)': project.amount / 10000,
          供应商: project.supplier,
          立项日期: project.start,
        })),
      );
      XLSX.writeFile(workbook, `采购数据驾驶舱报表_${new Date().toISOString().slice(0, 10)}.xlsx`);
      message.success('Excel 报表已导出');
    } catch (error) {
      console.error('导出 Excel 失败', error);
      message.error('Excel 报表导出失败');
    }
  };

  const exportPdf = async () => {
    const report = reportRef.current;
    if (!report || exportingPdf) return;

    const messageKey = 'procurement-cockpit-pdf-export';
    setExportingPdf(true);
    message.loading({ content: '正在生成 PDF 报表…', key: messageKey, duration: 0 });

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

      pdf.save(`采购数据驾驶舱报表_${new Date().toISOString().slice(0, 10)}.pdf`);
      message.success({ content: 'PDF 报表已导出', key: messageKey });
    } catch (error) {
      console.error('导出 PDF 失败', error);
      message.error({ content: 'PDF 报表导出失败', key: messageKey });
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
        <h1>采购数据驾驶舱</h1>
        <p>
          数据范围 {filters.from} 至 {filters.to} · 共 {filteredData.length} 个项目
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
              <span>轮播间隔</span>
              <Select
                value={intervalSeconds}
                aria-label="轮播间隔"
                popupClassName="cockpit-interval-dropdown"
                getPopupContainer={() => rootRef.current || document.body}
                placement="bottomRight"
                onChange={(value) => setIntervalSeconds(Number(value))}
                options={[5, 10, 15, 30].map((value) => ({ value, label: `${value}秒` }))}
              />
              <Button icon={<FullscreenExitOutlined />} onClick={toggleBigScreen}>
                退出大屏
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
              <span>开始日期</span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, from: event.target.value }))
                }
              />
            </label>
            <label>
              <span>结束日期</span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, to: event.target.value }))
                }
              />
            </label>
            <label>
              <span>采购单位</span>
              <Select
                value={filters.unit || undefined}
                placeholder="全部"
                allowClear
                options={PROCUREMENT_UNITS.map((value) => ({ value, label: value }))}
                onChange={(value) => setFilters((current) => ({ ...current, unit: value || '' }))}
              />
            </label>
            <label>
              <span>采购方式</span>
              <Select
                value={filters.method || undefined}
                placeholder="全部"
                allowClear
                options={PROCUREMENT_METHODS.map((value) => ({ value, label: value }))}
                onChange={(value) => setFilters((current) => ({ ...current, method: value || '' }))}
              />
            </label>
            <label>
              <span>项目状态</span>
              <Select
                value={filters.status || undefined}
                placeholder="全部"
                allowClear
                options={PROCUREMENT_STATUSES.map((value) => ({ value, label: value }))}
                onChange={(value) => setFilters((current) => ({ ...current, status: value || '' }))}
              />
            </label>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setFilters(INITIAL_FILTERS);
                message.success('筛选条件已重置');
              }}
            >
              重置
            </Button>
            <div className="cockpit-toolbar-actions">
              <Button icon={<FileExcelOutlined />} onClick={exportExcel}>
                导出 Excel
              </Button>
              <Button icon={<FilePdfOutlined />} loading={exportingPdf} onClick={exportPdf}>
                导出 PDF
              </Button>
              <Button type="primary" icon={<ExpandOutlined />} onClick={toggleBigScreen}>
                大屏模式
              </Button>
            </div>
          </div>

          <div className="cockpit-tabs">
            <Space wrap>
              <Button type={tab === 'all' ? 'primary' : 'default'} onClick={() => setTab('all')}>
                全部
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
              <BellOutlined /> 已推送 {pushed.size} 条预警
            </span>
          </div>

          <div ref={reportRef} className="cockpit-report">
            <Kpis analytics={analytics} />
            <AlertCenter alerts={analytics.alerts} pushed={pushed} onPush={pushAlerts} />
            {!filteredData.length ? (
              <div className="cockpit-empty">
                <WarningOutlined /> 当前筛选条件下暂无数据
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
