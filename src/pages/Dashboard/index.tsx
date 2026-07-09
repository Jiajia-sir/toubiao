'use client';

import { useEffect, useMemo, useState } from 'react';
import { history } from '@umijs/max';
import { Row, Col, Card, Progress, Table, Tag, Button, Space, Select, theme } from 'antd';
import {
  ApiOutlined,
  MoreOutlined,
  CloudUploadOutlined,
  LoadingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ClusterOutlined,
  FundProjectionScreenOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { statusConfig } from '@/config/status';
import {
  getDashboardFileTypeCount,
  getDashboardImportTrend,
  getDashboardOverviewCount,
  type DashboardFileTypeCountItem,
  type DashboardImportTrend,
  type DashboardImportTrendItem,
  type DashboardOverviewCount,
} from '@/services/biz/dashboard';

const PIE_COLORS = ['#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

const recentTasks = [
  {
    key: '1',
    name: '2024年项目文档批量导入',
    type: '文档导入',
    status: 'completed',
    progress: 100,
    createTime: '2024-01-15 14:30:00',
  },
  {
    key: '2',
    name: 'MySQL业务数据库同步',
    type: '数据库导入',
    status: 'running',
    progress: 68,
    createTime: '2024-01-15 10:20:00',
  },
  {
    key: '3',
    name: '行业研究报告PDF导入',
    type: '文档导入',
    status: 'pending',
    progress: 0,
    createTime: '2024-01-15 09:15:00',
  },
  {
    key: '4',
    name: 'MongoDB日志数据导入',
    type: '数据库导入',
    status: 'failed',
    progress: 45,
    createTime: '2024-01-14 16:45:00',
  },
];

const formatCount = (value?: number) => Number(value || 0).toLocaleString('zh-CN');

const getTrendListByRange = (trendData: DashboardImportTrend | undefined, timeRange: string) => {
  if (!trendData) {
    return [];
  }
  if (timeRange === '7') {
    return trendData.last7Days || [];
  }
  if (timeRange === '15') {
    return trendData.last15Days || [];
  }
  if (timeRange === '90') {
    return trendData.last90Days || [];
  }
  return trendData.last30Days || [];
};

const getLineChartOption = (lineChartData: DashboardImportTrendItem[]) => ({
  tooltip: {
    trigger: 'axis',
    borderRadius: 12,
    border: '1px solid rgba(59, 130, 246, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)',
    textStyle: { color: '#1f2937', fontSize: 12 },
  },
  legend: {
    data: ['文档导入量'],
    top: 0,
    textStyle: { color: '#6b7280', fontSize: 12 },
    itemWidth: 12,
    itemHeight: 12,
    itemGap: 16,
  },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: lineChartData.map((item) => item.statDate.slice(5)),
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisLabel: { fontSize: 12, color: '#9ca3af' },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisLabel: { fontSize: 12, color: '#9ca3af' },
    splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    axisTick: { show: false },
  },
  series: [
    {
      name: '文档导入量',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: lineChartData.map((item) => item.count),
      itemStyle: { color: '#3b82f6', borderColor: '#fff', borderWidth: 2 },
      lineStyle: { width: 3 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
          ],
        },
      },
    },
  ],
});

const getPieChartOption = (pieChartData: Array<{ name: string; value: number; color: string }>) => {
  const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      borderRadius: 12,
      border: '1px solid rgba(59, 130, 246, 0.15)',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)',
      textStyle: { color: '#1f2937' },
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#6b7280', fontSize: 13 },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 12,
      formatter: (name: string) => {
        const item = pieChartData.find((i) => i.name === name);
        const value = item ? item.value : 0;
        const percent = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
        return `${name} ${percent}%`;
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          itemStyle: {
            shadowBlur: 24,
            shadowColor: 'rgba(59, 130, 246, 0.4)',
          },
        },
        labelLine: { show: false },
        data: pieChartData.map((item) => ({
          value: item.value,
          name: item.name,
          itemStyle: { color: item.color },
        })),
      },
    ],
  };
};

export default function DashboardPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<string>('30');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<{
    overview: DashboardOverviewCount;
    trend: DashboardImportTrend;
    fileTypeCount: DashboardFileTypeCountItem[];
  }>();
  const { token } = theme.useToken();
  const isDark = token.colorBgBase === '#000' || token.colorBgContainer.toLowerCase() !== '#ffffff';

  useEffect(() => {
    let cancelled = false;

    const loadDashboardStats = async () => {
      setDashboardLoading(true);
      try {
        const [overview, trend, fileTypeCount] = await Promise.all([
          getDashboardOverviewCount(),
          getDashboardImportTrend(),
          getDashboardFileTypeCount(),
        ]);
        if (cancelled) {
          return;
        }
        setDashboardStats({
          overview: (overview || {}) as DashboardOverviewCount,
          trend: (trend || {}) as DashboardImportTrend,
          fileTypeCount: (fileTypeCount || []) as DashboardFileTypeCountItem[],
        });
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboardStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = useMemo(
    () => [
      {
        title: '总导入文档数',
        value: formatCount(dashboardStats?.overview?.documentTotal),
        suffix: '份',
        icon: <FileTextOutlined />,
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)',
        bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        link: '/data/document-import',
        trendText: '累计总量',
        jumpMoudle: '文档导入页',
      },
      {
        title: '总数据源接入数',
        value: formatCount(dashboardStats?.overview?.dataSourceTotal),
        suffix: '个',
        icon: <DatabaseOutlined />,
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)',
        bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        link: '/data/source',
        trendText: '累计总量',
        jumpMoudle: '数据源接入页',
      },
      {
        title: '知识库总数',
        value: formatCount(dashboardStats?.overview?.knowledgeBaseTotal),
        suffix: '个',
        icon: <FundProjectionScreenOutlined />,
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)',
        bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        link: '/knowledge',
        trendText: '累计总量',
        jumpMoudle: '知识库页',
      },
      {
        title: '总实体数',
        value: formatCount(dashboardStats?.overview?.entityTotal),
        suffix: '个',
        icon: <ClusterOutlined />,
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)',
        bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        link: '/dashboard',
        trendText: '累计总量',
        jumpMoudle: '实体页',
      },
    ],
    [dashboardStats],
  );

  const lineChartData = useMemo(
    () => getTrendListByRange(dashboardStats?.trend, timeRange),
    [dashboardStats?.trend, timeRange],
  );

  const pieChartData = useMemo(
    () =>
      (dashboardStats?.fileTypeCount || []).map((item, index) => ({
        name: String(item.fileType || 'unknown').toUpperCase(),
        value: Number(item.count || 0),
        color: PIE_COLORS[index % PIE_COLORS.length],
      })),
    [dashboardStats?.fileTypeCount],
  );

  const timeRangeOptions = [
    { label: '近7天', value: '7' },
    { label: '近15天', value: '15' },
    { label: '近30天', value: '30' },
    { label: '近90天', value: '90' },
  ];

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center' as const,
      render: (name: string) => <span style={{ fontWeight: 500, color: '#1f2937' }}>{name}</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      align: 'center' as const,
      render: (type: string) => (
        <Tag
          color={type === '文档导入' ? '#3b82f6' : '#2563eb'}
          style={{
            borderRadius: 6,
            border: 'none',
            fontWeight: 500,
            boxShadow:
              type === '文档导入'
                ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                : '0 2px 8px rgba(37, 99, 235, 0.3)',
          }}
        >
          {type}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => {
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Space>
            {status === 'running' ? (
              <LoadingOutlined
                spin
                style={{
                  color: config?.color,
                  filter: `drop-shadow(0 0 4px ${config?.color})`,
                }}
              />
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: config?.color,
                  boxShadow: `0 0 8px ${config?.color}, 0 0 4px ${config?.color}`,
                }}
              />
            )}
            <span style={{ color: '#4b5563' }}>{config?.text}</span>
          </Space>
        );
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      align: 'center' as const,
      render: (progress: number, record: any) => {
        const config = statusConfig[record.status as keyof typeof statusConfig];
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center',
            }}
          >
            <Progress
              percent={progress}
              size="small"
              strokeColor={config?.color}
              style={{
                width: 120,
                filter: `drop-shadow(0 0 3px ${config?.color}80)`,
              }}
            />
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      align: 'center' as const,
      render: (time: string) => <span style={{ color: '#6b7280', fontSize: 13 }}>{time}</span>,
    },
    {
      title: '操作',
      key: 'action',
      align: 'center' as const,
      width: 80,
      render: () => <Button type="text" icon={<MoreOutlined />} style={{ color: '#9ca3af' }} />,
    },
  ];

  return (
    <>
      <div
        className={`dashboard-page ${isDark ? 'theme-dark' : 'theme-light'}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          padding: 4,
          background: isDark
            ? 'radial-gradient(circle at top, rgba(37,99,235,0.16) 0%, rgba(15,23,42,0.98) 42%, #020617 100%)'
            : undefined,
          borderRadius: 20,
        }}
      >
        {/* 统计卡片区域 */}
        <Row gutter={[20, 20]}>
          {statCards.map((card, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <div
                onMouseEnter={() => card.link && setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => card.link && history.push(card.link)}
                style={{
                  position: 'relative',
                  cursor: card.link ? 'pointer' : 'default',
                  borderRadius: 20,
                  background: '#fff',
                  border: '1px solid rgba(99, 102, 241, 0.08)',
                  boxShadow:
                    hoveredCard === index
                      ? `0 16px 40px ${card.color}20, 0 0 24px ${card.color}10`
                      : `0 4px 16px rgba(99, 102, 241, 0.06)`,
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: hoveredCard === index ? 'translateY(-6px)' : 'translateY(0)',
                  overflow: 'hidden',
                }}
              >
                {/* 顶部渐变光带 */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: card.gradient,
                  }}
                />

                {/* 右上角装饰光晕 */}
                <div
                  style={{
                    position: 'absolute',
                    top: -30,
                    right: -30,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${card.color}15 0%, transparent 70%)`,
                    pointerEvents: 'none',
                  }}
                />

                <div style={{ padding: '24px 24px 20px' }}>
                  {/* 标题栏 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: card.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 4px 12px ${card.color}40`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 18,
                            color: '#fff',
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
                          }}
                        >
                          {card.icon}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 14,
                          color: '#6b7280',
                          fontWeight: 500,
                        }}
                      >
                        {card.title}
                      </span>
                    </div>
                  </div>

                  {/* 数字 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        background: card.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.2,
                      }}
                    >
                      {card.value}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: '#9ca3af',
                        fontWeight: 500,
                      }}
                    >
                      {card.suffix}
                    </span>
                  </div>

                  {/* 趋势标签 */}
                  {card.trend && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 20,
                        background: card.trendUp
                          ? 'rgba(99, 102, 241, 0.08)'
                          : 'rgba(239, 68, 68, 0.08)',
                        border: `1px solid ${
                          card.trendUp ? 'rgba(99, 102, 241, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                        }`,
                      }}
                    >
                      {card.trendUp ? (
                        <ArrowUpOutlined style={{ fontSize: 10, color: '#6366f1' }} />
                      ) : (
                        <ArrowDownOutlined style={{ fontSize: 10, color: '#ef4444' }} />
                      )}
                      <span
                        style={{
                          color: card.trendUp ? '#6366f1' : '#ef4444',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {card.trend}
                      </span>
                      <span
                        style={{
                          color: '#9ca3af',
                          fontSize: 11,
                          marginLeft: 2,
                        }}
                      >
                        {card.trendText}
                      </span>
                    </div>
                  )}
                </div>

                {/* 悬浮跳转提示层 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: hoveredCard === index && card.link ? 38 : 0,
                    background: card.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    overflow: 'hidden',
                    transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: hoveredCard === index ? `0 -4px 16px ${card.color}40` : 'none',
                  }}
                >
                  <span
                    style={{
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.3px',
                      whiteSpace: 'nowrap',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}
                  >
                    跳转 {card.jumpMoudle}
                  </span>
                  <span
                    style={{
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      transform: hoveredCard === index ? 'translateX(4px)' : 'translateX(0)',
                      transition: 'transform 0.3s ease',
                    }}
                  >
                    →
                  </span>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* 图表区域 */}
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={14}>
            <Card
              loading={dashboardLoading}
              title={
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 16,
                      borderRadius: 2,
                      background: 'linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%)',
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: '#1f2937',
                    }}
                  >
                    数据导入趋势
                  </span>
                </div>
              }
              variant="borderless"
              style={{
                borderRadius: 20,
                background: '#fff',
                border: '1px solid rgba(99, 102, 241, 0.08)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.06)',
              }}
              styles={{ body: { padding: '20px 24px 24px' } }}
              extra={
                <Select
                  value={timeRange}
                  onChange={setTimeRange}
                  options={timeRangeOptions}
                  style={{ width: 110 }}
                  size="middle"
                />
              }
            >
              <ReactECharts option={getLineChartOption(lineChartData)} style={{ height: 320 }} />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              loading={dashboardLoading}
              title={
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 16,
                      borderRadius: 2,
                      background: 'linear-gradient(180deg, #2563eb 0%, #93c5fd 100%)',
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: '#1f2937',
                    }}
                  >
                    导入文档分布
                  </span>
                </div>
              }
              variant="borderless"
              style={{
                borderRadius: 20,
                background: '#fff',
                border: '1px solid rgba(99, 102, 241, 0.08)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.06)',
              }}
              styles={{ body: { padding: '20px 24px 24px' } }}
            >
              <ReactECharts option={getPieChartOption(pieChartData)} style={{ height: 320 }} />
            </Card>
          </Col>
        </Row>

        {/* 任务表格 */}
        <Card
          title={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 16,
                  borderRadius: 2,
                  background: 'linear-gradient(180deg, #1d4ed8 0%, #60a5fa 100%)',
                }}
              />
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  color: '#1f2937',
                }}
              >
                最近导入任务
              </span>
            </div>
          }
          variant="borderless"
          style={{
            borderRadius: 20,
            background: '#fff',
            border: '1px solid rgba(99, 102, 241, 0.08)',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.06)',
          }}
          styles={{ body: { padding: '8px 24px 24px' } }}
          extra={
            <Space size={12}>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                onClick={() => history.push('/data/document-import?action=upload')}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), 0 0 16px rgba(59, 130, 246, 0.2)',
                  height: 36,
                  padding: '0 18px',
                  fontWeight: 500,
                }}
              >
                上传文档
              </Button>
              <Button
                icon={<ApiOutlined />}
                onClick={() => history.push('/data/source?action=upload')}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#3b82f6',
                  height: 36,
                  padding: '0 18px',
                  fontWeight: 500,
                }}
              >
                添加数据源
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns as any}
            dataSource={recentTasks}
            rowKey="key"
            pagination={false}
          />
        </Card>
      </div>
    </>
  );
}

// 全局样式
const globalStyles = `
  .dashboard-page.theme-dark {
    color: #e2e8f0;
  }

  .dashboard-page.theme-dark .ant-card {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(2, 6, 23, 0.98) 100%) !important;
    border: 1px solid rgba(96, 165, 250, 0.14) !important;
    box-shadow: 0 18px 48px rgba(2, 6, 23, 0.42) !important;
  }

  .dashboard-page.theme-dark .ant-card-head {
    border-bottom: 1px solid rgba(148, 163, 184, 0.12) !important;
  }

  .dashboard-page.theme-dark .ant-card-head-title,
  .dashboard-page.theme-dark .ant-card-extra,
  .dashboard-page.theme-dark .ant-table,
  .dashboard-page.theme-dark .ant-table-cell,
  .dashboard-page.theme-dark .ant-select-selection-item,
  .dashboard-page.theme-dark .ant-select-arrow,
  .dashboard-page.theme-dark .ant-tag,
  .dashboard-page.theme-dark .ant-btn {
    color: #e2e8f0 !important;
  }

  .dashboard-page.theme-dark .ant-table {
    background: transparent !important;
  }

  .dashboard-page.theme-dark .ant-table-thead > tr > th {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.92) 100%) !important;
    color: #cbd5e1 !important;
    border-bottom: 1px solid rgba(96, 165, 250, 0.14) !important;
  }

  .dashboard-page.theme-dark .ant-table-tbody > tr > td {
    background: rgba(2, 6, 23, 0.55) !important;
    color: #e2e8f0 !important;
    border-bottom: 1px solid rgba(148, 163, 184, 0.08) !important;
  }

  .dashboard-page.theme-dark .ant-table-tbody > tr:hover > td {
    background: linear-gradient(90deg, rgba(37, 99, 235, 0.16) 0%, rgba(14, 165, 233, 0.10) 100%) !important;
  }

  .dashboard-page.theme-dark .ant-select-selector {
    background: rgba(15, 23, 42, 0.88) !important;
    border-color: rgba(96, 165, 250, 0.22) !important;
    color: #e2e8f0 !important;
  }

  .dashboard-page.theme-dark .ant-btn-default,
  .dashboard-page.theme-dark .ant-btn-text {
    background: rgba(15, 23, 42, 0.82) !important;
    border-color: rgba(96, 165, 250, 0.18) !important;
    color: #cbd5e1 !important;
  }

  .dashboard-page.theme-dark .ant-btn-default:hover,
  .dashboard-page.theme-dark .ant-btn-text:hover {
    background: rgba(30, 41, 59, 0.92) !important;
    border-color: rgba(96, 165, 250, 0.32) !important;
    color: #f8fafc !important;
  }

  .dashboard-page.theme-dark [style*="background: rgb(255, 255, 255)"],
  .dashboard-page.theme-dark [style*="background-color: rgb(255, 255, 255)"],
  .dashboard-page.theme-dark [style*="background: rgb(248, 250, 252)"],
  .dashboard-page.theme-dark [style*="background-color: rgb(248, 250, 252)"],
  .dashboard-page.theme-dark [style*="background: rgb(241, 245, 249)"],
  .dashboard-page.theme-dark [style*="background: rgb(239, 246, 255)"],
  .dashboard-page.theme-dark [style*="background: rgb(219, 234, 254)"] {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(2, 6, 23, 0.98) 100%) !important;
  }

  .dashboard-page.theme-dark [style*="color: rgb(31, 41, 55)"],
  .dashboard-page.theme-dark [style*="color: rgb(75, 85, 99)"],
  .dashboard-page.theme-dark [style*="color: rgb(107, 114, 128)"],
  .dashboard-page.theme-dark [style*="color: rgb(156, 163, 175)"] {
    color: #cbd5e1 !important;
  }

  .ant-card {
    border-radius: 20px !important;
  }

  .ant-card-head {
    border-bottom: 1px solid rgba(99, 102, 241, 0.06) !important;
    padding: 18px 24px !important;
    min-height: auto !important;
  }

  .ant-card-head-title {
    padding: 0 !important;
  }

  .ant-card-extra {
    padding: 0 !important;
  }

  .ant-card-body {
    padding: 20px 24px !important;
  }

  .ant-table {
    border-radius: 12px !important;
    overflow: hidden;
  }

  .ant-table-thead > tr > th {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%) !important;
    font-weight: 600 !important;
    color: #4b5563 !important;
    border-bottom: 1px solid rgba(99, 102, 241, 0.1) !important;
    font-size: 13px !important;
  }

  .ant-table-thead > tr > th::before {
    display: none !important;
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid rgba(99, 102, 241, 0.05) !important;
    transition: all 0.25s ease;
    font-size: 13px;
  }

  .ant-table-tbody > tr:hover > td {
    background: linear-gradient(90deg, rgba(99, 102, 241, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%) !important;
  }

  .ant-table-tbody > tr:last-child > td {
    border-bottom: none !important;
  }

  .ant-select-selector {
    border-radius: 8px !important;
    border-color: rgba(99, 102, 241, 0.2) !important;
  }

  .ant-select:hover .ant-select-selector {
    border-color: rgba(99, 102, 241, 0.4) !important;
  }

  .ant-select-focused .ant-select-selector {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
  }

  .ant-btn {
    border-radius: 8px !important;
    font-weight: 500 !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .ant-btn:hover {
    transform: translateY(-1px);
  }

  .ant-btn-primary:hover {
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4), 0 0 24px rgba(99, 102, 241, 0.25) !important;
  }

  .ant-progress-bg {
    border-radius: 4px !important;
  }

  .ant-tag {
    border-radius: 6px !important;
    padding: 2px 10px !important;
    font-weight: 500 !important;
  }

  .ant-badge-count {
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4) !important;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
  }
`;

if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = globalStyles;
  document.head.appendChild(styleElement);
}
