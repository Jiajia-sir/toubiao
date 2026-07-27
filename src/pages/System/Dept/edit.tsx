import React, { useEffect, useMemo, useState } from 'react';
import {
  ProForm,
  ProFormCascader,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { Form, Modal } from 'antd';
import { useIntl } from '@umijs/max';
import type { DataNode } from 'antd/es/tree';
import type { DefaultOptionType } from 'antd/es/select';
import { DictValueEnumObj } from '@/components/DictTag';
import { getUserSimpleList } from '@/services/system/user';

export type DeptFormData = Record<string, unknown> & Partial<API.System.Dept>;

export type DeptFormProps = {
  onCancel: (flag?: boolean, formVals?: DeptFormData) => void;
  onSubmit: (values: DeptFormData) => Promise<void>;
  open: boolean;
  values: Partial<API.System.Dept>;
  deptTree: DataNode[];
  statusOptions: DictValueEnumObj;
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

const ROOT_DEPT_OPTION = {
  title: '无上级',
  label: '无上级',
  value: 0,
  key: 0,
};

const DeptForm: React.FC<DeptFormProps> = (props) => {
  const [form] = Form.useForm();
  const intl = useIntl();
  const { statusOptions, deptTree, values } = props;
  const [userOptions, setUserOptions] = useState<DefaultOptionType[]>([]);
  const parentDeptOptions = useMemo(() => {
    const hasRoot = (deptTree || []).some((item) => {
      const option = item as DataNode & { value?: React.Key; id?: React.Key };
      const value = option.value ?? option.key ?? option.id;
      return `${value}` === '0';
    });
    return hasRoot ? deptTree : [ROOT_DEPT_OPTION as DataNode, ...deptTree];
  }, [deptTree]);

  useEffect(() => {
    let mounted = true;

    getUserSimpleList().then((res) => {
      if (!mounted) {
        return;
      }

      if (res?.code === 200) {
        setUserOptions(
          (res.data || []).map((item) => ({
            label: item.deptName ? `${item.nickname} (${item.deptName})` : item.nickname,
            value: item.id,
          })),
        );
      } else {
        setUserOptions([]);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const normalizedLeaderValue = useMemo(() => {
    const leaderUserId = (values as any).leaderUserId;
    if (typeof leaderUserId !== 'undefined' && leaderUserId !== null) {
      return leaderUserId;
    }
    if (typeof values.leader === 'number') {
      return values.leader;
    }
    if (typeof values.leader === 'string' && /^\d+$/.test(values.leader)) {
      return Number(values.leader);
    }
    return undefined;
  }, [values]);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      deptId: values.deptId,
      parentId: findDeptPath(
        parentDeptOptions,
        typeof values.parentId === 'undefined' ? 0 : values.parentId,
      ),
      ancestors: values.ancestors,
      deptName: values.deptName,
      orderNum: typeof values.orderNum === 'undefined' ? 0 : values.orderNum,
      leader: normalizedLeaderValue,
      phone: values.phone,
      email: values.email,
      status: typeof values.status === 'undefined' ? '0' : values.status,
      delFlag: values.delFlag,
      createBy: values.createBy,
      createTime: values.createTime,
      updateBy: values.updateBy,
      updateTime: values.updateTime,
    });
  }, [form, normalizedLeaderValue, parentDeptOptions, values]);

  const handleFinish = async (formValues: Record<string, any>) => {
    const parentPath = formValues.parentId;
    await props.onSubmit({
      ...formValues,
      parentId: Array.isArray(parentPath) ? parentPath[parentPath.length - 1] : parentPath,
      leaderUserId: formValues.leader,
    } as DeptFormData);
  };

  return (
    <Modal
      width={640}
      title={intl.formatMessage({
        id: 'system.dept.title',
        defaultMessage: '编辑部门',
      })}
      open={props.open}
      forceRender
      destroyOnClose
      onOk={() => form.submit()}
      onCancel={() => props.onCancel()}
    >
      <ProForm form={form} grid submitter={false} layout="horizontal" onFinish={handleFinish}>
        <ProFormDigit name="deptId" hidden />
        <ProFormCascader
          name="parentId"
          label={intl.formatMessage({
            id: 'system.dept.parent_dept',
            defaultMessage: '上级部门',
          })}
          colProps={{ md: 12, xl: 12 }}
          fieldProps={{
            options: parentDeptOptions as any[],
            changeOnSelect: true,
            fieldNames: {
              label: 'title',
              value: 'value',
              children: 'children',
            },
            style: { width: '100%' },
          }}
          placeholder="请选择上级部门"
          rules={[{ required: true, message: '请选择上级部门' }]}
        />
        <ProFormText
          name="deptName"
          label={intl.formatMessage({
            id: 'system.dept.dept_name',
            defaultMessage: '部门名称',
          })}
          colProps={{ md: 12, xl: 12 }}
          placeholder="请输入部门名称"
          rules={[{ required: true, message: '请输入部门名称' }]}
        />
        <ProFormDigit
          name="orderNum"
          label={intl.formatMessage({
            id: 'system.dept.order_num',
            defaultMessage: '显示顺序',
          })}
          colProps={{ md: 12, xl: 12 }}
          placeholder="请输入显示顺序"
        />
        <ProFormSelect
          name="leader"
          label={intl.formatMessage({
            id: 'system.dept.leader',
            defaultMessage: '负责人',
          })}
          colProps={{ md: 12, xl: 12 }}
          options={userOptions}
          placeholder="请选择负责人"
          showSearch
          fieldProps={{
            optionFilterProp: 'label',
            allowClear: true,
          }}
        />
        <ProFormText
          name="phone"
          label={intl.formatMessage({
            id: 'system.dept.phone',
            defaultMessage: '联系电话',
          })}
          colProps={{ md: 12, xl: 12 }}
          placeholder="请输入联系电话"
        />
        <ProFormText
          name="email"
          label={intl.formatMessage({
            id: 'system.dept.email',
            defaultMessage: '邮箱',
          })}
          colProps={{ md: 12, xl: 12 }}
          placeholder="请输入邮箱"
        />
        <ProFormRadio.Group
          valueEnum={statusOptions}
          name="status"
          label={intl.formatMessage({
            id: 'system.dept.status',
            defaultMessage: '状态',
          })}
          colProps={{ md: 12, xl: 12 }}
        />
      </ProForm>
    </Modal>
  );
};

export default DeptForm;
