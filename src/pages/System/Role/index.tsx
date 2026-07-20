import React, { useEffect, useRef, useState } from 'react';
import { useAccess, useIntl, FormattedMessage } from '@umijs/max';
import { DataNode } from 'antd/es/tree';
import { Button, FormInstance, message, Modal, Switch, Tag } from 'antd';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { DeleteOutlined, EditOutlined, ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import {
  addRole,
  assignRoleMenu,
  changeRoleStatus,
  exportRole,
  getRole,
  getRoleList,
  getRoleMenuList,
  removeRole,
  updateRole,
} from '@/services/system/role';
import { getDictValueEnum } from '@/services/system/dict';
import { getMenuTree } from '@/services/system/menu';
import { formatTreeData } from '@/utils/tree';
import UpdateForm from './edit';

const { confirm } = Modal;

const isSuccessCode = (code?: number) => code === 0 || code === 200 || typeof code === 'undefined';
const isBuiltinRole = (record?: Partial<API.System.Role>) => `${record?.type ?? ''}` === '1';

const formatDateTime = (value?: string | number | Date) => {
  if (value === null || typeof value === 'undefined' || value === '') {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (num: number) => `${num}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const handleAdd = async (fields: API.System.Role) => {
  const hide = message.loading('正在新增');
  try {
    const resp = await addRole({ ...fields });
    const roleId = resp?.data;
    if (isSuccessCode(resp.code) && roleId && Array.isArray((fields as any).menuIds)) {
      await assignRoleMenu({ roleId, menuIds: (fields as any).menuIds });
    }
    hide();
    if (isSuccessCode(resp.code)) {
      message.success('新增成功');
    } else {
      message.error(resp.msg || '新增失败');
    }
    return true;
  } catch (error) {
    hide();
    message.error('新增失败，请重试');
    return false;
  }
};

const handleUpdate = async (fields: API.System.Role) => {
  const hide = message.loading('正在更新');
  try {
    const resp = await updateRole(fields);
    if (isSuccessCode(resp.code) && fields.roleId && Array.isArray((fields as any).menuIds)) {
      await assignRoleMenu({ roleId: fields.roleId, menuIds: (fields as any).menuIds });
    }
    hide();
    if (isSuccessCode(resp.code)) {
      message.success('更新成功');
    } else {
      message.error(resp.msg || '更新失败');
    }
    return true;
  } catch (error) {
    hide();
    message.error('更新失败，请重试');
    return false;
  }
};

const handleRemove = async (selectedRows: API.System.Role[]) => {
  const builtinRows = selectedRows.filter((row) => isBuiltinRole(row));
  if (builtinRows.length > 0) {
    message.warning('内置角色不能删除');
    return false;
  }

  const hide = message.loading('正在删除');
  try {
    const resp = await removeRole(selectedRows.map((row) => row.roleId).join(','));
    hide();
    if (isSuccessCode(resp.code)) {
      message.success('删除成功');
    } else {
      message.error(resp.msg || '删除失败');
    }
    return true;
  } catch (error) {
    hide();
    message.error('删除失败，请重试');
    return false;
  }
};

const handleRemoveOne = async (selectedRow: API.System.Role) => {
  if (isBuiltinRole(selectedRow)) {
    message.warning('内置角色不能删除');
    return false;
  }

  const hide = message.loading('正在删除');
  try {
    const resp = await removeRole(`${selectedRow.roleId}`);
    hide();
    if (isSuccessCode(resp.code)) {
      message.success('删除成功');
    } else {
      message.error(resp.msg || '删除失败');
    }
    return true;
  } catch (error) {
    hide();
    message.error('删除失败，请重试');
    return false;
  }
};

const handleExport = async () => {
  const hide = message.loading('正在导出');
  try {
    await exportRole();
    hide();
    message.success('导出成功');
    return true;
  } catch (error) {
    hide();
    message.error('导出失败，请重试');
    return false;
  }
};

const RoleTableList: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const formTableRef = useRef<FormInstance>();
  const actionRef = useRef<ActionType>();

  const [modalVisible, setModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<API.System.Role>();
  const [selectedRows, setSelectedRows] = useState<API.System.Role[]>([]);
  const [menuTree, setMenuTree] = useState<DataNode[]>();
  const [menuIds, setMenuIds] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<any>([]);

  const access = useAccess();
  const intl = useIntl();

  useEffect(() => {
    getDictValueEnum('common_status').then((data) => {
      if (Object.keys(data || {}).length > 0) {
        setStatusOptions(data);
        return;
      }
      getDictValueEnum('sys_normal_disable').then((fallbackData) => {
        setStatusOptions(fallbackData);
      });
    });
  }, []);

  const showChangeStatusConfirm = (record: API.System.Role) => {
    if (isBuiltinRole(record)) {
      message.warning('内置角色不能修改状态');
      return;
    }

    const isEnabled = `${record.status}` === '0';
    const actionText = isEnabled ? '停用' : '启用';
    const newStatus = isEnabled ? '1' : '0';

    confirm({
      title: `确认要${actionText}${record.roleName}角色吗？`,
      onOk() {
        changeRoleStatus(record.roleId, newStatus).then((resp) => {
          if (isSuccessCode(resp.code)) {
            messageApi.open({
              type: 'success',
              content: '状态更新成功',
            });
            actionRef.current?.reload();
          } else {
            messageApi.open({
              type: 'error',
              content: resp.msg || '状态更新失败',
            });
          }
        });
      },
    });
  };

  const openEditModal = (record: API.System.Role) => {
    if (isBuiltinRole(record)) {
      message.warning('内置角色不能修改');
      return;
    }

    Promise.all([getMenuTree(), getRole(record.roleId), getRoleMenuList(record.roleId)]).then(
      ([menuResp, roleResp, roleMenuResp]) => {
        if (
          isSuccessCode(menuResp.code) &&
          isSuccessCode(roleResp.code) &&
          isSuccessCode(roleMenuResp.code)
        ) {
          setMenuTree(formatTreeData(menuResp.data || []));
          setMenuIds(((roleMenuResp.data || []) as number[]).map((item: number) => `${item}`));
          setModalVisible(true);
          setCurrentRow(roleResp.data || record);
        } else {
          message.warning(menuResp.msg || roleResp.msg || roleMenuResp.msg || '加载失败');
        }
      },
    );
  };

  const baseColumns: ProColumns<API.System.Role>[] = [
    {
      title: <FormattedMessage id="system.role.role_id" defaultMessage="角色编号" />,
      dataIndex: 'roleId',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="system.role.role_name" defaultMessage="角色名称" />,
      dataIndex: 'roleName',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="system.role.role_key" defaultMessage="权限字符" />,
      dataIndex: 'roleKey',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="system.role.role_sort" defaultMessage="显示顺序" />,
      dataIndex: 'roleSort',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: '角色类型',
      dataIndex: 'type',
      valueType: 'select',
      hideInSearch: true,
      valueEnum: {
        1: { text: '内置角色' },
        2: { text: '自定义角色' },
      },
      render: (_, record) =>
        isBuiltinRole(record) ? <Tag color="gold">内置角色</Tag> : <Tag color="blue">自定义角色</Tag>,
    },
    {
      title: <FormattedMessage id="system.role.status" defaultMessage="角色状态" />,
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusOptions,
      render: (_, record) => (
        <Switch
          checked={`${record.status}` === '0'}
          checkedChildren="启用"
          unCheckedChildren="停用"
          disabled={isBuiltinRole(record)}
          onClick={() => showChangeStatusConfirm(record)}
        />
      ),
    },
    {
      title: <FormattedMessage id="system.role.create_time" defaultMessage="创建时间" />,
      dataIndex: 'createTime',
      valueType: 'text',
      hideInSearch: true,
      render: (_, record) => <span>{formatDateTime(record.createTime)}</span>,
    },
    {
      title: <FormattedMessage id="pages.searchTable.titleOption" defaultMessage="操作" />,
      dataIndex: 'option',
      width: '160px',
      valueType: 'option',
      render: (_, record) => [
        <Button
          type="link"
          size="small"
          key="edit"
          icon={<EditOutlined />}
          hidden={!access.hasPerms('system:role:edit')}
          disabled={isBuiltinRole(record)}
          onClick={() => openEditModal(record)}
        >
          编辑
        </Button>,
        <Button
          type="link"
          size="small"
          danger
          key="batchRemove"
          icon={<DeleteOutlined />}
          hidden={!access.hasPerms('system:role:remove')}
          disabled={isBuiltinRole(record)}
          onClick={async () => {
            Modal.confirm({
              title: '删除',
              content: '确定删除该项吗？',
              okText: '确认',
              cancelText: '取消',
              onOk: async () => {
                const success = await handleRemoveOne(record);
                if (success) {
                  actionRef.current?.reload();
                }
              },
            });
          }}
        >
          删除
        </Button>,
      ],
    },
  ];

  const searchColumns: ProColumns<API.System.Role>[] = [
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTimeRange',
      hideInTable: true,
      fieldProps: {
        showTime: true,
        format: 'YYYY-MM-DD HH:mm:ss',
      },
      search: {
        transform: (value: any) => {
          if (!Array.isArray(value) || value.length !== 2) {
            return {};
          }
          return {
            createTime: value.map((item: any, index: number) => {
              if (typeof item?.format === 'function') {
                return item.format(index === 0 ? 'YYYY-MM-DD 00:00:00' : 'YYYY-MM-DD 23:59:59');
              }
              const date = new Date(item);
              if (!Number.isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = `${date.getMonth() + 1}`.padStart(2, '0');
                const day = `${date.getDate()}`.padStart(2, '0');
                return `${year}-${month}-${day} ${index === 0 ? '00:00:00' : '23:59:59'}`;
              }
              return item;
            }),
          };
        },
      },
    },
  ];

  const columns: ProColumns<API.System.Role>[] = [...baseColumns, ...searchColumns];

  return (
    <PageContainer>
      {contextHolder}
      <div style={{ width: '100%', float: 'right' }}>
        <ProTable<API.System.Role>
          headerTitle={intl.formatMessage({
            id: 'pages.searchTable.title',
            defaultMessage: '信息',
          })}
          actionRef={actionRef}
          formRef={formTableRef}
          rowKey="roleId"
          key="roleList"
          search={{
            labelWidth: 120,
          }}
          toolBarRender={() => [
            <Button
              type="primary"
              key="add"
              hidden={!access.hasPerms('system:role:add')}
              onClick={async () => {
                getMenuTree().then((res: any) => {
                  if (isSuccessCode(res.code)) {
                    setMenuTree(formatTreeData(res.data));
                    setMenuIds([]);
                    setModalVisible(true);
                    setCurrentRow(undefined);
                  } else {
                    message.warning(res.msg || '加载菜单失败');
                  }
                });
              }}
            >
              <PlusOutlined /> <FormattedMessage id="pages.searchTable.new" defaultMessage="新建" />
            </Button>,
            <Button
              type="primary"
              key="remove"
              danger
              hidden={selectedRows?.length === 0 || !access.hasPerms('system:role:remove')}
              onClick={async () => {
                Modal.confirm({
                  title: '是否确认删除所选数据项？',
                  icon: <ExclamationCircleOutlined />,
                  content: '请谨慎操作',
                  async onOk() {
                    const success = await handleRemove(selectedRows);
                    if (success) {
                      setSelectedRows([]);
                      actionRef.current?.reloadAndRest?.();
                    }
                  },
                });
              }}
            >
              <DeleteOutlined />
              <FormattedMessage id="pages.searchTable.delete" defaultMessage="删除" />
            </Button>,
            <Button
              type="primary"
              key="export"
              hidden={!access.hasPerms('system:role:export')}
              onClick={async () => {
                handleExport();
              }}
            >
              <PlusOutlined />
              <FormattedMessage id="pages.searchTable.export" defaultMessage="导出" />
            </Button>,
          ]}
          request={(params) =>
            getRoleList({ ...params } as API.System.RoleListParams).then((res) => ({
              data: res.rows,
              total: res.total,
              success: true,
            }))
          }
          columns={columns}
          rowSelection={{
            onChange: (_, rows) => {
              setSelectedRows(rows);
            },
          }}
        />
      </div>
      {selectedRows?.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              <FormattedMessage id="pages.searchTable.chosen" defaultMessage="已选择" />
              <a style={{ fontWeight: 600 }}>{selectedRows.length}</a>
              <FormattedMessage id="pages.searchTable.item" defaultMessage="项" />
            </div>
          }
        >
          <Button
            key="remove"
            danger
            hidden={!access.hasPerms('system:role:del')}
            onClick={async () => {
              Modal.confirm({
                title: '删除',
                content: '确定删除该项吗？',
                okText: '确认',
                cancelText: '取消',
                onOk: async () => {
                  const success = await handleRemove(selectedRows);
                  if (success) {
                    setSelectedRows([]);
                    actionRef.current?.reloadAndRest?.();
                  }
                },
              });
            }}
          >
            <FormattedMessage id="pages.searchTable.batchDeletion" defaultMessage="批量删除" />
          </Button>
        </FooterToolbar>
      )}
      <UpdateForm
        onSubmit={async (values) => {
          let success = false;
          if (values.roleId) {
            success = await handleUpdate({ ...values } as API.System.Role);
          } else {
            success = await handleAdd({ ...values } as API.System.Role);
          }
          if (success) {
            setModalVisible(false);
            setCurrentRow(undefined);
            actionRef.current?.reload();
          }
        }}
        onCancel={() => {
          setModalVisible(false);
          setCurrentRow(undefined);
        }}
        open={modalVisible}
        values={currentRow || {}}
        menuTree={menuTree || []}
        menuCheckedKeys={menuIds || []}
        statusOptions={statusOptions}
      />
      <style>{`
        .ant-pro-page-container .ant-pro-page-container-warp-page-header {
          background: #fff;
        }
      `}</style>
    </PageContainer>
  );
};

export default RoleTableList;
