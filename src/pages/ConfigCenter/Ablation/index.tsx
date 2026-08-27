'use client';

import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Segmented,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LoadingOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Dragger } = Upload;

type PageTab = 'result' | 'group';
type ResultFilter = 'all' | 'matched' | 'unmatched';

interface OverviewMetric {
  key: string;
  label: string;
  value: string;
}

interface UploadedFileItem {
  key: string;
  name: string;
  size: string;
  count: number;
  status: 'done' | 'processing';
}

interface ResultRow {
  key: string;
  rawWord: string;
  frequency: number;
  normalizedWord?: string;
  sourceFile: string;
  status: 'matched' | 'unmatched';
}

interface GroupRow {
  key: string;
  standardWord: string;
  hitCount: number;
  aliases: string[];
  enabled: boolean;
}

const overviewMetrics: OverviewMetric[] = [
  { key: 'files', label: '已处理文件', value: '3' },
  { key: 'terms', label: '原词总数', value: '8,139' },
  { key: 'matched', label: '已消歧词条', value: '6,842' },
  { key: 'unmatched', label: '未匹配词条', value: '21' },
];

const uploadedFilesSeed: UploadedFileItem[] = [
  { key: '1', name: '行业报告_202501.txt', size: '128 KB', count: 1842, status: 'done' },
  { key: '2', name: '产品评论汇总.csv', size: '412 KB', count: 5310, status: 'done' },
  { key: '3', name: '客服对话记录.json', size: '96 KB', count: 987, status: 'processing' },
];

const resultSeed: ResultRow[] = [
  { key: '1', rawWord: '苹果公司', frequency: 132, normalizedWord: 'Apple', sourceFile: '行业报告_202501.txt', status: 'matched' },
  { key: '2', rawWord: '苹果', frequency: 47, normalizedWord: 'Apple', sourceFile: '产品评论汇总.csv', status: 'matched' },
  { key: '3', rawWord: 'apple inc', frequency: 21, normalizedWord: 'Apple', sourceFile: '行业报告_202501.txt', status: 'matched' },
  { key: '4', rawWord: '人工智能', frequency: 305, normalizedWord: 'AI', sourceFile: '行业报告_202501.txt', status: 'matched' },
  { key: '5', rawWord: '机器智能', frequency: 18, normalizedWord: 'AI', sourceFile: '客服对话记录.json', status: 'matched' },
  { key: '6', rawWord: '计算机', frequency: 88, normalizedWord: '电脑', sourceFile: '产品评论汇总.csv', status: 'matched' },
  { key: '7', rawWord: 'PC', frequency: 64, normalizedWord: '电脑', sourceFile: '产品评论汇总.csv', status: 'matched' },
  { key: '8', rawWord: '大语言模型', frequency: 156, normalizedWord: 'LLM', sourceFile: '行业报告_202501.txt', status: 'matched' },
  { key: '9', rawWord: '区块链技术', frequency: 12, sourceFile: '客服对话记录.json', status: 'unmatched' },
  { key: '10', rawWord: '元宇宙', frequency: 9, sourceFile: '产品评论汇总.csv', status: 'unmatched' },
];

const groupSeed: GroupRow[] = [
  { key: '1', standardWord: 'Apple', hitCount: 200, aliases: ['苹果公司', '苹果', 'apple inc', '苹果'], enabled: true },
  { key: '2', standardWord: 'AI', hitCount: 323, aliases: ['人工智能', '机器智能', '人工智慧'], enabled: true },
  { key: '3', standardWord: '电脑', hitCount: 152, aliases: ['计算机', 'PC', '个人电脑'], enabled: true },
  { key: '4', standardWord: 'LLM', hitCount: 156, aliases: ['大语言模型', '大模型', '语言模型'], enabled: false },
];

const pageCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: '1px solid #eef2f7',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
};

const sectionCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '1px solid #e9edf5',
  boxShadow: '0 6px 20px rgba(15, 23, 42, 0.03)',
};

export default function AblationIndexPage() {
  const [activeTab, setActiveTab] = useState<PageTab>('result');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [searchValue, setSearchValue] = useState('');
  const [groups, setGroups] = useState<GroupRow[]>(groupSeed);

  const filteredResults = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return resultSeed.filter((item) => {
      const matchesStatus =
        resultFilter === 'all' ||
        (resultFilter === 'matched' && item.status === 'matched') ||
        (resultFilter === 'unmatched' && item.status === 'unmatched');

      if (!matchesStatus) return false;
      if (!keyword) return true;

      return [item.rawWord, item.normalizedWord, item.sourceFile]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [resultFilter, searchValue]);

  const matchedCount = resultSeed.filter((item) => item.status === 'matched').length;
  const unmatchedCount = resultSeed.filter((item) => item.status === 'unmatched').length;

  const resultColumns: ColumnsType<ResultRow> = [
    {
      title: '原词',
      dataIndex: 'rawWord',
      key: 'rawWord',
      render: (value: string) => <span style={{ fontWeight: 600, color: '#1f2937' }}>{value}</span>,
    },
    {
      title: '出现次数',
      dataIndex: 'frequency',
      key: 'frequency',
      width: 120,
      align: 'right',
      render: (value: number) => <span style={{ color: '#6b7280' }}>{value}</span>,
    },
    {
      title: '消歧后标准词',
      dataIndex: 'normalizedWord',
      key: 'normalizedWord',
      width: 180,
      render: (value?: string) =>
        value ? (
          <Space size={8}>
            <span style={{ color: '#7c8aa5' }}>→</span>
            <span style={{ fontWeight: 600, color: '#23408e' }}>{value}</span>
          </Space>
        ) : (
          <span style={{ color: '#9ca3af' }}>-</span>
        ),
    },
    {
      title: '来源文件',
      dataIndex: 'sourceFile',
      key: 'sourceFile',
      width: 200,
      render: (value: string) => <span style={{ color: '#6b7280' }}>{value}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (value: ResultRow['status']) =>
        value === 'matched' ? (
          <Tag
            style={{
              marginInlineEnd: 0,
              borderRadius: 999,
              paddingInline: 10,
              color: '#3b6dd8',
              background: '#edf3ff',
              border: 'none',
            }}
          >
            已消歧
          </Tag>
        ) : (
          <Tag
            style={{
              marginInlineEnd: 0,
              borderRadius: 999,
              paddingInline: 10,
              color: '#8b7355',
              background: '#f5efe7',
              border: 'none',
            }}
          >
            未匹配
          </Tag>
        ),
    },
  ];

  const uploadProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    beforeUpload: () => false,
  };

  return (
    <div style={{ background: '#f6f8fc', minHeight: 'calc(100vh - 120px)', padding: 24 }}>
      <Card style={pageCardStyle} styles={{ body: { padding: 28 } }}>
        <Row gutter={[16, 16]}>
          {overviewMetrics.map((item) => (
            <Col xs={24} sm={12} xl={6} key={item.key}>
              <div
                style={{
                  minHeight: 116,
                  borderRadius: 18,
                  border: '1px solid #e9edf5',
                  background: '#fff',
                  padding: '22px 16px',
                }}
              >
                <div style={{ color: '#8a94a6', fontSize: 14, marginBottom: 8 }}>{item.label}</div>
                <div style={{ color: '#111827', fontSize: 22, fontWeight: 700, letterSpacing: 0.3 }}>
                  {item.value}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        <div style={{ marginTop: 20, marginBottom: 24 }}>
          <Segmented<PageTab>
            value={activeTab}
            onChange={(value) => setActiveTab(value)}
            options={[
              {
                value: 'result',
                label: (
                  <Space size={8}>
                    <ApartmentOutlined />
                    <span>文件消歧</span>
                  </Space>
                ),
              },
              {
                value: 'group',
                label: (
                  <Space size={8}>
                    <PlusOutlined />
                    <span>消歧词组配置</span>
                  </Space>
                ),
              },
            ]}
            style={{
              padding: 4,
              background: '#f1f3f7',
              borderRadius: 14,
            }}
          />
        </div>

        {activeTab === 'result' ? (
          <Row gutter={[20, 20]} align="stretch">
            <Col xs={24} xl={8}>
              <div style={{ height: '100%' }}>
                <div
                  style={{
                    borderRadius: 18,
                    border: '1px dashed #d7ddeb',
                    background: '#fff',
                    padding: '34px 24px',
                    textAlign: 'center',
                  }}
                >
                  <Dragger {...uploadProps} style={{ padding: 0, border: 'none', background: 'transparent' }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        margin: '0 auto 18px',
                        borderRadius: '50%',
                        background: '#eef3ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4a73db',
                        fontSize: 24,
                      }}
                    >
                      <CloudUploadOutlined />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 10 }}>
                      拖拽文件到此处，或点击上传
                    </div>
                    <div style={{ color: '#8a94a6', marginBottom: 18 }}>
                      支持 .txt / .csv / .json / .docx，单批最多 20 个文件
                    </div>
                    <Button type="primary" size="large" style={{ minWidth: 116 }}>
                      选择文件
                    </Button>
                  </Dragger>
                </div>

                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <Text style={{ color: '#4b5563', fontWeight: 600 }}>本批文件（3）</Text>
                    <Button type="link" style={{ paddingInline: 0, color: '#8a94a6' }}>
                      清空列表
                    </Button>
                  </div>

                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {uploadedFilesSeed.map((item) => (
                      <div
                        key={item.key}
                        style={{
                          borderRadius: 16,
                          border: '1px solid #e9edf5',
                          background: '#fff',
                          padding: '16px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <Space align="start" size={12}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: '#f5f7fb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#7b8798',
                            }}
                          >
                            <FileTextOutlined />
                          </div>
                          <div>
                            <div style={{ color: '#1f2937', fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
                            <div style={{ color: '#8a94a6', fontSize: 13 }}>
                              {item.size} · {item.count.toLocaleString()} 词条
                            </div>
                          </div>
                        </Space>

                        <Space size={6}>
                          {item.status === 'done' ? (
                            <>
                              <span style={{ color: '#4a73db', fontSize: 14 }}>◌</span>
                              <span style={{ color: '#6b7280' }}>已完成</span>
                            </>
                          ) : (
                            <>
                              <LoadingOutlined style={{ color: '#6b7280' }} />
                              <span style={{ color: '#6b7280' }}>处理中</span>
                            </>
                          )}
                        </Space>
                      </div>
                    ))}
                  </Space>
                </div>
              </div>
            </Col>

            <Col xs={24} xl={16}>
              <Card style={sectionCardStyle} styles={{ body: { padding: 18 } }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    marginBottom: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>
                      消歧结果
                    </div>
                    <div style={{ color: '#8a94a6' }}>原词经过词组规则映射后的标准词对照</div>
                  </div>
                  <Button icon={<DownloadOutlined />} style={{ borderRadius: 10 }}>
                    导出结果
                  </Button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <Segmented<ResultFilter>
                    value={resultFilter}
                    onChange={(value) => setResultFilter(value)}
                    options={[
                      { value: 'all', label: `全部 ${resultSeed.length}` },
                      { value: 'matched', label: `已消歧 ${matchedCount}` },
                      { value: 'unmatched', label: `未匹配 ${unmatchedCount}` },
                    ]}
                    style={{ padding: 4, background: '#f3f4f6', borderRadius: 12 }}
                  />

                  <Input
                    allowClear
                    prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="搜索原词或标准词"
                    style={{ width: 280, maxWidth: '100%', borderRadius: 10 }}
                  />
                </div>

                <Table<ResultRow>
                  columns={resultColumns}
                  dataSource={filteredResults}
                  pagination={false}
                  rowKey="key"
                  scroll={{ x: 720 }}
                  style={{ borderRadius: 14, overflow: 'hidden' }}
                />
              </Card>
            </Col>
          </Row>
        ) : (
          <Card style={sectionCardStyle} styles={{ body: { padding: 20 } }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>消歧词组配置</div>
            <div style={{ color: '#8a94a6', marginBottom: 18 }}>
              配置「标准词 → 别名」映射规则，后续上传的文件将自动按此规则消歧
            </div>

            <div
              style={{
                marginBottom: 16,
                borderRadius: 12,
                background: '#f4f7fd',
                border: '1px solid #e7edf8',
                color: '#7b8798',
                padding: '10px 14px',
              }}
            >
              启用的词组会在文件处理阶段生效。命中任一别名的词条都会被归一化为对应标准词。
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >
              <Input
                placeholder="输入新的标准词，如 Apple"
                style={{ flex: '1 1 480px', minWidth: 280, borderRadius: 10 }}
              />
              <Button type="primary" icon={<PlusOutlined />} size="large" style={{ borderRadius: 10 }}>
                新增词组
              </Button>
            </div>

            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              {groups.map((group) => (
                <div
                  key={group.key}
                  style={{
                    borderRadius: 16,
                    border: '1px solid #e9edf5',
                    background: '#fff',
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <Space size={12} wrap>
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            border: 'none',
                            borderRadius: 10,
                            background: '#edf3ff',
                            color: '#3b6dd8',
                            fontWeight: 700,
                            padding: '6px 10px',
                          }}
                        >
                          {group.standardWord}
                        </Tag>
                        <Text style={{ color: '#8a94a6' }}>命中 {group.hitCount} 次</Text>
                      </Space>

                      <Space size={[8, 8]} wrap style={{ marginTop: 12 }}>
                        {group.aliases.map((alias) => (
                          <Tag
                            key={alias}
                            closable
                            style={{
                              marginInlineEnd: 0,
                              borderRadius: 999,
                              background: '#fff',
                              border: '1px solid #e6eaf2',
                              paddingInline: 10,
                            }}
                          >
                            {alias}
                          </Tag>
                        ))}
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            borderRadius: 999,
                            background: '#fff',
                            border: '1px dashed #d7ddeb',
                            paddingInline: 10,
                            color: '#6b7280',
                          }}
                        >
                          ＋ 添加别名
                        </Tag>
                      </Space>
                    </div>

                    <Space size={14}>
                      <Space size={8}>
                        <Text style={{ color: '#8a94a6' }}>{group.enabled ? '已启用' : '已停用'}</Text>
                        <Switch
                          checked={group.enabled}
                          onChange={(checked) => {
                            setGroups((current) =>
                              current.map((item) =>
                                item.key === group.key ? { ...item, enabled: checked } : item,
                              ),
                            );
                          }}
                        />
                      </Space>
                      <Button type="text" icon={<DeleteOutlined />} style={{ color: '#8a94a6' }} />
                    </Space>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        )}
      </Card>
    </div>
  );
}
