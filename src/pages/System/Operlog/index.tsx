import React, { useEffect, useRef, useState } from 'react';
import { useAccess, useIntl, FormattedMessage } from '@umijs/max';
import type { FormInstance } from 'antd';
import { Button, message } from 'antd';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { DownloadOutlined } from '@ant-design/icons';
import { getOperlogList, exportOperlog } from '@/services/monitor/operlog';
import { getDictValueEnum } from '@/services/system/dict';

const handleExport = async (params?: API.Monitor.OperlogListParams) => {
  const hide = message.loading('正在导出');
  try {
    await exportOperlog(params);
    hide();
    message.success('导出成功');
    return true;
  } catch (error) {
    hide();
    message.error('导出失败，请重试');
    return false;
  }
};

const OperlogTableList: React.FC = () => {
  const formTableRef = useRef<FormInstance>();
  const actionRef = useRef<ActionType>();
  const access = useAccess();
  const intl = useIntl();
  const [statusOptions, setStatusOptions] = useState<any>([]);

  useEffect(() => {
    getDictValueEnum('sys_common_status', true).then((data) => {
      setStatusOptions(data);
    });
  }, []);

  const columns: ProColumns<API.Monitor.Operlog>[] = [
    {
      title: <FormattedMessage id="monitor.operlog.oper_id" defaultMessage="日志ID" />,
      dataIndex: 'id',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="monitor.operlog.title" defaultMessage="操作模块" />,
      dataIndex: 'type',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="monitor.operlog.business_type" defaultMessage="业务类型" />,
      dataIndex: 'subType',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="monitor.operlog.action" defaultMessage="详细操作" />,
      dataIndex: 'action',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="monitor.operlog.request_method" defaultMessage="请求方式" />,
      dataIndex: 'requestMethod',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="monitor.operlog.oper_name" defaultMessage="操作人员" />,
      dataIndex: 'userName',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="monitor.operlog.oper_name" defaultMessage="操作人员" />,
      hideInTable: true,
      dataIndex: 'nickname',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="monitor.operlog.oper_ip" defaultMessage="主机地址" />,
      dataIndex: 'userIp',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="monitor.operlog.status" defaultMessage="操作状态" />,
      dataIndex: 'isFail',
      valueType: 'select',
      valueEnum:
        Object.keys(statusOptions || {}).length > 0
          ? statusOptions
          : {
              0: { text: '成功', status: 'Success' },
              1: { text: '失败', status: 'Error' },
            },
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="monitor.operlog.oper_time" defaultMessage="操作时间" />,
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
    },
  ];

  return (
    <PageContainer>
      <div style={{ width: '100%', float: 'right' }}>
        <ProTable<API.Monitor.Operlog>
          headerTitle={intl.formatMessage({
            id: 'pages.searchTable.title',
            defaultMessage: '信息',
          })}
          actionRef={actionRef}
          formRef={formTableRef}
          rowKey="id"
          key="operlogList"
          search={{
            labelWidth: 120,
          }}
          toolBarRender={() => [
            <Button
              type="primary"
              key="export"
              onClick={async () => {
                const params = formTableRef.current?.getFieldsValue?.();
                await handleExport(params as API.Monitor.OperlogListParams);
              }}
            >
              <DownloadOutlined />
              <FormattedMessage id="pages.searchTable.export" defaultMessage="导出" />
            </Button>,
          ]}
          request={(params) =>
            getOperlogList({ ...params } as API.Monitor.OperlogListParams).then((res: any) => ({
              data: res.data?.list || [],
              total: res.data?.total || 0,
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

export default OperlogTableList;
