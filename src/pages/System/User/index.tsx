import React, { useState, useRef, useEffect } from 'react';
import { useIntl, FormattedMessage, useAccess } from '@umijs/max';
import { Card, Checkbox, Col, Dropdown, FormInstance, Row, Space, Switch, TreeSelect, Upload } from 'antd';
import { Button, message, Modal } from 'antd';
import {
  ActionType,
  PageContainer,
  ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
  EditOutlined,
  DownloadOutlined,
  UploadOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  getUserList,
  removeUser,
  addUser,
  updateUser,
  exportUser,
  getUser,
  changeUserStatus,
  updateAuthRole,
  resetUserPwd,
  getAuthRole,
  getUserImportTemplate,
  importUser,
  moveUserDeptBatch,
} from '@/services/system/user';
import UpdateForm from './edit';
import { DataNode } from 'antd/es/tree';
import { getDeptTree } from '@/services/system/user';
import DeptTree from './components/DeptTree';
import ResetPwd from './components/ResetPwd';
import { getPostSimpleList } from '@/services/system/post';
import { getRoleSimpleList } from '@/services/system/role';
import AuthRoleForm from './components/AuthRole';

const { confirm } = Modal;

const isSuccess = (resp?: API.Result) => ['0', '200'].includes(String(resp?.code));

/* *
 *
 * @author whiteshader@163.com
 * @datetime  2023/02/06
 *
 * */

/**
 * 添加节点
 *
 * @param fields
 */
const handleAdd = async (fields: API.System.User) => {
  const hide = message.loading('正在添加');
  try {
    const resp = await addUser({ ...fields });
    hide();
    if (isSuccess(resp)) {
      message.success('添加成功');
      return true;
    }
    message.error(resp.msg || '添加失败请重试！');
    return false;
  } catch (error) {
    hide();
    message.error('添加失败请重试！');
    return false;
  }
};

/**
 * 更新节点
 *
 * @param fields
 */
const handleUpdate = async (fields: API.System.User) => {
  const hide = message.loading('正在配置');
  try {
    const resp = await updateUser(fields);
    hide();
    if (isSuccess(resp)) {
      message.success('配置成功');
      return true;
    }
    message.error(resp.msg || '配置失败请重试！');
    return false;
  } catch (error) {
    hide();
    message.error('配置失败请重试！');
    return false;
  }
};

/**
 * 删除节点
 *
 * @param selectedRows
 */
const handleRemove = async (selectedRows: API.System.User[]) => {
  const hide = message.loading('正在删除');
  if (!selectedRows) return true;
  try {
    const resp = await removeUser(selectedRows.map((row) => row.userId).join(','));
    hide();
    if (isSuccess(resp)) {
      message.success('删除成功，即将刷新');
      return true;
    }
    message.error(resp.msg || '删除失败，请重试');
    return false;
  } catch (error) {
    hide();
    message.error('删除失败，请重试');
    return false;
  }
};

const handleRemoveOne = async (selectedRow: API.System.User) => {
  const hide = message.loading('正在删除');
  if (!selectedRow) return true;
  try {
    const params = [selectedRow.userId];
    const resp = await removeUser(params.join(','));
    hide();
    if (isSuccess(resp)) {
      message.success('删除成功，即将刷新');
      return true;
    }
    message.error(resp.msg || '删除失败，请重试');
    return false;
  } catch (error) {
    hide();
    message.error('删除失败，请重试');
    return false;
  }
};

/**
 * 导出数据
 *
 *
 */
const handleExport = async () => {
  const hide = message.loading('正在导出');
  try {
    await exportUser();
    hide();
    message.success('导出成功');
    return true;
  } catch (error) {
    hide();
    message.error('导出失败，请重试');
    return false;
  }
};

const isExcelFile = (file: File) => {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith('.xls') || fileName.endsWith('.xlsx');
};

type ImportResultPayload = string[] | Record<string, string> | undefined;
type ImportResultItem = {
  username: string;
  detail?: string;
};

const toImportResultItems = (value: ImportResultPayload): ImportResultItem[] => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((username) => ({
      username,
    }));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([username]) => Boolean(username))
      .map(([username, detail]) => ({
        username,
        detail,
      }));
  }

  return [];
};

const renderImportResultGroup = (
  title: string,
  items: ReturnType<typeof toImportResultItems>,
  type: 'created' | 'updated' | 'failed',
) => (
  <div className={`user-import-result-group user-import-result-group-${type}`}>
    <div className="user-import-result-title">
      <span>{title}</span>
      <span className="user-import-result-count">{items.length}</span>
    </div>
    {items.length ? (
      <div className="user-import-result-list">
        {items.map((item) => (
          <div className="user-import-result-item" key={`${type}-${item.username}`}>
            <span className="user-import-result-name">{item.username}</span>
            {item.detail ? <span className="user-import-result-detail">{item.detail}</span> : null}
          </div>
        ))}
      </div>
    ) : (
      <div className="user-import-result-empty">无</div>
    )}
  </div>
);

const UserTableList: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const formTableRef = useRef<FormInstance>();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [resetPwdModalVisible, setResetPwdModalVisible] = useState<boolean>(false);
  const [authRoleModalVisible, setAuthRoleModalVisible] = useState<boolean>(false);
  const [importModalVisible, setImportModalVisible] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File>();
  const [importUpdateSupport, setImportUpdateSupport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [moveDeptModalVisible, setMoveDeptModalVisible] = useState(false);
  const [moveDeptId, setMoveDeptId] = useState<number>();
  const [movingDept, setMovingDept] = useState(false);

  const actionRef = useRef<ActionType>();
  const [currentRow, setCurrentRow] = useState<API.System.User>();
  const [selectedRows, setSelectedRows] = useState<API.System.User[]>([]);

  const [selectDept, setSelectDept] = useState<any>({ id: 0 });
  const [sexOptions, setSexOptions] = useState<any>([]);
  const [statusOptions, setStatusOptions] = useState<any>([]);

  const [postIds, setPostIds] = useState<number[]>();
  const [postList, setPostList] = useState<any[]>();
  const [roleIds, setRoleIds] = useState<number[]>();
  const [roleList, setRoleList] = useState<any[]>();
  const [deptTree, setDeptTree] = useState<DataNode[]>();

  const access = useAccess();

  /** 国际化配置 */
  const intl = useIntl();

  useEffect(() => {
    setSexOptions({
      1: { text: '男' },
      2: { text: '女' },
    });
    setStatusOptions({
      0: { text: '启用' },
      1: { text: '停用' },
    });
  }, []);

  useEffect(() => {
    if (typeof selectDept?.id !== 'undefined' && selectDept?.id !== null && actionRef.current) {
      actionRef.current.reload();
    }
  }, [selectDept?.id]);

  const showChangeStatusConfirm = (record: API.System.User) => {
    const status = String(record.status);
    let text = status === '1' ? '启用' : '停用';
    const newStatus = status === '0' ? '1' : '0';
    confirm({
      title: `确认要${text}${record.userName}用户吗？`,
      onOk() {
        changeUserStatus(record.userId, newStatus).then((resp) => {
          if (resp.code === 200) {
            messageApi.open({
              type: 'success',
              content: '更新成功！',
            });
            actionRef.current?.reload();
          } else {
            messageApi.open({
              type: 'error',
              content: '更新失败！',
            });
          }
        });
      },
    });
  };

  const normalizeUser = (user: any): API.System.User => {
    return {
      ...user,
      userId: user.userId ?? user.id,
      deptId: user.deptId,
      deptName: user.deptName,
      username: user.username ?? user.userName,
      userName: user.userName ?? user.username,
      nickName: user.nickName ?? user.nickname,
      phonenumber: user.phonenumber ?? user.mobile,
      postIds: Array.isArray(user.postIds) ? user.postIds : [],
      roles: Array.isArray(user.roles) ? user.roles : [],
      sex: typeof user.sex === 'undefined' || user.sex === null ? user.sex : String(user.sex),
      status:
        typeof user.status === 'undefined' || user.status === null
          ? user.status
          : String(user.status),
    };
  };

  const toPostOptions = (posts: any[] = []) => {
    return posts.map((item: any) => {
      return {
        value: item.postId ?? item.id,
        label: item.postName ?? item.name,
      };
    });
  };

  const toRoleOptions = (roles: any[] = []) => {
    return roles.map((item: any) => {
      return {
        value: item.roleId ?? item.id,
        label: item.roleName ?? item.name,
      };
    });
  };

  const toRoleIds = (roles: any[] = []) => {
    return roles
      .map((item: any) => item.roleId ?? item.id)
      .filter((id) => typeof id !== 'undefined');
  };

  const fetchUserInfo = async (userId: number, listRecord?: API.System.User) => {
    const [userResp, postResp, roleResp] = await Promise.all([
      getUser(userId),
      getPostSimpleList(),
      getRoleSimpleList(),
    ]);
    const userData = (userResp as any).data || {};
    const userInfo = userData.user || userData.userInfo || userData;
    const responseRoles =
      (Array.isArray((userResp as any).roles) && (userResp as any).roles) ||
      (Array.isArray(userData.roles) && userData.roles) ||
      (Array.isArray(userInfo.roles) && userInfo.roles) ||
      (Array.isArray((listRecord as any)?.roles) && (listRecord as any).roles) ||
      [];
    const responseRoleIds =
      (Array.isArray((userResp as any).roleIds) && (userResp as any).roleIds) ||
      (Array.isArray(userData.roleIds) && userData.roleIds) ||
      (Array.isArray(userInfo.roleIds) && userInfo.roleIds) ||
      (Array.isArray((listRecord as any)?.roleIds) && (listRecord as any).roleIds) ||
      [];

    setPostIds((userResp as any).postIds || userData.postIds || userInfo.postIds || []);
    setPostList(
      postResp.code === 200
        ? toPostOptions(postResp.data || [])
        : toPostOptions((userResp as any).posts || userData.posts || userInfo.posts || []),
    );
    setRoleIds(responseRoleIds.length > 0 ? responseRoleIds : toRoleIds(responseRoles));
    setRoleList(
      roleResp.code === 200 ? toRoleOptions(roleResp.data || []) : toRoleOptions(responseRoles),
    );
    return {
      ...userResp,
      data: normalizeUser(userInfo),
    };
  };

  const fetchAuthRoleInfo = async (userId: number) => {
    const [roleResp, authResp] = await Promise.all([getRoleSimpleList(), getAuthRole(userId)]);

    if (roleResp.code === 200) {
      setRoleList(
        (roleResp.data || []).map((item: any) => {
          return {
            value: item.roleId,
            label: item.roleName,
          };
        }),
      );
    }

    if (authResp.code === 200) {
      setRoleIds(authResp.data || []);
    } else {
      setRoleIds([]);
    }
  };

  const closeImportModal = () => {
    setImportModalVisible(false);
    setImportFile(undefined);
    setImportUpdateSupport(false);
    setImporting(false);
  };

  const handleDownloadImportTemplate = async () => {
    try {
      await getUserImportTemplate();
    } catch (error) {
      message.error('下载导入模板失败');
    }
  };

  const handleImportUser = async () => {
    if (!importFile) {
      message.warning('请选择要导入的 Excel 文件');
      return;
    }
    setImporting(true);
    try {
      const resp = await importUser(importFile, importUpdateSupport);
      if (Number(resp.code) !== 200) {
        message.error(resp.msg || '导入失败');
        return;
      }

      const createUsernames = toImportResultItems(resp.data?.createUsernames);
      const updateUsernames = toImportResultItems(resp.data?.updateUsernames);
      const failureUsernames = toImportResultItems(resp.data?.failureUsernames);

      Modal.info({
        title: '导入结果',
        width: 640,
        className: 'user-import-result-modal',
        content: (
          <div className="user-import-result">
            <div className="user-import-result-summary">导入完成，以下为本次导入明细</div>
            {renderImportResultGroup('新增用户', createUsernames, 'created')}
            {renderImportResultGroup('更新用户', updateUsernames, 'updated')}
            {renderImportResultGroup('失败用户', failureUsernames, 'failed')}
          </div>
        ),
      });

      closeImportModal();
      actionRef.current?.reload();
    } catch (error) {
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const closeMoveDeptModal = () => {
    setMoveDeptModalVisible(false);
    setMoveDeptId(undefined);
    setMovingDept(false);
  };

  const handleMoveDeptBatch = async () => {
    if (!selectedRows.length) {
      message.warning('请选择要移动的用户');
      return;
    }
    if (typeof moveDeptId === 'undefined') {
      message.warning('请选择目标部门');
      return;
    }

    setMovingDept(true);
    try {
      const resp = await moveUserDeptBatch(
        selectedRows.map((row) => row.userId),
        moveDeptId,
      );
      if (isSuccess(resp)) {
        message.success('批量移动部门成功');
        closeMoveDeptModal();
        setSelectedRows([]);
        actionRef.current?.reloadAndRest?.();
        return;
      }
      message.error(resp.msg || '批量移动部门失败');
    } catch (error) {
      message.error('批量移动部门失败');
    } finally {
      setMovingDept(false);
    }
  };

  const openMoveDeptModal = async () => {
    if (!selectedRows.length) {
      message.warning('请选择要移动的用户');
      return;
    }
    if (!deptTree?.length) {
      const treeData = await getDeptTree({});
      setDeptTree(treeData);
    }
    setMoveDeptModalVisible(true);
  };

  const columns: ProColumns<API.System.User>[] = [
    {
      title: <FormattedMessage id="system.user.user_id" defaultMessage="用户编号" />,
      dataIndex: 'userId',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="system.user.user_name" defaultMessage="用户账号" />,
      dataIndex: 'userName',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="system.user.nick_name" defaultMessage="用户昵称" />,
      dataIndex: 'nickName',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: <FormattedMessage id="system.user.dept_name" defaultMessage="部门" />,
      dataIndex: 'deptName',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="system.user.email" defaultMessage="邮箱" />,
      dataIndex: 'email',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="system.user.sex" defaultMessage="性别" />,
      dataIndex: 'sex',
      valueType: 'select',
      valueEnum: sexOptions,
    },

    {
      title: <FormattedMessage id="system.user.loginIp" defaultMessage="登录ip" />,
      dataIndex: 'loginIp',
      valueType: 'text',
      hideInSearch: true,
    },

    {
      title: <FormattedMessage id="system.user.createTime" defaultMessage="创建时间" />,
      dataIndex: 'createTime',
      valueType: 'dateTime',
    },
    {
      title: <FormattedMessage id="system.user.status" defaultMessage="帐号状态" />,
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusOptions,
      render: (_, record) => {
        return (
          <Switch
            checked={String(record.status) === '0'}
            checkedChildren="正常"
            unCheckedChildren="停用"
            defaultChecked
            onClick={() => showChangeStatusConfirm(record)}
          />
        );
      },
    },
    {
      title: <FormattedMessage id="system.user.phonenumber" defaultMessage="手机号码" />,
      dataIndex: 'phonenumber',
      valueType: 'text',
    },
    {
      title: <FormattedMessage id="pages.searchTable.titleOption" defaultMessage="操作" />,
      dataIndex: 'option',
      width: '220px',
      valueType: 'option',
      render: (_, record) => [
        <Button
          type="link"
          size="small"
          key="edit"
          icon=<EditOutlined />
          hidden={!access.hasPerms('system:user:edit')}
          onClick={async () => {
            const [userInfo, treeData] = await Promise.all([
              fetchUserInfo(record.userId, record),
              getDeptTree({}),
            ]);
            setDeptTree(treeData);
            setModalVisible(true);
            setCurrentRow(userInfo.data || record);
          }}
        >
          编辑
        </Button>,
        <Button
          type="link"
          size="small"
          danger
          icon=<DeleteOutlined />
          key="batchRemove"
          hidden={!access.hasPerms('system:user:remove')}
          onClick={async () => {
            Modal.confirm({
              title: '删除',
              content: '确定删除该项吗？',
              okText: '确认',
              cancelText: '取消',
              onOk: async () => {
                const success = await handleRemoveOne(record);
                if (success) {
                  if (actionRef.current) {
                    actionRef.current.reload();
                  }
                }
              },
            });
          }}
        >
          删除
        </Button>,
        <Dropdown
          key="more"
          menu={{
            items: [
              {
                label: (
                  <FormattedMessage id="system.user.reset.password" defaultMessage="密码重置" />
                ),
                key: 'reset',
                disabled: !access.hasPerms('system:user:edit'),
              },
              {
                label: '分配角色',
                key: 'authRole',
                disabled: !access.hasPerms('system:user:edit'),
              },
            ],
            onClick: ({ key }) => {
              if (key === 'reset') {
                setResetPwdModalVisible(true);
                setCurrentRow(record);
              } else if (key === 'authRole') {
                fetchAuthRoleInfo(record.userId);
                setAuthRoleModalVisible(true);
                setCurrentRow(record);
              }
            },
          }}
        >
          <a onClick={(e) => e.preventDefault()}>
            <Space>
              <DownOutlined />
              更多
            </Space>
          </a>
        </Dropdown>,
      ],
    },
    {
      title: <FormattedMessage id="system.user.post" defaultMessage="岗位" />,
      dataIndex: 'postIds',
      valueType: 'text',
      hideInSearch: true,
      render: (_, record) => {
        const ids = Array.isArray((record as any).postIds) ? (record as any).postIds : [];
        return ids.length ? ids.join('、') : '-';
      },
    },
    {
      title: <FormattedMessage id="system.user.role" defaultMessage="角色" />,
      dataIndex: 'roles',
      valueType: 'text',
      hideInSearch: true,
      render: (_, record) => {
        const roles = Array.isArray((record as any).roles) ? (record as any).roles : [];
        const roleNames = roles.map((item: any) => item?.roleName ?? item?.name).filter(Boolean);
        return roleNames.length ? roleNames.join('、') : '-';
      },
    },
    {
      title: <FormattedMessage id="system.user.remark" defaultMessage="备注" />,
      dataIndex: 'remark',
      valueType: 'text',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: <FormattedMessage id="system.user.loginDate" defaultMessage="登录时间" />,
      dataIndex: 'loginDate',
      valueType: 'dateTime',
      hideInSearch: true,
    },
  ];

  const tableColumns: ProColumns<API.System.User>[] = [
    {
      title: '用户昵称',
      title: '用户账号',
      dataIndex: 'username',
      valueType: 'text',
      hideInTable: true,
      order: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTimeRange',
      hideInTable: true,
      order: 99,
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
    {
      ...columns[0],
      hideInSearch: true,
    },
    {
      ...columns[1],
      hideInSearch: true,
      render: (_, record) => record.userName || (record as any).username || '-',
    },
    {
      ...columns[2],
      hideInSearch: true,
    },
    {
      ...columns[3],
      hideInSearch: true,
    },
    {
      ...columns[9],
      hideInSearch: true,
    },
    {
      ...columns[4],
      hideInSearch: true,
    },
    {
      ...columns[5],
      hideInSearch: true,
    },
    {
      ...columns[12],
      hideInSearch: true,
      render: (_, record) => {
        const roles = Array.isArray((record as any).roles) ? (record as any).roles : [];
        const roleNames = roles.map((item: any) => item?.roleName ?? item?.name).filter(Boolean);
        return roleNames.length ? roleNames.join(', ') : '-';
      },
    },
    {
      ...columns[6],
      hideInSearch: true,
    },
    {
      ...columns[14],
      hideInSearch: true,
    },
    {
      ...columns[7],
      hideInSearch: true,
    },
    {
      ...columns[8],
      hideInSearch: true,
    },
    {
      ...columns[13],
      hideInSearch: true,
    },
    {
      ...columns[10],
      hideInSearch: true,
      fixed: 'right',
    },
  ];

  return (
    <PageContainer>
      {contextHolder}
      <Row gutter={[16, 24]}>
        <Col lg={4} md={24}>
          <Card style={{ minHeight: '68vh' }}>
            <DeptTree
              onSelect={async (value: any) => {
                setSelectDept(value);
              }}
            />
          </Card>
        </Col>
        <Col lg={20} md={24}>
          <ProTable<API.System.User>
            headerTitle={intl.formatMessage({
              id: 'pages.searchTable.title',
              defaultMessage: '信息',
            })}
            actionRef={actionRef}
            formRef={formTableRef}
            rowKey="userId"
            key="userList"
            search={{
              labelWidth: 120,
            }}
            toolBarRender={() => [
              <Button
                type="primary"
                key="add"
                hidden={!access.hasPerms('system:user:add')}
                onClick={async () => {
                  const treeData = await getDeptTree({});
                  setDeptTree(treeData);

                  const postResp = await getPostSimpleList();
                  if (postResp.code === 200) {
                    setPostList(
                      (postResp.data || []).map((item: any) => {
                        return {
                          value: item.postId,
                          label: item.postName,
                        };
                      }),
                    );
                  }

                  const roleResp = await getRoleSimpleList();
                  if (roleResp.code === 200) {
                    setRoleList(
                      (roleResp.data || []).map((item: any) => {
                        return {
                          value: item.roleId,
                          label: item.roleName,
                        };
                      }),
                    );
                  }
                  setPostIds([]);
                  setRoleIds([]);
                  setCurrentRow({
                    deptId: selectDept?.id ?? selectDept?.value,
                  } as API.System.User);
                  setModalVisible(true);
                }}
              >
                <PlusOutlined />{' '}
                <FormattedMessage id="pages.searchTable.new" defaultMessage="新建" />
              </Button>,
              <Button
                type="primary"
                key="remove"
                danger
                disabled={selectedRows?.length === 0}
                onClick={async () => {
                  Modal.confirm({
                    title: '是否确认删除所选数据项?',
                    icon: <ExclamationCircleOutlined />,
                    content: '请谨慎操作',
                    async onOk() {
                      const success = await handleRemove(selectedRows);
                      if (success) {
                        setSelectedRows([]);
                        actionRef.current?.reloadAndRest?.();
                      }
                    },
                    onCancel() {},
                  });
                }}
              >
                <DeleteOutlined />
                批量删除用户
              </Button>,
              <Button
                type="primary"
                key="moveDept"
                icon={<SwapOutlined />}
                disabled={selectedRows?.length === 0}
                onClick={openMoveDeptModal}
              >
                批量移动部门
              </Button>,
              <Button
                type="primary"
                key="import"
                icon={<UploadOutlined />}
                onClick={() => {
                  setImportModalVisible(true);
                }}
              >
                导入
              </Button>,
              <Button
                type="primary"
                key="export"
                hidden={!access.hasPerms('system:user:export')}
                onClick={async () => {
                  handleExport();
                }}
              >
                <DownloadOutlined />
                <FormattedMessage id="pages.searchTable.export" defaultMessage="导出" />
              </Button>,
            ]}
            request={(params) =>
              getUserList({ ...params, deptId: selectDept.id } as API.System.UserListParams).then(
                (res) => {
                  const result = {
                    data: (res.rows || []).map((item) => normalizeUser(item)),
                    total: res.total,
                    success: true,
                  };
                  return result;
                },
              )
            }
            columns={tableColumns}
            rowSelection={{
              onChange: (_, selectedRows) => {
                setSelectedRows(selectedRows);
              },
            }}
          />
        </Col>
      </Row>

      <UpdateForm
        onSubmit={async (values) => {
          let success = false;
          if (typeof values.userId !== 'undefined' && values.userId !== null) {
            success = await handleUpdate({ ...values } as API.System.User);
          } else {
            success = await handleAdd({ ...values } as API.System.User);
          }
          if (success) {
            setModalVisible(false);
            setCurrentRow(undefined);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }
        }}
        onCancel={() => {
          setModalVisible(false);
          setCurrentRow(undefined);
        }}
        open={modalVisible}
        values={currentRow || {}}
        sexOptions={sexOptions}
        statusOptions={statusOptions}
        posts={postList || []}
        postIds={postIds || []}
        roles={roleList || []}
        roleIds={roleIds || []}
        depts={deptTree || []}
      />
      <ResetPwd
        onSubmit={async (values: any) => {
          const success = await resetUserPwd(values.userId, values.password);
          if (success) {
            setResetPwdModalVisible(false);
            setSelectedRows([]);
            setCurrentRow(undefined);
            message.success('密码重置成功。');
          }
        }}
        onCancel={() => {
          setResetPwdModalVisible(false);
          setSelectedRows([]);
          setCurrentRow(undefined);
        }}
        open={resetPwdModalVisible}
        values={currentRow || {}}
      />
      <AuthRoleForm
        onSubmit={async (values: any) => {
          const success = await updateAuthRole({
            userId: currentRow?.userId,
            roleIds: values.roleIds,
          });
          if (success) {
            setAuthRoleModalVisible(false);
            setSelectedRows([]);
            setCurrentRow(undefined);
            message.success('配置成功。');
            actionRef.current?.reload();
          }
        }}
        onCancel={() => {
          setAuthRoleModalVisible(false);
          setSelectedRows([]);
          setCurrentRow(undefined);
        }}
        open={authRoleModalVisible}
        roles={roleList || []}
        roleIds={roleIds || []}
      />
      <Modal
        title="批量移动部门"
        open={moveDeptModalVisible}
        onCancel={closeMoveDeptModal}
        onOk={handleMoveDeptBatch}
        confirmLoading={movingDept}
        okText="确认移动"
        cancelText="取消"
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div className="user-batch-move-tip">已选择 {selectedRows.length} 个用户，请选择目标部门。</div>
          <TreeSelect
            value={moveDeptId}
            treeData={deptTree || []}
            placeholder="请选择目标部门"
            treeDefaultExpandAll
            showSearch
            allowClear
            style={{ width: '100%' }}
            treeNodeFilterProp="title"
            onChange={(value) => {
              setMoveDeptId(typeof value === 'undefined' ? undefined : Number(value));
            }}
          />
        </Space>
      </Modal>
      <Modal
        title="导入用户"
        open={importModalVisible}
        className="user-import-modal"
        onCancel={closeImportModal}
        onOk={handleImportUser}
        confirmLoading={importing}
        okText="导入"
        cancelText="取消"
        destroyOnClose
      >
        <div className="user-import-panel">
          <div className="user-import-step">
            <div className="user-import-step-index">1</div>
            <div className="user-import-step-content">
              <div className="user-import-step-title">下载模板</div>
              <div className="user-import-step-desc">请使用模板填写用户信息后再导入。</div>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadImportTemplate}>
                下载导入用户模板
              </Button>
            </div>
          </div>
          <div className="user-import-step">
            <div className="user-import-step-index">2</div>
            <div className="user-import-step-content">
              <div className="user-import-step-title">上传文件</div>
              <div className="user-import-step-desc">仅支持 .xls、.xlsx 格式。</div>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Upload
                  accept=".xls,.xlsx"
                  maxCount={1}
                  beforeUpload={(file) => {
                    if (!isExcelFile(file)) {
                      message.error('只能上传 Excel 文件');
                      return Upload.LIST_IGNORE;
                    }
                    setImportFile(file);
                    return false;
                  }}
                  onRemove={() => {
                    setImportFile(undefined);
                  }}
                  fileList={
                    importFile
                      ? [
                          {
                            uid: importFile.name,
                            name: importFile.name,
                            status: 'done' as const,
                          },
                        ]
                      : []
                  }
                >
                  <Button type="primary" icon={<UploadOutlined />}>
                    选择 Excel 文件
                  </Button>
                </Upload>
                <Checkbox
                  checked={importUpdateSupport}
                  onChange={(e) => setImportUpdateSupport(e.target.checked)}
                >
                  支持更新已有用户
                </Checkbox>
              </Space>
            </div>
          </div>
        </div>
      </Modal>
      <style>{`
        .ant-pro-page-container .ant-pro-page-container-warp-page-header {
          background: #fff;
        }
        .user-batch-move-tip {
          padding: 10px 12px;
          border: 1px solid #dbe9ff;
          border-radius: 8px;
          color: #1f2d3d;
          background: #f4f8ff;
        }
        .user-import-panel {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .user-import-step {
          display: flex;
          gap: 14px;
          padding: 16px;
          border: 1px solid #e5edf8;
          border-radius: 8px;
          background: linear-gradient(180deg, #fbfdff 0%, #f6f9fd 100%);
        }
        .user-import-step-index {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 28px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: #1677ff;
          font-weight: 600;
          background: #eaf3ff;
          box-shadow: inset 0 0 0 1px #cfe2ff;
        }
        .user-import-step-content {
          flex: 1;
          min-width: 0;
        }
        .user-import-step-title {
          margin-bottom: 4px;
          color: #1f2d3d;
          font-weight: 600;
        }
        .user-import-step-desc {
          margin-bottom: 12px;
          color: #6b778c;
          font-size: 13px;
        }
        .user-import-result {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }
        .user-import-result-summary {
          padding: 10px 12px;
          border-radius: 8px;
          color: #1f2d3d;
          background: #f4f8ff;
          border: 1px solid #dbe9ff;
        }
        .user-import-result-group {
          border: 1px solid #edf1f7;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
        }
        .user-import-result-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          font-weight: 600;
          background: #f8fafc;
        }
        .user-import-result-count {
          min-width: 26px;
          height: 22px;
          padding: 0 8px;
          border-radius: 11px;
          color: #1677ff;
          font-size: 12px;
          line-height: 22px;
          text-align: center;
          background: #eaf3ff;
        }
        .user-import-result-group-failed .user-import-result-count {
          color: #cf1322;
          background: #fff1f0;
        }
        .user-import-result-list {
          max-height: 180px;
          overflow: auto;
        }
        .user-import-result-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          justify-content: space-between;
          padding: 9px 12px;
          border-top: 1px solid #f0f2f5;
        }
        .user-import-result-name {
          flex: 0 0 160px;
          color: #1f2d3d;
          font-weight: 500;
          word-break: break-all;
        }
        .user-import-result-detail {
          flex: 1;
          color: #5f6b7a;
          text-align: right;
          word-break: break-all;
        }
        .user-import-result-empty {
          padding: 12px;
          color: #8c8c8c;
        }
      `}</style>
    </PageContainer>
  );
};

export default UserTableList;
