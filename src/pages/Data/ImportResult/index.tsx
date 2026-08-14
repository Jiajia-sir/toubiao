import { useEffect, useMemo, useState } from 'react';
import { history, useLocation } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Statistic,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  getImportRecordPage,
  getImportTaskPage,
  getImportTaskResult,
  physicalDeleteImportRecord,
  physicalDeleteImportRecordBatch,
  type ImportTaskResult,
} from '@/services/biz/structured-import';
import { formatDateTime } from '@/utils/date';

const { Text, Paragraph } = Typography;
const PAGE_SIZE = 20;

function extractList(payload: any) {
  return payload?.data?.list || payload?.list || [];
}
function extractTotal(payload: any) {
  return Number(payload?.data?.total || payload?.total || 0);
}
function extractData(payload: any) {
  return payload?.data ?? payload;
}

function formatBytes(bytes?: number) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function parsePayload(payload?: string) {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function formatPayloadValue(value: any) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildPayloadSummary(payload?: string) {
  const parsed = parsePayload(payload);
  if (!parsed) return payload || '-';

  return Object.entries(parsed)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${formatPayloadValue(value)}`)
    .join(' | ');
}

/**
 * 导入结果工作台（独立页面）。
 * 用于核对 Bronze 落地明细，并支持单条/批量物理删除纠错。
 */
export default function ImportResultPage() {
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initTaskId = query.get('taskId') ? Number(query.get('taskId')) : undefined;
  const initDataSourceId = query.get('dataSourceId') ? Number(query.get('dataSourceId')) : undefined;

  const [taskOptions, setTaskOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [taskId, setTaskId] = useState<number | undefined>(initTaskId);
  const [taskResult, setTaskResult] = useState<ImportTaskResult | null>(null);
  const [objectName, setObjectName] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [payloadPreviewRecord, setPayloadPreviewRecord] = useState<any | null>(null);

  const loadTasks = async () => {
    const res: any = await getImportTaskPage({
      pageNo: 1,
      pageSize: 100,
      dataSourceId: initDataSourceId || undefined,
    });
    const list = extractList(res);
    setTaskOptions(list.map((item: any) => ({
      label: String(item.name) + " / " + String(item.sourceType || "-") + " (#" + String(item.id) + ")",
      value: Number(item.id),
    })));
    if (!taskId && list[0]?.id) {
      setTaskId(Number(list[0].id));
    }
  };

  const loadResult = async (id?: number) => {
    if (!id) {
      setTaskResult(null);
      return;
    }
    const res: any = await getImportTaskResult(id);
    setTaskResult(extractData(res));
  };

  const loadRecords = async (targetPage = page) => {
    if (!taskId) {
      setRows([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res: any = await getImportRecordPage({
        pageNo: targetPage,
        pageSize: PAGE_SIZE,
        taskId,
        objectName: objectName || undefined,
      });
      let list = extractList(res);
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        list = list.filter((item: any) =>
          String(item.payloadJson || '').toLowerCase().includes(kw)
          || String(item.recordKey || '').toLowerCase().includes(kw)
          || String(item.objectName || '').toLowerCase().includes(kw),
        );
      }
      setRows(list);
      setTotal(extractTotal(res));
    } catch (e) {
      console.error(e);
      message.error('加载导入记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks().catch(console.error);
  }, []);

  useEffect(() => {
    if (!taskId) return;
    setPage(1);
    setSelectedRowKeys([]);
    loadResult(taskId).catch(console.error);
    loadRecords(1).catch(console.error);
  }, [taskId, objectName]);

  useEffect(() => {
    loadRecords(page).catch(console.error);
  }, [page]);

  const handleDeleteOne = async (id: number) => {
    try {
      await physicalDeleteImportRecord(id);
      message.success('已物理删除');
      await loadResult(taskId);
      await loadRecords(page);
    } catch (e) {
      console.error(e);
      message.error('删除失败');
    }
  };

  const handleDeleteBatch = async () => {
    if (!selectedRowKeys.length) {
      message.warning('请先勾选记录');
      return;
    }
    try {
      await physicalDeleteImportRecordBatch(selectedRowKeys as number[]);
      message.success(`已物理删除 ${selectedRowKeys.length} 条`);
      setSelectedRowKeys([]);
      await loadResult(taskId);
      await loadRecords(page);
    } catch (e) {
      console.error(e);
      message.error('批量删除失败');
    }
  };

  const columns: ColumnsType<any> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '对象', dataIndex: 'objectName', width: 180, ellipsis: true },
    { title: '类型', dataIndex: 'objectKind', width: 90 },
    { title: '记录键', dataIndex: 'recordKey', width: 160, ellipsis: true },
    {
      title: 'Payload',
      dataIndex: 'payloadJson',
      ellipsis: true,
      width: 320,
      render: (value: string, record) => {
        const parsed = parsePayload(value);
        const entries = parsed ? Object.entries(parsed).slice(0, 3) : [];
        return (
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            {parsed ? (
              <>
                <Space size={[4, 4]} wrap>
                  {entries.map(([key, itemValue]) => (
                    <Tag key={key} style={{ marginInlineEnd: 0 }}>
                      {key}: {formatPayloadValue(itemValue)}
                    </Tag>
                  ))}
                  {Object.keys(parsed).length > 3 ? (
                    <Tag style={{ marginInlineEnd: 0 }}>+{Object.keys(parsed).length - 3}</Tag>
                  ) : null}
                </Space>
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setPayloadPreviewRecord(record)}>
                  查看详情
                </Button>
              </>
            ) : (
              <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {buildPayloadSummary(value)}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '抽取时间',
      dataIndex: 'extractedAt',
      width: 170,
      render: (value: string | number | null) => formatDateTime(value, '-'),
    },
    { title: 'Run', dataIndex: 'runId', width: 80 },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Popconfirm title="确认物理删除该条记录？不可恢复" onConfirm={() => handleDeleteOne(record.id)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <div>
            <Text strong style={{ fontSize: 18 }}>导入结果工作台</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              查看 Bronze 落地明细，支持单条/批量物理删除。删除后不可恢复。
            </Paragraph>
          </div>
          <Button onClick={() => history.push('/data/source')}>返回数据源</Button>
        </Space>
      </Card>

      <Card bordered={false}>
        <Row gutter={16}>
          <Col xs={24} md={10}>
            <Text type="secondary">导入任务</Text>
            <Select
              style={{ width: '100%', marginTop: 6 }}
              showSearch
              optionFilterProp="label"
              placeholder="选择导入任务"
              options={taskOptions}
              value={taskId}
              onChange={(v) => setTaskId(v)}
            />
          </Col>
          <Col xs={24} md={6}>
            <Text type="secondary">对象过滤</Text>
            <Select
              allowClear
              style={{ width: '100%', marginTop: 6 }}
              placeholder="全部对象"
              value={objectName}
              onChange={(v) => setObjectName(v)}
              options={(taskResult?.objectStats || []).map((item) => ({
                label: `${item.objectName} (${item.recordCount || 0})`,
                value: item.objectName,
              }))}
            />
          </Col>
          <Col xs={24} md={5}>
            <Text type="secondary">关键字（本页过滤）</Text>
            <Input
              style={{ marginTop: 6 }}
              allowClear
              placeholder="payload / key"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => loadRecords(1)}
            />
          </Col>
          <Col xs={24} md={3}>
            <Text type="secondary">&nbsp;</Text>
            <Button style={{ width: '100%', marginTop: 6 }} onClick={() => { setPage(1); loadRecords(1); }}>
              刷新
            </Button>
          </Col>
        </Row>
      </Card>

      {taskResult && (
        <Card bordered={false}>
          <Descriptions size="small" bordered column={3}>
            <Descriptions.Item label="任务">{taskResult.taskName}</Descriptions.Item>
            <Descriptions.Item label="数据源">{taskResult.dataSourceName || taskResult.dataSourceId}</Descriptions.Item>
            <Descriptions.Item label="类型">{taskResult.sourceType || '-'}</Descriptions.Item>
            <Descriptions.Item label="最近状态">
              <Tag color={taskResult.lastRunStatus === 'SUCCESS' ? 'success' : 'default'}>
                {taskResult.lastRunStatus || '-'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="最近运行时间">
              {formatDateTime(taskResult.lastRunTime, '-')}
            </Descriptions.Item>
            <Descriptions.Item label="落地字节">{formatBytes(taskResult.lastByteCount)}</Descriptions.Item>
          </Descriptions>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}><Statistic title="累计落地条数" value={taskResult.totalRecordCount || 0} /></Col>
            <Col span={6}><Statistic title="最近读取" value={taskResult.lastReadCount || 0} /></Col>
            <Col span={6}><Statistic title="最近写入" value={taskResult.lastWriteCount || 0} /></Col>
            <Col span={6}><Statistic title="最近失败" value={taskResult.lastFailCount || 0} /></Col>
          </Row>
        </Card>
      )}

      <Card
        bordered={false}
        title="落地明细"
        extra={
          <Space>
            <Popconfirm
              title={`确认物理删除选中的 ${selectedRowKeys.length} 条？不可恢复`}
              disabled={!selectedRowKeys.length}
              onConfirm={handleDeleteBatch}
            >
              <Button danger disabled={!selectedRowKeys.length}>
                批量物理删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1200, y: 'calc(100vh - 420px)' }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          expandable={{
            expandedRowRender: (record) => (
              (() => {
                const parsed = parsePayload(record.payloadJson);
                return parsed ? (
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                    <Descriptions size="small" bordered column={2}>
                      {Object.entries(parsed).map(([key, value]) => (
                        <Descriptions.Item key={key} label={key}>
                          <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {formatPayloadValue(value)}
                          </Text>
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  </div>
                ) : (
                  <pre style={{ margin: 0, maxHeight: 280, overflow: 'auto', background: '#f8fafc', padding: 12 }}>
                    {record.payloadJson || ''}
                  </pre>
                );
              })()
            ),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: (p) => setPage(p),
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>
      <Modal
        open={!!payloadPreviewRecord}
        title={`Payload 详情${payloadPreviewRecord?.id ? ` #${payloadPreviewRecord.id}` : ''}`}
        footer={null}
        width={860}
        onCancel={() => setPayloadPreviewRecord(null)}
      >
        {payloadPreviewRecord ? (
          (() => {
            const parsed = parsePayload(payloadPreviewRecord.payloadJson);
            return parsed ? (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Descriptions size="small" bordered column={2}>
                  {Object.entries(parsed).map(([key, value]) => (
                    <Descriptions.Item key={key} label={key}>
                      <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {formatPayloadValue(value)}
                      </Text>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
                <Divider style={{ margin: 0 }}>原始 JSON</Divider>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: 320,
                    overflow: 'auto',
                    background: '#f8fafc',
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  {JSON.stringify(parsed, null, 2)}
                </pre>
              </Space>
            ) : (
              <pre
                style={{
                  margin: 0,
                  maxHeight: 420,
                  overflow: 'auto',
                  background: '#f8fafc',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                {payloadPreviewRecord.payloadJson || ''}
              </pre>
            );
          })()
        ) : null}
      </Modal>
    </Space>
  );
}
