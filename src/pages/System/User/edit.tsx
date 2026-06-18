import React, { useEffect } from 'react';
import {
  ProForm,
  ProFormText,
  ProFormSelect,
  ProFormTextArea,
  ProFormCascader,
} from '@ant-design/pro-components';
import { Form, Modal } from 'antd';
import { useIntl, FormattedMessage } from '@umijs/max';
import { DataNode } from 'antd/es/tree';
import { DictValueEnumObj } from '@/components/DictTag';

/* *
 *
 * @author whiteshader@163.com
 * @datetime  2023/02/06
 * 
 * */


export type UserFormData = Record<string, unknown> & Partial<API.System.User>;

export type UserFormProps = {
  onCancel: (flag?: boolean, formVals?: UserFormData) => void;
  onSubmit: (values: UserFormData) => Promise<void>;
  open: boolean;
  values: Partial<API.System.User>;
  sexOptions: DictValueEnumObj;
  statusOptions: DictValueEnumObj;
  postIds: number[];
  posts: string[];
  roleIds: number[];
  roles: string[];
  depts: DataNode[];
};

const findDeptPath = (options: DataNode[], targetValue?: React.Key): React.Key[] | undefined => {
  if (typeof targetValue === 'undefined' || targetValue === null) {
    return undefined;
  }
  for (const option of options) {
    const value = (option as any).value ?? option.key ?? (option as any).id;
    if (`${value}` === `${targetValue}`) {
      return [value];
    }
    const childPath = findDeptPath((option.children || []) as DataNode[], targetValue);
    if (childPath) {
      return [value, ...childPath];
    }
  }
  return undefined;
};

const UserForm: React.FC<UserFormProps> = (props) => {
  const [form] = Form.useForm();
  const userId = Form.useWatch('userId', form);
  const { sexOptions } = props;
  const { roles, posts, depts } = props;

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      userId: props.values.userId,
      deptId: findDeptPath(depts, props.values.deptId),
      postIds: props.postIds,
      roleIds: props.roleIds,
      username: (props.values as any).username ?? props.values.userName,
      nickName: props.values.nickName,
      email: props.values.email,
      phonenumber: props.values.phonenumber,
      sex: typeof props.values.sex === 'undefined' ? '1' : String(props.values.sex),
      avatar: props.values.avatar,
      delFlag: props.values.delFlag,
      loginIp: props.values.loginIp,
      loginDate: props.values.loginDate,
      remark: props.values.remark,
    });
  }, [form, props]);

  const intl = useIntl();
  const handleOk = () => {
    form.submit();
  };
  const handleCancel = () => {
    props.onCancel();
  };
  const handleFinish = async (values: Record<string, any>) => {
    const deptPath = values.deptId;
    props.onSubmit({
      ...values,
      deptId: Array.isArray(deptPath) ? deptPath[deptPath.length - 1] : deptPath,
    } as UserFormData);
  };

  return (
    <Modal
      width={640}
      title={intl.formatMessage({
        id: 'system.user.title',
        defaultMessage: '编辑用户信息',
      })}
      open={props.open}
      destroyOnClose
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <ProForm
        grid={true}
        form={form}
        layout="horizontal"
        submitter={false}
        onFinish={handleFinish}>
        <ProFormText name="userId" hidden />
        <ProFormText
          name="nickName"
          label={intl.formatMessage({
            id: 'system.user.nick_name',
            defaultMessage: '用户昵称',
          })}
          placeholder="请输入用户昵称"
          colProps={{ xs: 24, md: 12, xl: 12 }}
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage id="请输入用户昵称！" defaultMessage="请输入用户昵称！" />
              ),
            },
          ]}
        />
        <ProFormCascader
          name="deptId"
          label={intl.formatMessage({
            id: 'system.user.dept_name',
            defaultMessage: '部门',
          })}
          fieldProps={{
            options: depts as any[],
            changeOnSelect: true,
          }}
          placeholder="请输入用户部门"
          colProps={{ md: 12, xl: 12 }}
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage id="请输入用户部门！" defaultMessage="请输入用户部门！" />
              ),
            },
          ]}
        />
        <ProFormText
          name="phonenumber"
          label={intl.formatMessage({
            id: 'system.user.phonenumber',
            defaultMessage: '手机号码',
          })}
          placeholder="请输入手机号码"
          colProps={{ md: 12, xl: 12 }}
          rules={[
            {
              required: false,
              message: (
                <FormattedMessage id="请输入手机号码！" defaultMessage="请输入手机号码！" />
              ),
            },
          ]}
        />
        <ProFormText
          name="email"
          label={intl.formatMessage({
            id: 'system.user.email',
            defaultMessage: '用户邮箱',
          })}
          placeholder="请输入用户邮箱"
          colProps={{ md: 12, xl: 12 }}
          rules={[
            {
              required: false,
              message: (
                <FormattedMessage id="请输入用户邮箱！" defaultMessage="请输入用户邮箱！" />
              ),
            },
          ]}
        />
        <ProFormText
          name="username"
          label={intl.formatMessage({
            id: 'system.user.user_name',
            defaultMessage: '用户账号',
          })}
          placeholder="请输入用户账号"
          colProps={{ md: 12, xl: 12 }}
          rules={[
            {
              required: true,
            },
          ]}
        />
        <ProFormText.Password
          name="password"
          label={intl.formatMessage({
            id: 'system.user.password',
            defaultMessage: '密码',
          })}
          placeholder="请输入密码"
          colProps={{ md: 12, xl: 12 }}
          rules={[
            {
              required: true,
              message: <FormattedMessage id="请输入密码！" defaultMessage="请输入密码！" />,
            },
          ]}
        />
        <ProFormSelect
          valueEnum={
            Object.keys(sexOptions || {}).length > 0
              ? sexOptions
              : {
                  1: { text: '男' },
                  2: { text: '女' },
                }
          }
          name="sex"
          label={intl.formatMessage({
            id: 'system.user.sex',
            defaultMessage: '用户性别',
          })}
          initialValue={'1'}
          placeholder="请输入用户性别"
          colProps={{ md: 12, xl: 12 }}
          rules={[
            {
              required: false,
              message: (
                <FormattedMessage id="请输入用户性别！" defaultMessage="请输入用户性别！" />
              ),
            },
          ]}
        />
        <ProFormSelect
          name="postIds"
          mode="multiple"
          label={intl.formatMessage({
            id: 'system.user.post',
            defaultMessage: '岗位',
          })}
          options={posts}
          placeholder="请选择岗位"
          colProps={{ md: 12, xl: 12 }}
          rules={[{ required: false, message: '请选择岗位!' }]}
        />
        <ProFormSelect
          name="roleIds"
          mode="multiple"
          label={intl.formatMessage({
            id: 'system.user.role',
            defaultMessage: '角色',
          })}
          options={roles}
          placeholder="请选择角色"
          colProps={{ md: 12, xl: 12 }}
          rules={[{ required: true, message: '请选择角色!' }]}
        />
        <ProFormTextArea
          name="remark"
          label={intl.formatMessage({
            id: 'system.user.remark',
            defaultMessage: '备注',
          })}
          placeholder="请输入备注"
          colProps={{ md: 24, xl: 24 }}
          rules={[
            {
              required: false,
              message: <FormattedMessage id="请输入备注！" defaultMessage="请输入备注！" />,
            },
          ]}
        />
      </ProForm>
    </Modal>
  );
};

export default UserForm;
