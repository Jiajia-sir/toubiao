'use client';

import React, { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import type { FormInstance } from 'antd';
import { Button, Space, Tag, Typography, message, theme } from 'antd';
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SyncOutlined, UserOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import {
  getGraphEntityOpLogPage,
  type GraphEntityOpLogItem,
  type GraphOpLogAction,
  type GraphOpLogWay,
} from '@/services/biz/graph-op-log';

type ActionFilterValue = GraphOpLogAction | 'all';
type WayFilterValue = GraphOpLogWay | 'all';

interface GraphOpLogRecord {
  id: string;
  action: GraphOpLogAction | 'unknown';
  way: GraphOpLogWay | 'unknown';
  operatorName: string;
  entityName: string;
  entityType: string;
  documentName: string;
  summary: string;
  createTime: string | number | undefined;
}

const actionMeta: Record<GraphOpLogRecord['action'], { label: string; color: string; icon: ReactNode }> = {
  create: { label: '新增', color: '#15803d', icon: <PlusOutlined /> },
  update: { label: '更新', color: '#2563eb', icon: <SyncOutlined /> },
  delete: { label: '删除', color: '#dc2626', icon: <DeleteOutlined /> },
  unknown: { label: '未知', color: '#64748b', icon: null },
};

const wayMeta: Record<GraphOpLogRecord['way'], { label: string; color: string }> = {
  auto_read: { label: '自动读取', color: 'blue' },
  front_upload: { label: '页面上传', color: 'gold' },
  unknown: { label: '未识别', color: 'default' },
};

const actionValueEnum = {
  all: { text: '全部' },
  create: { text: '新增' },
  update: { text: '更新' },
  delete: { text: '删除' },
};

const wayValueEnum = {
  all: { text: '全部' },
  auto_read: { text: '自动读取' },
  front_upload: { text: '页面上传' },
};

function formatDateTime(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '-';
  }

  const numericValue = Number(raw);
  if (Number.isFinite(numericValue)) {
    const timestamp = raw.length === 10 ? numericValue * 1000 : numericValue;
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
    }
  }

  const parsed = dayjs(raw);
  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD HH:mm:ss');
  }

  return raw;
}

function toDateRange(value: any): string[] | undefined {
  if (!Array.isArray(value) || value.length !== 2) {
    return undefined;
  }

  const range = value
    .map((item, index) => {
      if (!item) {
        return undefined;
      }
      if (typeof item.format === 'function') {
        return item.format('YYYY-MM-DD HH:mm:ss');
      }
      if (typeof item === 'string') {
        return item.includes(' ')
          ? item
          : `${item} ${index === 0 ? '00:00:00' : '23:59:59'}`;
      }
      const numericValue = Number(item);
      if (Number.isFinite(numericValue)) {
        return dayjs(numericValue).format('YYYY-MM-DD HH:mm:ss');
      }
      return undefined;
    })
    .filter(Boolean);

  return range.length === 2 ? (range as string[]) : undefined;
}

function extractPageList(payload: any): GraphEntityOpLogItem[] {
  return payload?.data?.list || payload?.data?.records || payload?.rows || payload?.list || payload?.data || [];
}

function extractPageTotal(payload: any): number {
  return Number(payload?.data?.total ?? payload?.total ?? 0);
}

function getTextValue(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function normalizeAction(value: any): GraphOpLogRecord['action'] {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'create' || text === 'update' || text === 'delete') {
    return text;
  }
  return 'unknown';
}

function normalizeWay(value: any): GraphOpLogRecord['way'] {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'auto_read' || text === 'front_upload') {
    return text;
  }
  return 'unknown';
}

function normalizeRecord(item: GraphEntityOpLogItem, index: number): GraphOpLogRecord {
  return {
    id: getTextValue(item.id, item.logId, item.opLogId, index + 1),
    action: normalizeAction(item.action ?? item.actionType ?? item.opType),
    way: normalizeWay(item.way ?? item.sourceWay ?? item.accessMode),
    operatorName: getTextValue(item.operatorName, item.userName, item.nickName, item.createBy, '-'),
    entityName: getTextValue(item.entityName, item.nodeName, item.name, item.headName, item.tailName),
    entityType: getTextValue(item.entityType, item.nodeType, item.type),
    documentName: getTextValue(item.documentName, item.docName, item.fileName),
    summary: getTextValue(item.summary, item.content, item.description, item.remark, item.opDesc, item.detail),
    createTime: item.createTime ?? item.operateTime ?? item.opTime,
  };
}

const GraphOperationLogPage: React.FC = () => {
  const formRef = useRef<FormInstance>();
  const actionRef = useRef<ActionType>();
  const { token } = theme.useToken();

  const columns: ProColumns<GraphOpLogRecord>[] = [
    {
      title: '序号',
      dataIndex: 'id',
      hideInSearch: true,
      width: 88,
      render: (_dom, _record, index, action) => {
        const current = action?.pageInfo?.current || 1;
        const pageSize = action?.pageInfo?.pageSize || 10;
        return <span>{(current - 1) * pageSize + index + 1}</span>;
      },
    },
    {
      title: '来源类型',
      dataIndex: 'way',
      valueType: 'select',
      valueEnum: wayValueEnum,
      fieldProps: {
        placeholder: '请选择来源类型',
      },
      render: (_, record) => {
        const meta = wayMeta[record.way];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      valueType: 'select',
      valueEnum: actionValueEnum,
      fieldProps: {
        placeholder: '请选择操作类型',
      },
      render: (_, record) => {
        const meta = actionMeta[record.action];
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: meta.color,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: '20px',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: meta.color,
                flexShrink: 0,
              }}
            />
            {meta.label}
          </span>
        );
      },
    },
    {
      title: '操作人',
      dataIndex: 'operatorName',
      valueType: 'text',
      fieldProps: {
        placeholder: '请输入操作人',
      },
      render: (_, record) => (
        <Space size={6}>
          <UserOutlined style={{ color: token.colorTextDescription }} />
          <span>{record.operatorName || '-'}</span>
        </Space>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => (
        <Typography.Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, tooltip: record.summary }}>
          {record.summary || '-'}
        </Typography.Paragraph>
      ),
    },
    {
      title: '操作时间',
      dataIndex: 'createTime',
      valueType: 'dateRange',
      fieldProps: {
        showTime: true,
        format: 'YYYY-MM-DD HH:mm:ss',
      },
      search: {
        transform: (value) => ({
          createTime: toDateRange(value),
        }),
      },
      hideInTable: true,
    },
    {
      title: '操作时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
      render: (_, record) => formatDateTime(record.createTime),
    },
  ];

  return (
    <PageContainer>
      <ProTable<GraphOpLogRecord>
        headerTitle="信息"
        actionRef={actionRef}
        formRef={formRef}
        rowKey="id"
        key="graphOperationLogList"
        search={{ labelWidth: 110 }}
        pagination={{
          pageSize: 10,
          pageSizeOptions: ['10', '20', '50'],
          showSizeChanger: true,
        }}
        toolBarRender={() => [
          <Button
            key="refresh"
            onClick={() => {
              actionRef.current?.reload();
            }}
          >
            <ReloadOutlined />
            刷新
          </Button>,
        ]}
        request={async (params) => {
          try {
            const response: any = await getGraphEntityOpLogPage({
              pageNo: Number(params.current || 1),
              pageSize: Number(params.pageSize || 10),
              way:
                params.way && params.way !== 'all' ? (params.way as GraphOpLogWay) : undefined,
              action:
                params.action && params.action !== 'all'
                  ? (params.action as GraphOpLogAction)
                  : undefined,
              operatorName: params.operatorName ? String(params.operatorName).trim() : undefined,
              createTime: toDateRange(params.createTime),
            });

            const list = extractPageList(response).map((item, index) =>
              normalizeRecord(item, (Number(params.current || 1) - 1) * Number(params.pageSize || 10) + index),
            );

            return {
              data: list,
              total: extractPageTotal(response),
              success: true,
            };
          } catch (error) {
            console.error(error);
            message.error('获取知识图谱操作记录失败');
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
        columns={columns}
      />

      <style>{`
        .ant-pro-page-container .ant-pro-page-container-warp-page-header {
          background: #fff;
        }
      `}</style>
    </PageContainer>
  );
};

export default GraphOperationLogPage;
