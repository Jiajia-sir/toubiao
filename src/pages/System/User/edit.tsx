import React, { useEffect } from 'react';
import {
  ProForm,
  ProFormCascader,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Form, Modal } from 'antd';
import { FormattedMessage, useIntl } from '@umijs/max';
import type { DataNode } from 'antd/es/tree';
import type { DictValueEnumObj } from '@/components/DictTag';

export type UserFormData = Record<string, unknown> & Partial<API.System.User>;

export type UserFormProps = {
  onCancel: (flag?: boolean, formVals?: UserFormData) => void;
  onSubmit: (values: UserFormData) => Promise<void>;
  open: boolean;
  values: Partial<API.System.User>;
  sexOptions: DictValueEnumObj;
  statusOptions: DictValueEnumObj;
  postIds: number[];
  posts: { label: string; value: number }[];
  roleIds: number[];
  roles: { label: string; value: number }[];
  depts: DataNode[];
};

const PHONE_NUMBER_REGEXP = /^1[3-9]\d{9}$/;

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

const normalizeDeptOptions = (options: DataNode[]): DataNode[] => {
  return options.map((option) => {
    const currentOption = option as DataNode & { status?: number | string };
    return {
      ...currentOption,
      disabled: Number(currentOption.status) === 1 || currentOption.disabled,
      children: currentOption.children
        ? normalizeDeptOptions(currentOption.children as DataNode[])
        : undefined,
    };
  });
};

const UserForm: React.FC<UserFormProps> = (props) => {
  const [form] = Form.useForm();
  const intl = useIntl();
  const isEdit = typeof props.values.userId !== 'undefined' && props.values.userId !== null;
  const halfColProps = { xs: 24, md: 12, xl: 12 };
  const deptOptions = normalizeDeptOptions(props.depts || []);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      userId: props.values.userId,
      deptId: findDeptPath(props.depts, props.values.deptId),
      postIds: props.postIds,
      roleIds: props.roleIds,
      username: (props.values as any).username ?? props.values.userName,
      nickName: props.values.nickName,
      email: props.values.email,
      phonenumber: props.values.phonenumber,
      sex: typeof props.values.sex === 'undefined' ? '1' : String(props.values.sex),
      password: props.values.password,
      remark: props.values.remark,
    });
  }, [form, props]);

  const handleFinish = async (values: Record<string, any>) => {
    const deptPath = values.deptId;
    const submitValues = {
      ...values,
      deptId: Array.isArray(deptPath) ? deptPath[deptPath.length - 1] : deptPath,
    } as UserFormData;

    if (submitValues.userId && !submitValues.password) {
      delete submitValues.password;
    }

    await props.onSubmit(submitValues);
  };

  return (
    <Modal
      width={720}
      title={intl.formatMessage({
        id: 'system.user.title',
        defaultMessage: '编辑用户信息',
      })}
      open={props.open}
      destroyOnClose
      onOk={() => form.submit()}
      onCancel={() => props.onCancel()}
    >
      <ProForm
        grid
        form={form}
        layout="horizontal"
        submitter={false}
        labelAlign="right"
        labelCol={{ xs: 24, sm: 7, md: 8 }}
        wrapperCol={{ xs: 24, sm: 17, md: 16 }}
        rowProps={{ gutter: [16, 0] }}
        onFinish={handleFinish}
      >
        <ProFormText name="userId" hidden />
        <ProFormText
          name="nickName"
          label={intl.formatMessage({
            id: 'system.user.nick_name',
            defaultMessage: '用户昵称',
          })}
          placeholder="请输入用户昵称"
          colProps={halfColProps}
          rules={[
            {
              required: true,
              message: <FormattedMessage id="请输入用户昵称！" defaultMessage="请输入用户昵称！" />,
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
            options: deptOptions as any[],
            changeOnSelect: true,
            style: { width: '100%' },
          }}
          placeholder="请选择所属部门"
          colProps={halfColProps}
          rules={[
            {
              required: true,
              message: <FormattedMessage id="请选择用户部门！" defaultMessage="请选择用户部门！" />,
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
          colProps={halfColProps}
          rules={[
            {
              validator: async (_, value) => {
                if (!value) {
                  return;
                }
                if (!PHONE_NUMBER_REGEXP.test(String(value))) {
                  throw new Error('请输入正确的手机号格式');
                }
              },
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
          colProps={halfColProps}
        />
        <ProFormText
          name="username"
          label={intl.formatMessage({
            id: 'system.user.user_name',
            defaultMessage: '用户账号',
          })}
          placeholder="请输入用户账号"
          colProps={halfColProps}
          rules={[{ required: true, message: '请输入用户账号' }]}
        />
        <ProFormText.Password
          name="password"
          label={intl.formatMessage({
            id: 'system.user.password',
            defaultMessage: '密码',
          })}
          placeholder={isEdit ? '如不修改密码请留空' : '请输入密码'}
          colProps={halfColProps}
          rules={[
            {
              required: !isEdit,
              message: <FormattedMessage id="请输入密码！" defaultMessage="请输入密码！" />,
            },
          ]}
        />
        <ProFormSelect
          valueEnum={
            Object.keys(props.sexOptions || {}).length > 0
              ? props.sexOptions
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
          initialValue="1"
          placeholder="请选择用户性别"
          colProps={halfColProps}
          fieldProps={{ style: { width: '100%' } }}
        />
        <ProFormSelect
          name="postIds"
          mode="multiple"
          label={intl.formatMessage({
            id: 'system.user.post',
            defaultMessage: '岗位',
          })}
          options={props.posts}
          placeholder="请选择岗位"
          colProps={halfColProps}
          fieldProps={{ style: { width: '100%' } }}
        />
        <ProFormSelect
          name="roleIds"
          mode="multiple"
          label={intl.formatMessage({
            id: 'system.user.role',
            defaultMessage: '角色',
          })}
          options={props.roles}
          placeholder="请选择角色"
          colProps={halfColProps}
          fieldProps={{ style: { width: '100%' } }}
          rules={[{ required: true, message: '请选择角色' }]}
        />
        <ProFormTextArea
          name="remark"
          label={intl.formatMessage({
            id: 'system.user.remark',
            defaultMessage: '备注',
          })}
          placeholder="请输入备注"
          colProps={halfColProps}
          fieldProps={{ style: { width: '100%' }, autoSize: { minRows: 3, maxRows: 5 } }}
        />
      </ProForm>
    </Modal>
  );
};

export default UserForm;
