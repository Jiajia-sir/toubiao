import React, { useEffect, useRef, useState } from 'react';
import { useAccess, useIntl, FormattedMessage } from '@umijs/max';
import type { FormInstance } from 'antd';
import { Button, message } from 'antd';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { DownloadOutlined } from '@ant-design/icons';
import { getOperlogList, exportOperlog } from '@/services/monitor/operlog';
import { getDictValueEnum } from '@/services/system/dict';
import DictTag from '@/components/DictTag';

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

  const [businessTypeOptions, setBusinessTypeOptions] = useState<any>([]);
  const [operatorTypeOptions, setOperatorTypeOptions] = useState<any>([]);
  const [statusOptions, setStatusOptions] = useState<any>([]);

  useEffect(() => {
    getDictValueEnum('sys_oper_type', true).then((data) => {
      setBusinessTypeOptions(data);
    });
    getDictValueEnum('sys_oper_type', true).then((data) => {
      setOperatorTypeOptions(data);
    });
    getDictValueEnum('sys_common_status', true).then((data) => {
      setStatusOptions(data);
    });
  }, []);

  const columns: ProColumns<API.Monitor.Operlog>[] = [
    {
      title: <FormattedMessage id="monitor.operlog.oper_id" defaultMessage="日志主键" />,
      dataIndex: 'operId',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="monitor.operlog.title" defaultMessage="操作模块" />,
      dataIndex: 'title',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="monitor.operlog.business_type" defaultMessage="业务类型" />,
      dataIndex: 'businessType',
      valueType: 'select',
      valueEnum: businessTypeOptions,
      render: (_, record) => <DictTag enums={businessTypeOptions} value={record.businessType} />,
    },
    {
      title: <FormattedMessage id="monitor.operlog.request_method" defaultMessage="请求方式" />,
      dataIndex: 'requestMethod',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="monitor.operlog.operator_type" defaultMessage="操作类别" />,
      dataIndex: 'operatorType',
      valueType: 'select',
      valueEnum: operatorTypeOptions,
      render: (_, record) => <DictTag enums={operatorTypeOptions} value={record.operatorType} />,
    },
    {
      title: <FormattedMessage id="monitor.operlog.oper_name" defaultMessage="操作人员" />,
      dataIndex: 'operName',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="monitor.operlog.oper_ip" defaultMessage="主机地址" />,
      dataIndex: 'operIp',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="monitor.operlog.oper_location" defaultMessage="操作地点" />,
      dataIndex: 'operLocation',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="monitor.operlog.status" defaultMessage="操作状态" />,
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusOptions,
      render: (_, record) => <DictTag key="status" enums={statusOptions} value={record.status} />,
    },
    {
      title: <FormattedMessage id="monitor.operlog.oper_time" defaultMessage="操作时间" />,
      dataIndex: 'operTime',
      valueType: 'dateTime',
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
          rowKey="operId"
          key="operlogList"
          search={{
            labelWidth: 120,
          }}
          toolBarRender={() => [
            <Button
              type="primary"
              key="export"
              hidden={!access.hasPerms('system:operlog:export')}
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
            getOperlogList({ ...params } as API.Monitor.OperlogListParams).then((res) => ({
              data: res.rows,
              total: res.total,
              success: true,
            }))
          }
          columns={columns}
        />
      </div>
    </PageContainer>
  );
};

export default OperlogTableList;
