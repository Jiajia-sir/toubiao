import React, { useRef } from 'react';
import { FormattedMessage, useAccess, useIntl } from '@umijs/max';
import type { FormInstance } from 'antd';
import { Button, message, theme } from 'antd';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { DownloadOutlined } from '@ant-design/icons';
import { getLogininforList, exportLogininfor } from '@/services/monitor/logininfor';
import DictTag from '@/components/DictTag';

const loginStatusOptions = {
  0: {
    label: '登录成功',
    key: '0',
    value: '0',
    text: '登录成功',
    status: 'success',
    listClass: 'success',
  },
  1: {
    label: '登录失败',
    key: '1',
    value: '1',
    text: '登录失败',
    status: 'error',
    listClass: 'danger',
  },
};

const loginTypeStyleMap: Record<string, { label: string }> = {
  '100': { label: '账号登录' },
  '200': { label: '主动登出' },
};

const formatDateTime = (value: unknown) => {
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
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const hours = `${date.getHours()}`.padStart(2, '0');
      const minutes = `${date.getMinutes()}`.padStart(2, '0');
      const seconds = `${date.getSeconds()}`.padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }

  return raw;
};

const toTimestampRange = (value: any) => {
  if (!Array.isArray(value) || value.length !== 2) {
    return undefined;
  }

  const range = value
    .map((item) => {
      if (!item) {
        return undefined;
      }
      if (typeof item?.valueOf === 'function') {
        return item.valueOf();
      }
      const numericValue = Number(item);
      return Number.isFinite(numericValue) ? numericValue : undefined;
    })
    .filter((item) => item !== undefined);

  return range.length === 2 ? range : undefined;
};

const normalizeStatusSearchValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  const raw = String(value);
  if (raw === '0') return '1';
  if (raw === '1') return '0';
  return raw;
};

const handleExport = async (params?: API.Monitor.LogininforListParams) => {
  const hide = message.loading('正在导出');
  try {
    await exportLogininfor(params);
    hide();
    message.success('导出成功');
    return true;
  } catch (error) {
    hide();
    message.error('导出失败，请重试');
    return false;
  }
};

const LogininforTableList: React.FC = () => {
  const formTableRef = useRef<FormInstance>();
  const actionRef = useRef<ActionType>();
  const access = useAccess();
  const intl = useIntl();
  const { token } = theme.useToken();

  const columns: ProColumns<API.Monitor.Logininfor>[] = [
    { title: '日志ID', dataIndex: 'infoId', valueType: 'text', hideInSearch: true },
    {
      title: '用户账号',
      dataIndex: 'username',
      valueType: 'text',
      render: (_, record) => {
        const userName = record.userName || record.username || '-';
        const userId = record.userId;
        if (userId === null || userId === undefined || userId === '') return userName;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
            <span>{userName}</span>
            <span style={{ fontSize: 12, color: token.colorTextDescription }}>ID: {userId}</span>
          </div>
        );
      },
    },
    {
      title: '日志类型',
      dataIndex: 'logType',
      valueType: 'text',
      hideInSearch: true,
      render: (_, record) => {
        const logType = String(record.logType ?? '');
        const typeStyle = loginTypeStyleMap[logType];
        if (!typeStyle) return String(record.logType ?? '-');
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: logType === '100' ? token.colorInfo : token.colorWarning,
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
                background: logType === '100' ? token.colorInfo : token.colorWarning,
                flexShrink: 0,
              }}
            />
            {typeStyle.label}
          </span>
        );
      },
    },
    {
      title: '链路追踪',
      dataIndex: 'traceId',
      valueType: 'text',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '登录IP地址',
      dataIndex: 'userIp',
      valueType: 'text',
      render: (_, record) => record.ipaddr || record.userIp,
    },
    {
      title: '登录状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: loginStatusOptions,
      render: (_, record) => {
        const statusValue = String(record.status ?? record.result ?? '1') === '0' ? '0' : '1';
        return <DictTag enums={loginStatusOptions} value={statusValue} />;
      },
    },
    {
      title: '浏览器类型',
      dataIndex: 'userAgent',
      valueType: 'text',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '登录时间',
      dataIndex: 'createTime',
      valueType: 'dateRange',
      hideInTable: true,
      fieldProps: {
        showTime: true,
        format: 'YYYY-MM-DD HH:mm:ss',
      },
      search: {
        transform: (value) => ({
          createTime: toTimestampRange(value),
        }),
      },
    },
    {
      title: '登录时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      render: (_, record) => formatDateTime(record.createTime || record.loginTime),
      hideInSearch: true,
    },
  ];

  return (
    <PageContainer>
      <div style={{ width: '100%', float: 'right' }}>
        <ProTable<API.Monitor.Logininfor>
          headerTitle={intl.formatMessage({
            id: 'pages.searchTable.title',
            defaultMessage: '信息',
          })}
          actionRef={actionRef}
          formRef={formTableRef}
          rowKey="infoId"
          key="logininforList"
          search={{ labelWidth: 120 }}
          toolBarRender={() => [
            <Button
              type="primary"
              key="export"
              onClick={async () => {
                const params = formTableRef.current?.getFieldsValue?.();
                await handleExport(params as API.Monitor.LogininforListParams);
              }}
            >
              <DownloadOutlined />
              <FormattedMessage id="pages.searchTable.export" defaultMessage="导出" />
            </Button>,
          ]}
          request={(params) =>
            getLogininforList({
              ...params,
              status: normalizeStatusSearchValue(params.status),
            } as API.Monitor.LogininforListParams).then((res) => ({
              data: res.rows,
              total: res.total,
              success: true,
            }))
          }
          columns={columns}
        />
      </div>
      <style>{`
        .ant-pro-page-container .ant-pro-page-container-warp-page-header {
          background: #fff;
        }
      `}</style>
    </PageContainer>
  );
};

export default LogininforTableList;
