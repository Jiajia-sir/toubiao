'use client';

import { useEffect, useMemo, useState } from 'react';
import { history } from '@umijs/max';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Checkbox,
  Divider,
  Spin,
  Transfer,
  AutoComplete,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ClockCircleOutlined,
  CaretRightOutlined,
  DeleteOutlined,
  EditOutlined,
  FileSearchOutlined,
  PlayCircleOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  PoweroffOutlined,
} from '@ant-design/icons';
import {
  createDataSource,
  deleteDataSource,
  getDataSourcePage,
  getSupportedDataSourceTypes,
  listDataSourceDatabasesByBody,
  listDataSourceDatabasesById,
  listDataSourceFields,
  listDataSourceObjects,
  testDataSourceConnection,
  updateDataSource,
  type DataSourcePayload,
  type DataSourceRecord,
  type SupportedDataSourceType,
} from '@/services/biz/data-source';
import {
  createImportTask,
  deleteImportTask,
  enableImportTask,
  extractData as extractImportData,
  listImportRunsByDataSource,
  listImportTasksByDataSource,
  type ImportRunRecord,
  type ImportTaskRecord,
  triggerImportTask,
  type ImportObjectScope,
} from '@/services/biz/structured-import';
import './index.less';

const { Text, Paragraph } = Typography;

const PAGE_SIZE = 10;

interface SearchFormValues {
  name?: string;
  type?: string;
  category?: string;
  status?: number;
}

interface EditFormValues {
  name: string;
  type: string;
  description?: string;
  host?: string;
  port?: number | null;
  databaseName?: string;
  username?: string;
  password?: string;
  connectionUri?: string;
  properties?: Record<string, any>;
  status: number;
}

interface ImportFormValues {
  name: string;
  extractMode: 'FULL' | 'INCREMENTAL';
  scheduleType: 'MANUAL' | 'CRON';
  writeMode: 'UPSERT' | 'APPEND';
  batchSize: number;
  maxRowsPerObject?: number;
  enabled: number;
  triggerNow?: boolean;
  remark?: string;
  scheduleConfig?: {
    simpleType?: string;
    intervalMinutes?: number;
    dailyTime?: string;
  };
  cursorConfig?: {
    incrementalMode?: string;
    cursorField?: string;
    cursorCompare?: string;
    initialCursor?: string;
  };
}

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * 把后端 CommonResult / PageResult 兼容成稳定的前端列表结构。
 * 由于仓库内不同接口存在少量历史返回差异，这里统一兜底，降低页面接入风险。
 */
function extractPageList(payload: any): DataSourceRecord[] {
  return payload?.data?.list || payload?.data?.records || payload?.list || payload?.rows || [];
}

function extractPageTotal(payload: any): number {
  return Number(payload?.data?.total || payload?.total || 0);
}

function extractData<T = any>(payload: any): T {
  return payload?.data ?? payload;
}

function normalizeRecord(item: any): DataSourceRecord {
  return {
    id: Number(item?.id || 0),
    name: item?.name || '',
    type: item?.type || '',
    typeName: item?.typeName || '',
    category: item?.category || '',
    categoryName: item?.categoryName || '',
    description: item?.description || '',
    host: item?.host || '',
    port: item?.port ?? null,
    databaseName: item?.databaseName || '',
    username: item?.username || '',
    password: item?.password || '',
    connectionUri: item?.connectionUri || '',
    properties: item?.properties || {},
    status: Number(item?.status ?? 1),
    lastTestStatus: item?.lastTestStatus ?? null,
    lastTestMessage: item?.lastTestMessage || '',
    lastTestTime: item?.lastTestTime || '',
    createTime: item?.createTime || '',
    updateTime: item?.updateTime || '',
  };
}

/**
 * 根据不同数据库类型控制通用字段显示。
 * 当前仍保留统一页面，但通过类型规则动态裁剪字段，避免表单被无关参数淹没。
 */
function getBasicFieldVisibility(type?: string) {
  switch (type) {
    case 'sqlite':
      return {
        showHost: false,
        showPort: false,
        showDatabaseName: false,
        showUsername: false,
        showPassword: false,
        showConnectionUri: false,
      };
    case 'neo4j':
      return {
        showHost: true,
        showPort: true,
        showDatabaseName: true,
        showUsername: true,
        showPassword: true,
        showConnectionUri: true,
      };
    case 'mongodb':
      return {
        showHost: true,
        showPort: true,
        showDatabaseName: true,
        showUsername: true,
        showPassword: true,
        showConnectionUri: true,
      };
    case 'oracle':
      return {
        showHost: true,
        showPort: true,
        showDatabaseName: false,
        showUsername: true,
        showPassword: true,
        showConnectionUri: false,
      };
    default:
      return {
        showHost: true,
        showPort: true,
        showDatabaseName: true,
        showUsername: true,
        showPassword: true,
        showConnectionUri: false,
      };
  }
}

/**
 * 把表单值整理成后端所需的统一连接定义。
 * 这里显式裁剪空字符串，避免把一堆无意义空值写回数据库。
 */
function buildPayload(
  values: EditFormValues,
  editRecord?: DataSourceRecord | null,
): DataSourcePayload {
  const properties = Object.entries(values.properties || {}).reduce<Record<string, any>>(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    },
    {},
  );

  // Nebula 兼容：把 databaseName 同步到 properties.spaceName，避免 space 与库名不一致
  if (values.type === 'nebula' && values.databaseName?.trim() && !properties.spaceName) {
    properties.spaceName = values.databaseName.trim();
  }

  return {
    id: editRecord?.id,
    name: values.name?.trim(),
    type: values.type,
    description: values.description?.trim() || undefined,
    host: values.host?.trim() || undefined,
    port: values.port ?? undefined,
    databaseName: values.databaseName?.trim() || undefined,
    username: values.username?.trim() || undefined,
    password: values.password || undefined,
    connectionUri: values.connectionUri?.trim() || undefined,
    properties,
    status: values.status,
  };
}

export default function DataSourcePage() {
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();

  const [data, setData] = useState<DataSourceRecord[]>([]);
  const [typeOptions, setTypeOptions] = useState<SupportedDataSourceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [rowTestingId, setRowTestingId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editRecord, setEditRecord] = useState<DataSourceRecord | null>(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importTarget, setImportTarget] = useState<DataSourceRecord | null>(null);
  const [objectLoading, setObjectLoading] = useState(false);
  const [fieldLoading, setFieldLoading] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [objectOptions, setObjectOptions] = useState<
    Array<{ key: string; title: string; kind: string }>
  >([]);
  const [selectedObjectKeys, setSelectedObjectKeys] = useState<string[]>([]);
  const [selectedTargetObjectKeys, setSelectedTargetObjectKeys] = useState<string[]>([]);
  const [activeObjectKey, setActiveObjectKey] = useState<string>('');
  const [fieldOptions, setFieldOptions] = useState<
    Array<{ label: string; value: string; primaryKey?: boolean }>
  >([]);
  const [selectedFieldsMap, setSelectedFieldsMap] = useState<Record<string, string[]>>({});
  const [keyFieldsMap, setKeyFieldsMap] = useState<Record<string, string[]>>({});
  const [filterExprMap, setFilterExprMap] = useState<Record<string, string>>({});
  const [cursorFieldMap, setCursorFieldMap] = useState<Record<string, string>>({});
  const [objectConfigStatusMap, setObjectConfigStatusMap] = useState<
    Record<string, 'default' | 'custom'>
  >({});
  const [importForm] = Form.useForm<ImportFormValues>();
  const [databaseOptions, setDatabaseOptions] = useState<Array<{ label: string; value: string }>>(
    [],
  );
  const [dbLoading, setDbLoading] = useState(false);
  const [searchValues, setSearchValues] = useState<SearchFormValues>({
    name: undefined,
    type: undefined,
    category: undefined,
    status: undefined,
  });
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
  const [importTasksMap, setImportTasksMap] = useState<Record<number, ImportTaskRecord[]>>({});
  const [importTasksLoadingMap, setImportTasksLoadingMap] = useState<Record<number, boolean>>({});
  const [importTaskDetailVisible, setImportTaskDetailVisible] = useState(false);
  const [selectedImportTask, setSelectedImportTask] = useState<ImportTaskRecord | null>(null);
  const [importRunVisible, setImportRunVisible] = useState(false);
  const [importRunLoading, setImportRunLoading] = useState(false);
  const [selectedRunSource, setSelectedRunSource] = useState<DataSourceRecord | null>(null);
  const [selectedRunTask, setSelectedRunTask] = useState<ImportTaskRecord | null>(null);
  const [importRuns, setImportRuns] = useState<ImportRunRecord[]>([]);
  const [importRunTaskType, setImportRunTaskType] = useState<'MANUAL' | 'CRON' | undefined>();
  const [taskEnableLoadingId, setTaskEnableLoadingId] = useState<number | null>(null);
  const [taskTriggerLoadingId, setTaskTriggerLoadingId] = useState<number | null>(null);

  const currentType = Form.useWatch('type', editForm);
  const importExtractMode = Form.useWatch('extractMode', importForm);
  const importScheduleType = Form.useWatch('scheduleType', importForm);
  const importSimpleType = Form.useWatch(['scheduleConfig', 'simpleType'], importForm);
  const currentTypeMeta = useMemo(
    () => typeOptions.find((item) => item.type === currentType),
    [currentType, typeOptions],
  );
  const fieldVisibility = getBasicFieldVisibility(currentType);

  const fetchSupportedTypes = async () => {
    setMetaLoading(true);
    try {
      const res: any = await getSupportedDataSourceTypes();
      const list = (extractData<any[]>(res) || []) as SupportedDataSourceType[];
      setTypeOptions(list);
    } catch (error) {
      console.error(error);
      message.error('获取数据源类型失败');
    } finally {
      setMetaLoading(false);
    }
  };

  const fetchData = async (targetPage = page, filters = searchValues) => {
    setLoading(true);
    try {
      const res: any = await getDataSourcePage({
        pageNo: targetPage,
        pageSize: PAGE_SIZE,
        name: filters.name || undefined,
        type: filters.type || undefined,
        category: filters.category || undefined,
        status: typeof filters.status === 'number' ? filters.status : undefined,
      });
      setData(extractPageList(res).map(normalizeRecord));
      setTotal(extractPageTotal(res));
    } catch (error) {
      console.error(error);
      message.error('获取数据源列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportedTypes();
  }, []);

  useEffect(() => {
    fetchData(page, searchValues);
  }, [page]);

  const openCreateModal = () => {
    const firstType = typeOptions[0];
    setEditRecord(null);
    setDatabaseOptions([]);
    editForm.setFieldsValue({
      name: '',
      type: firstType?.type,
      description: '',
      host: '',
      port: firstType?.defaultPort ?? undefined,
      databaseName: '',
      username: '',
      password: '',
      connectionUri: '',
      properties: {},
      status: 1,
    });
    setModalVisible(true);
  };

  const openEditModal = (record: DataSourceRecord) => {
    const selectedType = typeOptions.find((item) => item.type === record.type);
    setEditRecord(record);
    loadDatabaseOptions(undefined, record.id);
    editForm.setFieldsValue({
      name: record.name,
      type: record.type,
      description: record.description,
      host: record.host,
      port: record.port ?? selectedType?.defaultPort ?? undefined,
      databaseName: record.databaseName,
      username: record.username,
      password: record.password,
      connectionUri: record.connectionUri,
      properties: record.properties || {},
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleSearch = async () => {
    const values = searchForm.getFieldsValue();
    setSearchValues(values);
    setPage(1);
    await fetchData(1, values);
  };

  const handleSearchValuesChange = async (changedValues: Partial<SearchFormValues>) => {
    const values = {
      ...searchForm.getFieldsValue(),
      ...changedValues,
    };
    setSearchValues(values);
    setPage(1);
    await fetchData(1, values);
  };

  const handleReset = async () => {
    const values = {
      name: undefined,
      type: undefined,
      category: undefined,
      status: undefined,
    };
    searchForm.setFieldsValue(values);
    setSearchValues(values);
    setPage(1);
    await fetchData(1, values);
  };

  const handleSubmit = async () => {
    const values = await editForm.validateFields();
    const payload = buildPayload(values, editRecord);
    setSubmitting(true);
    try {
      const res: any = editRecord
        ? await updateDataSource(payload)
        : await createDataSource(payload);
      if (res?.code === 200 || res?.code === 0 || res?.success === true) {
        message.success(editRecord ? '数据源更新成功' : '数据源创建成功');
        setModalVisible(false);
        setEditRecord(null);
        editForm.resetFields();
        const targetPage = editRecord ? page : 1;
        setPage(targetPage);
        await fetchData(targetPage, searchValues);
      } else {
        message.error(res?.msg || (editRecord ? '数据源更新失败' : '数据源创建失败'));
      }
    } catch (error) {
      console.error(error);
      message.error(editRecord ? '数据源更新失败' : '数据源创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res: any = await deleteDataSource(id);
      if (res?.code === 200 || res?.code === 0 || res?.success === true) {
        message.success('删除成功');
        await fetchData(page, searchValues);
      } else {
        message.error(res?.msg || '删除失败');
      }
    } catch (error) {
      console.error(error);
      message.error('删除失败');
    }
  };

  /**
   * 已保存记录测试连接时，直接复用记录内容。
   * 这样可以保证测试结果和当前库中配置一致，而不是依赖表格上展示的部分字段。
   */
  const handleTableTest = async (record: DataSourceRecord) => {
    setRowTestingId(record.id);
    try {
      const res: any = await testDataSourceConnection({
        id: record.id,
        name: record.name,
        type: record.type,
        description: record.description,
        host: record.host,
        port: record.port,
        databaseName: record.databaseName,
        username: record.username,
        password: record.password,
        connectionUri: record.connectionUri,
        properties: record.properties || {},
        status: record.status,
      });
      const result = extractData<any>(res);
      const latestFilters = searchForm.getFieldsValue();
      if (result?.success) {
        message.success(`连接成功，耗时 ${result?.latencyMs ?? 0} ms`);
        setSearchValues(latestFilters);
        await fetchData(page, latestFilters);
        return;
      }
      const failedMessage = result?.message || '连接失败';
      message.error(failedMessage);
      setData((prev) =>
        prev.map((item) =>
          item.id === record.id
            ? {
                ...item,
                lastTestStatus: 0,
                lastTestMessage: failedMessage,
                lastTestTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              }
            : item,
        ),
      );
    } catch (error) {
      console.error(error);
      const latestFilters = searchForm.getFieldsValue();
      const failedMessage =
        (error as any)?.info?.data?.message ||
        (error as any)?.info?.errorMessage ||
        (error as any)?.message ||
        '连接测试失败';
      message.error(failedMessage);
      setData((prev) =>
        prev.map((item) =>
          item.id === record.id
            ? {
                ...item,
                lastTestStatus: 0,
                lastTestMessage: failedMessage,
                lastTestTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              }
            : item,
        ),
      );
    } finally {
      setRowTestingId(null);
    }
  };

  /**
   * 表单内测试连接支持“先测后存”。
   * 这对首次录入新数据源尤其重要，可以在不落库的情况下先确认连接参数是否正确。
   */
  const handleModalTest = async () => {
    const values = await editForm.validateFields();
    const payload = buildPayload(values, editRecord);
    setTesting(true);
    try {
      const res: any = await testDataSourceConnection(payload);
      const result = extractData<any>(res);
      if (result?.success) {
        message.success(`连接成功，耗时 ${result?.latencyMs ?? 0} ms`);
        // 连接成功后自动拉取数据库 / Space 列表，避免手填库名
        await loadDatabaseOptions(payload, editRecord?.id);
      } else {
        message.error(result?.message || '连接失败');
      }
    } catch (error) {
      console.error(error);
      message.error('连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const extractList = (payload: any) => payload?.data || payload || [];

  const loadDatabaseOptions = async (payload?: DataSourcePayload, dataSourceId?: number) => {
    setDbLoading(true);
    try {
      let res: any;
      if (dataSourceId) {
        res = await listDataSourceDatabasesById(dataSourceId);
      } else if (payload) {
        res = await listDataSourceDatabasesByBody(payload);
      } else {
        setDatabaseOptions([]);
        return;
      }
      const list = (res?.data || res || []) as Array<any>;
      setDatabaseOptions(
        (list || []).map((item) => ({
          label: item.label || item.name,
          value: item.name,
        })),
      );
    } catch (error) {
      console.error(error);
      message.warning('自动获取数据库列表失败，可手动填写');
      setDatabaseOptions([]);
    } finally {
      setDbLoading(false);
    }
  };

  /**
   * 打开“配置导入对象”弹窗：探查表 / 集合 / 标签，再按对象选择字段。
   */
  const openImportModal = async (record: DataSourceRecord) => {
    setImportTarget(record);
    setImportModalVisible(true);
    setSelectedObjectKeys([]);
    setSelectedTargetObjectKeys([]);
    setActiveObjectKey('');
    setFieldOptions([]);
    setSelectedFieldsMap({});
    setKeyFieldsMap({});
    setFilterExprMap({});
    setCursorFieldMap({});
    setObjectConfigStatusMap({});
    importForm.setFieldsValue({
      name: `${record.name}-导入任务`,
      extractMode: 'FULL',
      writeMode: 'UPSERT',
      batchSize: 500,
      maxRowsPerObject: 100,
      scheduleType: 'MANUAL',
      enabled: 1,
      remark: '',
      scheduleConfig: {
        simpleType: 'EVERY_N_MINUTES',
        intervalMinutes: 5,
        dailyTime: '02:00',
      },
      cursorConfig: {
        incrementalMode: 'TIME',
        cursorField: '',
        cursorCompare: '>',
        initialCursor: '1970-01-01 00:00:00',
      },
      triggerNow: true,
    });
    setObjectLoading(true);
    try {
      const res: any = await listDataSourceObjects(record.id);
      const list = extractList(res) as Array<any>;
      setObjectOptions(
        (list || []).map((item) => ({
          key: item.objectName,
          title: `${item.objectName}${item.objectKind ? ` (${item.objectKind})` : ''}`,
          kind: item.objectKind || '',
        })),
      );
    } catch (error) {
      console.error(error);
      message.error('探查数据源对象失败，请确认连接可用');
      setObjectOptions([]);
    } finally {
      setObjectLoading(false);
    }
  };

  /**
   * 按对象探查字段，并默认全选字段；主键字段自动勾为 UPSERT key。
   */
  const loadFieldsForObject = async (
    objectName: string,
    initializeDefaults = false,
    activateObject = true,
  ) => {
    if (!importTarget) return;
    if (activateObject) {
      setActiveObjectKey(objectName);
      setFieldLoading(true);
    }
    try {
      const res: any = await listDataSourceFields(importTarget.id, objectName);
      const list = extractList(res) as Array<any>;
      const options = (list || []).map((item) => ({
        label: `${item.fieldName}${item.fieldType ? ` (${item.fieldType})` : ''}${item.primaryKey ? ' [PK]' : ''}`,
        value: item.fieldName,
        primaryKey: !!item.primaryKey,
      }));
      if (activateObject) {
        setFieldOptions(options);
      }
      if (initializeDefaults) {
        setSelectedFieldsMap((prev) => {
          if (prev[objectName]?.length) return prev;
          return { ...prev, [objectName]: options.map((o) => o.value) };
        });
        setKeyFieldsMap((prev) => {
          if (prev[objectName]?.length) return prev;
          const pks = options.filter((o) => o.primaryKey).map((o) => o.value);
          return { ...prev, [objectName]: pks };
        });
        setObjectConfigStatusMap((prev) => ({ ...prev, [objectName]: 'default' }));
      }
    } catch (error) {
      console.error(error);
      message.error(`探查字段失败：${objectName}`);
      if (activateObject) {
        setFieldOptions([]);
      }
    } finally {
      if (activateObject) {
        setFieldLoading(false);
      }
    }
  };

  const handleImportSubmit = async () => {
    if (!importTarget) return;
    if (!selectedObjectKeys.length) {
      message.warning('请至少选择一个导入对象（表 / 集合 / 标签）');
      return;
    }
    const values = await importForm.validateFields();
    const objects: ImportObjectScope[] = selectedObjectKeys.map((objectName) => {
      const meta = objectOptions.find((item) => item.key === objectName);
      return {
        objectName,
        objectKind: meta?.kind || undefined,
        columns: selectedFieldsMap[objectName] || [],
        keyFields: keyFieldsMap[objectName] || [],
        filterExpr: filterExprMap[objectName] || undefined,
        cursorField: cursorFieldMap[objectName] || undefined,
      };
    });
    const payload = {
      name: values.name,
      dataSourceId: importTarget.id,
      extractMode: values.extractMode,
      scheduleType: values.scheduleType,
      batchSize: values.batchSize,
      maxRowsPerObject: values.maxRowsPerObject,
      writeMode: values.writeMode,
      enabled: values.enabled,
      remark: values.remark || undefined,
      objects,
      cursorConfig:
        values.extractMode === 'INCREMENTAL'
          ? {
              incrementalMode: values.cursorConfig?.incrementalMode,
              cursorField: values.cursorConfig?.cursorField || undefined,
              cursorCompare: values.cursorConfig?.cursorCompare || undefined,
              initialCursor: values.cursorConfig?.initialCursor || undefined,
            }
          : undefined,
      scheduleConfig:
        values.scheduleType === 'CRON'
          ? {
              simpleType: values.scheduleConfig?.simpleType || undefined,
              intervalMinutes:
                values.scheduleConfig?.simpleType === 'EVERY_N_MINUTES'
                  ? values.scheduleConfig?.intervalMinutes
                  : undefined,
              dailyTime:
                values.scheduleConfig?.simpleType === 'DAILY' ||
                values.scheduleConfig?.simpleType === 'ONCE'
                  ? values.scheduleConfig?.dailyTime || '02:00'
                  : undefined,
            }
          : undefined,
    };
    setImportSubmitting(true);
    try {
      const res: any = await createImportTask(payload);
      const ok = res?.code === 200 || res?.code === 0 || res?.success === true;
      if (!ok) {
        message.error(res?.msg || '创建导入任务失败');
        return;
      }
      const taskId = res?.data ?? res;
      message.success('导入任务创建成功');
      if (values.triggerNow) {
        const triggerRes: any = await triggerImportTask(taskId, 'MANUAL');
        if (triggerRes?.code === 200 || triggerRes?.code === 0 || triggerRes?.success === true) {
          message.success(`已触发导入，运行ID：${triggerRes?.data ?? ''}`);
        } else {
          message.warning(triggerRes?.msg || '任务已创建，但触发失败');
        }
      }
      setImportModalVisible(false);
      setImportTarget(null);
      // 寮曞鍘荤粨鏋滈〉鏍稿
      history.push(`/data/import-result?taskId=${taskId}`);
    } catch (error) {
      console.error(error);
      message.error('创建导入任务失败');
    } finally {
      setImportSubmitting(false);
    }
  };

  const loadImportTasks = async (dataSourceId: number) => {
    if (importTasksLoadingMap[dataSourceId]) return;
    setImportTasksLoadingMap((prev) => ({ ...prev, [dataSourceId]: true }));
    try {
      const res: any = await listImportTasksByDataSource(dataSourceId);
      const list = (extractImportData<any[]>(res) || []) as ImportTaskRecord[];
      setImportTasksMap((prev) => ({ ...prev, [dataSourceId]: list }));
    } catch (error) {
      console.error(error);
      message.error('获取导入任务列表失败');
      setImportTasksMap((prev) => ({ ...prev, [dataSourceId]: [] }));
    } finally {
      setImportTasksLoadingMap((prev) => ({ ...prev, [dataSourceId]: false }));
    }
  };

  const handleExpand = async (expanded: boolean, record: DataSourceRecord) => {
    if (!expanded) {
      setExpandedRowKeys([]);
      return;
    }
    setExpandedRowKeys([record.id]);
    await loadImportTasks(record.id);
  };

  const openImportTaskDetail = (record: ImportTaskRecord) => {
    setSelectedImportTask(record);
    setImportTaskDetailVisible(true);
  };

  const closeImportTaskDetail = () => {
    setImportTaskDetailVisible(false);
    setSelectedImportTask(null);
  };

  const fetchImportRuns = async (
    record: DataSourceRecord,
    taskType?: 'MANUAL' | 'CRON',
    taskId?: number,
  ) => {
    setImportRunLoading(true);
    try {
      const res: any = await listImportRunsByDataSource(record.id, taskType, taskId);
      const list = (extractImportData<any[]>(res) || []) as ImportRunRecord[];
      setImportRuns(list);
    } catch (error) {
      console.error(error);
      message.error('获取触发记录失败');
      setImportRuns([]);
    } finally {
      setImportRunLoading(false);
    }
  };

  const openImportRuns = async (record: DataSourceRecord) => {
    setSelectedRunSource(record);
    setSelectedRunTask(null);
    setImportRunTaskType(undefined);
    setImportRunVisible(true);
    await fetchImportRuns(record, undefined);
  };

  const openImportRunsByTask = async (dataSource: DataSourceRecord, task: ImportTaskRecord) => {
    setSelectedRunSource(dataSource);
    setSelectedRunTask(task);
    setImportRunTaskType(undefined);
    setImportRunVisible(true);
    await fetchImportRuns(dataSource, undefined, task.id);
  };

  const handleImportRunTaskTypeChange = async (value?: 'MANUAL' | 'CRON') => {
    setImportRunTaskType(value);
    if (!selectedRunSource) return;
    await fetchImportRuns(selectedRunSource, value, selectedRunTask?.id);
  };

  const closeImportRuns = () => {
    setImportRunVisible(false);
    setSelectedRunSource(null);
    setSelectedRunTask(null);
    setImportRuns([]);
    setImportRunTaskType(undefined);
  };

  const handleToggleImportTaskEnabled = async (record: ImportTaskRecord) => {
    setTaskEnableLoadingId(record.id);
    try {
      const nextEnabled = record.enabled === 1 ? 0 : 1;
      const res: any = await enableImportTask(record.id, nextEnabled);
      const ok =
        res?.code === 200 || res?.code === 0 || res?.success === true || res?.data === true;
      if (!ok) {
        message.error(res?.msg || '更新导入任务状态失败');
        return;
      }
      message.success(nextEnabled === 1 ? '导入任务已启用' : '导入任务已停用');
      await loadImportTasks(record.dataSourceId);
    } catch (error) {
      console.error(error);
      message.error('更新导入任务状态失败');
    } finally {
      setTaskEnableLoadingId(null);
    }
  };

  const handleDeleteImportTask = async (record: ImportTaskRecord) => {
    setTaskEnableLoadingId(record.id);
    try {
      const res: any = await deleteImportTask(record.id);
      const ok =
        res?.code === 200 || res?.code === 0 || res?.success === true || res?.data === true;
      if (!ok) {
        message.error(res?.msg || '删除导入任务失败');
        return;
      }
      message.success('导入任务已删除');
      await loadImportTasks(record.dataSourceId);
    } catch (error) {
      console.error(error);
      message.error('删除导入任务失败');
    } finally {
      setTaskEnableLoadingId(null);
    }
  };

  const handleTriggerImportTask = async (record: ImportTaskRecord) => {
    setTaskTriggerLoadingId(record.id);
    try {
      const res: any = await triggerImportTask(record.id, 'MANUAL');
      const ok = res?.code === 200 || res?.code === 0 || res?.success === true;
      if (!ok) {
        message.error(res?.msg || '触发导入任务失败');
        return;
      }
      message.success(`已触发导入任务，运行ID：${res?.data ?? ''}`);
      await loadImportTasks(record.dataSourceId);
    } catch (error) {
      console.error(error);
      message.error('触发导入任务失败');
    } finally {
      setTaskTriggerLoadingId(null);
    }
  };

  const formatTaskValue = (value: any): string => {
    if (value === undefined || value === null || value === '') {
      return '-';
    }
    if (Array.isArray(value)) {
      return value.length ? value.join(', ') : '-';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch (_error) {
        return '-';
      }
    }
    return String(value);
  };

  const formatTaskDateTime = (value?: string | number | null) => {
    if (value === undefined || value === null || value === '') {
      return '-';
    }
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : String(value);
  };

  const getTaskStatusTag = (status?: string) => {
    if (!status) {
      return <Tag>-</Tag>;
    }
    if (status === 'SUCCESS') {
      return <Tag color="success">成功</Tag>;
    }
    if (status === 'FAIL' || status === 'FAILED') {
      return <Tag color="error">失败</Tag>;
    }
    if (status === 'PARTIAL') {
      return <Tag color="warning">部分成功</Tag>;
    }
    if (status === 'CANCELLED') {
      return <Tag color="default">已取消</Tag>;
    }
    if (status === 'RUNNING') {
      return <Tag color="processing">运行中</Tag>;
    }
    return <Tag>{status}</Tag>;
  };

  const formatTaskStatus = (status?: string) => {
    if (!status) return '-';
    if (status === 'SUCCESS') return '成功';
    if (status === 'FAIL' || status === 'FAILED') return '失败';
    if (status === 'PARTIAL') return '部分成功';
    if (status === 'CANCELLED') return '已取消';
    if (status === 'RUNNING') return '运行中';
    return status;
  };

  const formatTriggerType = (value?: string) => {
    if (!value) return '-';
    const map: Record<string, string> = {
      MANUAL: '手动触发',
      CRON: '定时触发',
      ONCE: '单次触发',
    };
    return map[value] || value;
  };

  const getTriggerTypeTag = (value?: string) => {
    if (!value) return <Tag>-</Tag>;
    if (value === 'MANUAL') return <Tag color="blue">手动触发</Tag>;
    if (value === 'CRON') return <Tag color="purple">定时任务</Tag>;
    if (value === 'ONCE') return <Tag color="cyan">单次触发</Tag>;
    return <Tag>{formatTriggerType(value)}</Tag>;
  };

  const formatExtractMode = (value?: string) => {
    if (!value) return '-';
    const map: Record<string, string> = {
      FULL: '全量',
      INCREMENTAL: '增量',
    };
    return map[value] || value;
  };

  const formatScheduleType = (value?: string) => {
    if (!value) return '-';
    const map: Record<string, string> = {
      MANUAL: '手动触发',
      CRON: '定时调度',
      ONCE: '执行一次',
    };
    return map[value] || value;
  };

  const formatScheduleSimpleType = (value?: string) => {
    if (!value) return '-';
    const map: Record<string, string> = {
      EVERY_N_MINUTES: '每 N 分钟',
      DAILY: '每天固定时间',
      ONCE: '执行一次',
    };
    return map[value] || value;
  };

  const formatWriteMode = (value?: string) => {
    if (!value) return '-';
    const map: Record<string, string> = {
      UPSERT: '覆盖',
      APPEND: '追加',
    };
    return map[value] || value;
  };

  const formatIncrementalMode = (value?: string) => {
    if (!value) return '-';
    const map: Record<string, string> = {
      TIME: '按时间字段',
    };
    return map[value] || value;
  };

  const getWriteModeTagColor = (value?: string) => {
    if (value === 'UPSERT') return 'blue';
    if (value === 'APPEND') return 'gold';
    return 'default';
  };

  const renderTaskObjectSummary = (record: ImportTaskRecord) => {
    const objects = record.objects || [];
    if (!objects.length) {
      return <Text type="secondary">-</Text>;
    }
    const firstObject = objects[0];
    const extraCount = objects.length - 1;
    return (
      <Space direction="vertical" size={2}>
        <Text>{firstObject?.objectName || '-'}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {firstObject?.objectKind || '-'} / 字段 {firstObject?.columns?.length ?? 0} / 主键{' '}
          {firstObject?.keyFields?.length ?? 0}
          {extraCount > 0 ? ` / 另外 ${extraCount} 个对象` : ''}
        </Text>
      </Space>
    );
  };

  const importRunColumns: ColumnsType<ImportRunRecord> = [
    {
      title: '任务',
      key: 'taskTrigger',
      width: 240,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.taskName || '-'}</Text>
          {getTriggerTypeTag(record.triggerType)}
        </Space>
      ),
    },
    {
      title: '执行状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value) => getTaskStatusTag(value),
    },
    {
      title: '执行时间',
      key: 'timeRange',
      width: 380,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            触发：{formatTaskDateTime(record.triggeredAt)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            开始：{formatTaskDateTime(record.startedAt)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            结束：{formatTaskDateTime(record.finishedAt)}
          </Text>
        </Space>
      ),
    },
    {
      title: '执行统计',
      key: 'stats',
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            读 / 写 / 跳过 / 失败：{formatTaskValue(record.readCount)} /{' '}
            {formatTaskValue(record.writeCount)} / {formatTaskValue(record.skipCount)} / &nbsp;
            {formatTaskValue(record.failCount)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            总字节： {formatTaskValue(record.byteCount)}
          </Text>
        </Space>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progressPercent',
      key: 'progressPercent',
      width: 180,
      render: (value?: number) =>
        value === undefined || value === null ? (
          <Text>-</Text>
        ) : (
          <Progress
            percent={Math.max(0, Math.min(100, value))}
            size="small"
            status={value >= 100 ? 'success' : 'active'}
            format={(percent) => `${percent ?? 0}%`}
          />
        ),
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      width: 280,
      render: (_, record) => (
        <Text
          type={record.errorMessage ? 'danger' : undefined}
          ellipsis={{ tooltip: record.errorMessage || '-' }}
        >
          {record.errorCode} - {record.errorMessage}
        </Text>
      ),
    },
  ];

  const detailLabelStyle: React.CSSProperties = {
    width: 108,
    flexShrink: 0,
    color: '#8c8c8c',
    fontSize: 12,
    lineHeight: '22px',
  };

  const detailValueStyle: React.CSSProperties = {
    flex: 1,
    color: '#262626',
    fontSize: 13,
    lineHeight: '22px',
    wordBreak: 'break-all',
  };

  const renderDetailLine = (label: string, value: any, key?: string) => (
    <div
      key={key || label}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '6px 0',
        borderBottom: '1px dashed #f0f0f0',
      }}
    >
      <div style={detailLabelStyle}>{label}</div>
      <div style={detailValueStyle}>{formatTaskValue(value)}</div>
    </div>
  );

  const renderTagDetailLine = (label: string, tagNode: React.ReactNode, key?: string) => (
    <div
      key={key || label}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '6px 0',
        borderBottom: '1px dashed #f0f0f0',
      }}
    >
      <div style={detailLabelStyle}>{label}</div>
      <div style={detailValueStyle}>{tagNode}</div>
    </div>
  );

  const importTaskColumns: ColumnsType<ImportTaskRecord> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.id ?? '-'} / 批次: {formatTaskValue(record.batchSize)} / 限流条数:{' '}
            {formatTaskValue(record.maxRowsPerObject)}
          </Text>
        </Space>
      ),
    },
    {
      title: '执行配置',
      key: 'config',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag
            color={getWriteModeTagColor(record.writeMode)}
            style={{ marginInlineEnd: 0, width: 'fit-content' }}
          >
            {formatWriteMode(record.writeMode)}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatExtractMode(record.extractMode)} / {formatScheduleType(record.scheduleType)}
            {record.cronExpr ? ` / ${record.cronExpr}` : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: '对象概览',
      key: 'objectSummary',
      width: 280,
      render: (_, record) => renderTaskObjectSummary(record),
    },
    {
      title: '启停',
      key: 'writeEnabled',
      width: 100,
      render: (_, record) => (
        <>{record.enabled === 1 ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>}</>
      ),
    },
    {
      title: '最近运行',
      key: 'lastRun',
      width: 200,
      render: (_, record) =>
        record.lastRunStatus || record.lastRunTime ? (
          <Space direction="vertical" size={2}>
            {getTaskStatusTag(record.lastRunStatus)}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatTaskDateTime(record.lastRunTime)}
            </Text>
          </Space>
        ) : (
          <Text type="secondary">未运行</Text>
        ),
    },
    {
      title: '最近触发时间',
      dataIndex: 'lastTriggerTime',
      key: 'lastTriggerTime',
      width: 180,
      render: (value?: string | number | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatTaskDateTime(value)}
        </Text>
      ),
    },
    {
      title: '下次触发时间',
      dataIndex: 'nextTriggerTime',
      key: 'nextTriggerTime',
      width: 180,
      render: (value?: string | number | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatTaskDateTime(value)}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 360,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<SearchOutlined />}
            onClick={() => openImportTaskDetail(record)}
          >
            查看详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PoweroffOutlined />}
            loading={taskEnableLoadingId === record.id}
            onClick={() => handleToggleImportTaskEnabled(record)}
          >
            {record.enabled === 1 ? '停用' : '启用'}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            loading={taskTriggerLoadingId === record.id}
            onClick={() => handleTriggerImportTask(record)}
          >
            触发
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ClockCircleOutlined />}
            onClick={() => {
              const parentSource =
                data.find((item) => item.id === record.dataSourceId) || selectedRunSource;
              if (!parentSource) {
                message.warning('未找到所属数据源');
                return;
              }
              openImportRunsByTask(parentSource, record);
            }}
          >
            触发记录
          </Button>
          <Popconfirm
            title="确认删除该导入任务吗？"
            onConfirm={() => handleDeleteImportTask(record)}
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={taskEnableLoadingId === record.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: DataSourceRecord) => {
    const taskList = importTasksMap[record.id] || [];
    const taskLoading = !!importTasksLoadingMap[record.id];
    return (
      <div
        style={{
          margin: '0 0 12px 52px',
          paddingLeft: 16,
          borderLeft: '3px solid #bcd3ff',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: -8,
            top: 18,
            width: 13,
            height: 13,
            borderRadius: '50%',
            background: '#dbeafe',
            border: '2px solid #8fb6f5',
          }}
        />
        <div
          style={{
            background: '#f7faff',
            border: '1px solid #dbe7ff',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#edf4ff',
              borderBottom: '1px solid #dbe7ff',
            }}
          >
            <Space size={8}>
              <Text strong style={{ fontSize: 13, color: '#315b96' }}>
                导入任务
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.name} 的关联导入任务列表
              </Text>
            </Space>
            <Space size={8}>
              <Tag
                style={{
                  marginInlineEnd: 0,
                  color: '#315b96',
                  background: '#f7fbff',
                  borderColor: '#c7dafc',
                  borderRadius: 999,
                }}
              >
                {taskList.length} 个
              </Tag>
              <Button type="primary" size="small" onClick={() => openImportModal(record)}>
                新建导入任务
              </Button>
            </Space>
          </div>
          <div style={{ padding: '12px 14px 14px', background: '#f7faff' }}>
            <Table<ImportTaskRecord>
              rowKey="id"
              size="small"
              loading={taskLoading}
              dataSource={taskList}
              columns={importTaskColumns}
              pagination={false}
              locale={{ emptyText: taskLoading ? '导入任务加载中...' : '暂无关联导入任务' }}
              style={{ background: '#ffffff', borderRadius: 8 }}
            />
          </div>
        </div>
      </div>
    );
  };

  const columns: ColumnsType<DataSourceRecord> = [
    {
      title: '数据源名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || '未填写说明'}
          </Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'typeName',
      key: 'typeName',
      width: 160,
      render: (_, record) => (
        <Space size={6} wrap>
          <Tag color="blue">{record.typeName || record.type}</Tag>
          <Tag>{record.categoryName || record.category}</Tag>
        </Space>
      ),
    },
    {
      title: '连接信息',
      key: 'connection',
      width: 260,
      render: (_, record) => {
        const isTesting = rowTestingId === record.id;
        const connectionText = record.connectionUri
          ? record.connectionUri
          : [record.host, record.port, record.databaseName].filter(Boolean).join(' / ');
        return <Text>{connectionText || '-'}</Text>;
      },
    },
    {
      title: '数据库 / 空间',
      key: 'databaseName',
      width: 160,
      render: (_, record) => {
        const db =
          record.databaseName || record.properties?.spaceName || record.properties?.filePath || '-';
        return <Text code>{db}</Text>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: number) => (value === 1 ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '最近测试',
      key: 'lastTest',
      width: 260,
      render: (_, record) => {
        const isTesting = rowTestingId === record.id;
        const statusTag = isTesting ? (
          <Tag color="processing">测试中</Tag>
        ) : record.lastTestStatus === 1 ? (
          <Tag color="success">成功</Tag>
        ) : record.lastTestStatus === 0 ? (
          <Tag color="error">失败</Tag>
        ) : (
          <Tag>未测试</Tag>
        );
        return (
          <Space direction="vertical" size={2}>
            <Space size={6}>
              {statusTag}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {isTesting
                  ? '测试连接中...'
                  : record.lastTestTime
                    ? dayjs(record.lastTestTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
              </Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isTesting
                ? '正在测试当前数据源连接，请稍候查看结果'
                : record.lastTestMessage || '暂无测试记录'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      fixed: 'right',
      render: (_, record) => (
        <Space size={8} wrap>
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            loading={rowTestingId === record.id}
            onClick={() => handleTableTest(record)}
          >
            测试连接
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<FileSearchOutlined />}
            onClick={() => history.push(`/data/import-result?dataSourceId=${record.id}`)}
          >
            导入结果
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ClockCircleOutlined />}
            onClick={() => openImportRuns(record)}
          >
            触发记录
          </Button>
          <Popconfirm title="确认删除该数据源吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <Space direction="vertical" size={6}>
          <Text strong style={{ fontSize: 18 }}>
            数据源接入
          </Text>
        </Space>
      </Card>

      {/* <Card bordered={false} loading={metaLoading}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'nowrap',
            width: '100%',
          }}
        >
          {typeOptions.map((item) => (
            <Card
              key={item.type}
              size="small"
              hoverable
              style={{
                flex: 1,
                borderRadius: 14,
                border: '1px solid #b3d8ff',
                background: 'linear-gradient(180deg, #f5faff 0%, #ecf5ff 100%)',
                boxShadow: '0 8px 18px rgba(64, 158, 255, 0.12)',
              }}
              bodyStyle={{ padding: 14 }}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Tag
                    style={{
                      marginInlineEnd: 0,
                      borderRadius: 999,
                      paddingInline: 10,
                      fontWeight: 600,
                      color: '#409eff',
                      background: '#ffffff',
                      borderColor: '#c6e2ff',
                    }}
                  >
                    {item.typeName}
                  </Tag>
                  <Tag
                    style={{
                      marginInlineEnd: 0,
                      borderColor: '#d9ecff',
                      color: '#409eff',
                      background: '#f0f7ff',
                      borderRadius: 999,
                      paddingInline: 10,
                    }}
                  >
                    {item.categoryName}
                  </Tag>
                </Space>
                <Space direction="vertical" size={4}>
                  <Text style={{ fontSize: 12, color: '#303133' }}>类型编码：{item.type}</Text>
                  <Text style={{ fontSize: 12, color: '#606266' }}>
                    默认端口：{item.defaultPort ?? '无'}
                  </Text>
                </Space>
              </Space>
            </Card>
          ))}
        </div>
      </Card> */}

      <Card bordered={false}>
        <Form form={searchForm} layout="vertical">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #f0f7ff 0%, #fafcff 100%)',
              borderRadius: 8,
              border: '1px solid #d6e4ff',
              boxShadow: '0 1px 2px rgba(24,144,255,0.06)',
              overflowX: 'auto',
            }}
          >
            <Space size={12} align="end" wrap={false}>
              <div style={{ minWidth: 220, flex: '0 0 220px' }}>
                <Form.Item name="name" label="数据源名称" style={{ marginBottom: 0 }}>
                  <Input
                    placeholder="请输入数据源名称"
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                    allowClear
                    onChange={(e) =>
                      handleSearchValuesChange({ name: e.target.value || undefined })
                    }
                  />
                </Form.Item>
              </div>
              <div style={{ minWidth: 180, flex: '0 0 180px' }}>
                <Form.Item name="type" label="数据源类型" style={{ marginBottom: 0 }}>
                  <Select
                    allowClear
                    placeholder="请选择数据源类型"
                    options={typeOptions.map((item) => ({
                      label: item.typeName,
                      value: item.type,
                    }))}
                    onChange={(value) => handleSearchValuesChange({ type: value })}
                  />
                </Form.Item>
              </div>
              <div style={{ minWidth: 180, flex: '0 0 180px' }}>
                <Form.Item name="category" label="数据库分类" style={{ marginBottom: 0 }}>
                  <Select
                    allowClear
                    placeholder="请选择数据库分类"
                    options={[
                      { label: '关系型数据库', value: 'relational' },
                      { label: '图数据库', value: 'graph' },
                      { label: '文档数据库', value: 'document' },
                    ]}
                    onChange={(value) => handleSearchValuesChange({ category: value })}
                  />
                </Form.Item>
              </div>
              <div style={{ minWidth: 160, flex: '0 0 160px' }}>
                <Form.Item name="status" label="启停状态" style={{ marginBottom: 0 }}>
                  <Select
                    allowClear
                    placeholder="请选择状态"
                    options={[
                      { label: '启用', value: 1 },
                      { label: '停用', value: 0 },
                    ]}
                    onChange={(value) => handleSearchValuesChange({ status: value })}
                  />
                </Form.Item>
              </div>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
            <Space size={12} wrap={false}>
              <Button icon={<ReloadOutlined />} onClick={() => fetchData(page, searchValues)}>
                刷新
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                新增数据源
              </Button>
            </Space>
          </div>
        </Form>
      </Card>

      <Card bordered={false}>
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            background: '#f5f9ff',
            border: '1px solid #dbe7ff',
            borderRadius: 10,
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            点击每行前面的展开按钮，可查看或新建该数据源的导入任务。
          </Text>
        </div>
        <Table<DataSourceRecord>
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          expandable={{
            expandedRowKeys,
            onExpand: handleExpand,
            expandedRowRender,
            expandIcon: ({ expanded, onExpand, record }) => (
              <Tooltip
                title={expanded ? '收起该数据源的导入任务列表' : '展开该数据源的导入任务列表'}
              >
                <Button
                  type="text"
                  size="small"
                  onClick={(event) => onExpand(record, event)}
                  style={{
                    width: 24,
                    height: 24,
                    padding: 0,
                    borderRadius: 999,
                    border: expanded ? '1px solid #91baff' : '1px solid #d9e7ff',
                    background: expanded ? '#edf4ff' : '#ffffff',
                    color: '#3166af',
                  }}
                  icon={
                    <CaretRightOutlined
                      style={{
                        fontSize: 12,
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  }
                />
              </Tooltip>
            ),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (count) => `共 ${count} 条`,
            onChange: (nextPage) => setPage(nextPage),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editRecord ? '编辑数据源' : '新增数据源'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditRecord(null);
          editForm.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={900}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button key="test" icon={<LinkOutlined />} loading={testing} onClick={handleModalTest}>
            测试连接
          </Button>,
          <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
            保存
          </Button>,
        ]}
      >
        <Form<EditFormValues>
          form={editForm}
          layout="vertical"
          onValuesChange={(changedValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, 'type')) {
              const nextType = typeOptions.find((item) => item.type === changedValues.type);
              editForm.setFieldsValue({
                port: nextType?.defaultPort ?? undefined,
                properties: {},
                connectionUri: '',
              });
            }
          }}
        >
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="数据源名称"
                rules={[{ required: true, message: '请输入数据源名称' }]}
              >
                <Input placeholder="例如：业务主库 MySQL" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="数据源类型"
                rules={[{ required: true, message: '请选择数据源类型' }]}
              >
                <Select
                  placeholder="请选择数据源类型"
                  options={typeOptions.map((item) => ({ label: item.typeName, value: item.type }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="数据源说明">
                <Input.TextArea
                  rows={3}
                  placeholder="说明该数据源承载的业务域、主要用途和后续导入目标"
                  maxLength={300}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="启停状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select
                  options={[
                    { label: '启用', value: 1 },
                    { label: '停用', value: 0 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {fieldVisibility.showConnectionUri && (
            <Row gutter={[16, 8]}>
              <Col span={24}>
                <Form.Item name="connectionUri" label="连接 URI">
                  <Input placeholder="例如：bolt://127.0.0.1:7687 或 mongodb://user:pass@127.0.0.1:27017/db" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={[16, 8]}>
            {fieldVisibility.showHost && (
              <Col span={12}>
                <Form.Item
                  name="host"
                  label="主机地址"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('host')
                      ? [{ required: true, message: '请输入主机地址' }]
                      : undefined
                  }
                >
                  <Input placeholder="例如：127.0.0.1" />
                </Form.Item>
              </Col>
            )}
            {fieldVisibility.showPort && (
              <Col span={12}>
                <Form.Item
                  name="port"
                  label="端口"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('port')
                      ? [{ required: true, message: '请输入端口' }]
                      : undefined
                  }
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    max={65535}
                    placeholder="请输入端口"
                  />
                </Form.Item>
              </Col>
            )}
            {fieldVisibility.showDatabaseName && (
              <Col span={12}>
                <Form.Item
                  name="databaseName"
                  label="数据库 / Space"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('databaseName')
                      ? [{ required: true, message: '请选择或输入数据库' }]
                      : undefined
                  }
                  extra="连接成功后可下拉选择，也可手动输入"
                >
                  <AutoComplete
                    allowClear
                    loading={dbLoading}
                    options={databaseOptions}
                    placeholder="测试连接后可下拉选择，也可手动输入"
                    filterOption={(input, option) =>
                      String(option?.label || option?.value || '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    onFocus={async () => {
                      if (databaseOptions.length) return;
                      const values = editForm.getFieldsValue();
                      const payload = buildPayload(values, editRecord);
                      await loadDatabaseOptions(payload, editRecord?.id);
                    }}
                  />
                </Form.Item>
              </Col>
            )}
            {fieldVisibility.showUsername && (
              <Col span={12}>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('username')
                      ? [{ required: true, message: '请输入用户名' }]
                      : undefined
                  }
                >
                  <Input placeholder="请输入用户名" autoComplete="off" />
                </Form.Item>
              </Col>
            )}
            {fieldVisibility.showPassword && (
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={
                    currentTypeMeta?.requiredBasicFields.includes('password')
                      ? [{ required: true, message: '请输入密码' }]
                      : undefined
                  }
                  extra={
                    editRecord
                      ? '编辑时如需保留原密码，可直接使用当前值；后端会在空密码场景下兜底保留。'
                      : undefined
                  }
                >
                  <Input.Password placeholder="请输入密码" autoComplete="new-password" />
                </Form.Item>
              </Col>
            )}
          </Row>

          {currentTypeMeta?.propertyFields?.length ? (
            <Card
              size="small"
              title="类型专属参数"
              style={{ marginTop: 8, background: '#fafafa' }}
              bodyStyle={{ paddingBottom: 8 }}
            >
              <Row gutter={[16, 8]}>
                {currentTypeMeta.propertyFields.map((field) => (
                  <Col span={12} key={field.key}>
                    <Form.Item
                      name={['properties', field.key]}
                      label={field.label}
                      rules={
                        field.required
                          ? [{ required: true, message: `请输入${field.label}` }]
                          : undefined
                      }
                      extra={field.helpText}
                    >
                      {field.inputType === 'number' ? (
                        <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} />
                      ) : field.inputType === 'password' ? (
                        <Input.Password placeholder={field.placeholder} />
                      ) : (
                        <Input placeholder={field.placeholder} />
                      )}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Card>
          ) : null}
        </Form>
      </Modal>

      <Modal
        title={
          importTarget
            ? `新建导入任务 - ${importTarget.name} / 库: ${importTarget.databaseName || importTarget.properties?.spaceName || '-'}`
            : '新建导入任务'
        }
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportTarget(null);
        }}
        onOk={handleImportSubmit}
        confirmLoading={importSubmitting}
        width={980}
        destroyOnClose
        okText="确认"
      >
        <div style={{ marginBottom: 12, color: '#64748b', fontSize: 13 }}>
          数据源：
          <Text strong>{importTarget?.name}</Text>
          {' / '}
          <Text code>{importTarget?.type}</Text>
          {' / 库：'}
          <Text code>
            {importTarget?.databaseName || importTarget?.properties?.spaceName || '-'}
          </Text>
          <Text type="secondary">（支持全量 / 增量、手动 / 定时任务配置）</Text>
        </div>
        <Form form={importForm} layout="vertical">
          <Card
            size="small"
            title="基础配置"
            style={{ marginBottom: 16, background: '#fafcff' }}
            bodyStyle={{ paddingBottom: 8 }}
          >
            <Row gutter={16}>
              <Col span={10}>
                <Form.Item
                  name="name"
                  label="任务名称"
                  rules={[{ required: true, message: '请输入任务名称' }]}
                >
                  <Input placeholder="请输入导入任务名称" />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="extractMode" label="抽取方式" rules={[{ required: true }]}>
                  <Select
                    disabled={importScheduleType === 'CRON'}
                    options={[
                      { label: '全量', value: 'FULL' },
                      { label: '增量', value: 'INCREMENTAL' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="scheduleType" label="调度方式" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { label: '手动触发', value: 'MANUAL' },
                      { label: '定时任务', value: 'CRON' },
                    ]}
                    onChange={(value) => {
                      if (value === 'CRON') {
                        importForm.setFieldValue('extractMode', 'INCREMENTAL');
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="writeMode" label="写入模式">
                  <Select
                    options={[
                      { label: 'UPSERT 覆盖', value: 'UPSERT' },
                      { label: 'APPEND 追加', value: 'APPEND' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="batchSize" label="批大小">
                  <InputNumber min={50} max={5000} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="maxRowsPerObject" label="限流条数" extra="0=不限制">
                  <InputNumber min={0} max={10000000} style={{ width: '100%' }} placeholder="100" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="enabled" label="启用状态">
                  <Select
                    options={[
                      { label: '启用', value: 1 },
                      { label: '停用', value: 0 },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="triggerNow" label="保存后立即执行" valuePropName="checked">
                  <Checkbox>立即触发</Checkbox>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="remark" label="任务备注">
                  <Input.TextArea
                    rows={2}
                    placeholder="可填写该任务的用途、同步说明或备注信息"
                    maxLength={300}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {importScheduleType === 'CRON' && (
            <Card
              size="small"
              title="定时配置"
              style={{ marginBottom: 16, background: '#fafcff' }}
              bodyStyle={{ paddingBottom: 8 }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name={['scheduleConfig', 'simpleType']}
                    label="调度类型"
                    rules={[{ required: true, message: '请选择调度类型' }]}
                  >
                    <Select
                      options={[
                        { label: '每 N 分钟', value: 'EVERY_N_MINUTES' },
                        { label: '每天固定时间', value: 'DAILY' },
                        { label: '执行一次', value: 'ONCE' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                {importSimpleType === 'EVERY_N_MINUTES' && (
                  <Col span={8}>
                    <Form.Item
                      name={['scheduleConfig', 'intervalMinutes']}
                      label="间隔分钟数"
                      rules={[{ required: true, message: '请输入间隔分钟数' }]}
                    >
                      <InputNumber min={1} max={1440} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                )}
                {(importSimpleType === 'DAILY' || importSimpleType === 'ONCE') && (
                  <Col span={8}>
                    <Form.Item
                      name={['scheduleConfig', 'dailyTime']}
                      label="执行时间"
                      extra="HH:mm 格式；不填默认 02:00"
                      rules={[
                        {
                          validator: async (_, value) => {
                            if (!value) {
                              return Promise.reject(new Error('请输入执行时间'));
                            }
                            if (!HH_MM_PATTERN.test(String(value))) {
                              return Promise.reject(new Error('请输入正确的 HH:mm 格式'));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input placeholder="例如：02:30" />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </Card>
          )}

          {importExtractMode === 'INCREMENTAL' && (
            <Card
              size="small"
              title="增量配置"
              style={{ marginBottom: 16, background: '#fafcff' }}
              bodyStyle={{ paddingBottom: 8 }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name={['cursorConfig', 'incrementalMode']} label="增量模式">
                    <Select options={[{ label: '按时间字段', value: 'TIME' }]} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name={['cursorConfig', 'cursorField']}
                    label="游标字段"
                    rules={[{ required: true, message: '请输入游标字段' }]}
                  >
                    <Input placeholder="例如：update_time" />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name={['cursorConfig', 'cursorCompare']} label="比较方式">
                    <Select options={[{ label: '>', value: '>' }]} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['cursorConfig', 'initialCursor']}
                    label="初始游标"
                    rules={[{ required: true, message: '请输入初始游标' }]}
                  >
                    <Input placeholder="例如：1970-01-01 00:00:00" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}
        </Form>

        <Divider orientation="left">
          选择对象
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12, fontWeight: 400 }}>
            请在左侧勾选后移入右侧
          </Text>
        </Divider>
        <Spin spinning={objectLoading}>
          <Transfer
            dataSource={objectOptions}
            titles={['可选对象', '已选对象']}
            targetKeys={selectedObjectKeys}
            onChange={async (next) => {
              const nextKeys = next as string[];
              const addedKeys = nextKeys.filter((key) => !selectedObjectKeys.includes(key));
              setSelectedObjectKeys(nextKeys);
              setSelectedTargetObjectKeys((prev) => prev.filter((key) => nextKeys.includes(key)));
              if (!nextKeys.length) {
                setActiveObjectKey('');
                setFieldOptions([]);
                return;
              }
              for (const key of addedKeys) {
                // New right-side objects get a full default configuration immediately.
                // We keep the current active object unchanged while initializing siblings.
                // This avoids the previous behavior where only one object got defaults.
                // The first added object is activated if nothing is currently active.
                // Later explicit user clicks can still switch to any object for edits.
                // Default configuration means all fields selected and source PKs prefilled.
                // Status starts as "default" until the user changes any object-level settings.
                await loadFieldsForObject(key, true, !activeObjectKey && key === addedKeys[0]);
              }
              if (!activeObjectKey && nextKeys.length && !addedKeys.length) {
                await loadFieldsForObject(String(nextKeys[0]), false, true);
              }
            }}
            onSelectChange={(sourceSelectedKeys, targetSelectedKeys) => {
              setSelectedTargetObjectKeys(targetSelectedKeys as string[]);
            }}
            render={(item) => {
              const isTargetItem = selectedObjectKeys.includes(String(item.key));
              const configStatus = objectConfigStatusMap[String(item.key)] || 'default';
              return {
                label: (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      width: '100%',
                    }}
                  >
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </span>
                    {isTargetItem ? (
                      configStatus === 'custom' ? (
                        <Tag color="processing" style={{ marginInlineEnd: 0 }}>
                          自定义配置
                        </Tag>
                      ) : (
                        <Tag color="default" style={{ marginInlineEnd: 0 }}>
                          默认配置
                        </Tag>
                      )
                    ) : null}
                  </div>
                ),
                value: item.title,
              };
            }}
            style={{ width: '100%' }}
            listStyle={{
              width: 'calc(50% - 8px)',
              height: 280,
              flex: 1,
            }}
            showSearch
            filterOption={(input, item) =>
              (item.title || '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Spin>

        {!!selectedObjectKeys.length && (
          <>
            <Divider orientation="left">选择字段（当前：{activeObjectKey || '未选择'}）</Divider>
            <Card
              size="small"
              style={{ marginBottom: 12, background: '#fafcff' }}
              bodyStyle={{ padding: 12 }}
            >
              <Space size={[8, 8]} wrap>
                {selectedObjectKeys.map((objectName) => {
                  const objectMeta = objectOptions.find((item) => item.key === objectName);
                  const isActive = activeObjectKey === objectName;
                  const configStatus = objectConfigStatusMap[objectName] || 'default';
                  return (
                    <Space
                      key={objectName}
                      size={6}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        border: isActive ? '1px solid #91baff' : '1px solid #d9e7ff',
                        background: isActive ? '#edf4ff' : '#ffffff',
                      }}
                    >
                      <Button
                        size="small"
                        type="link"
                        onClick={() => loadFieldsForObject(objectName, true)}
                        style={{
                          padding: 0,
                          height: 'auto',
                          color: '#315b96',
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {objectMeta?.title || objectName}
                      </Button>
                      {configStatus === 'custom' ? (
                        <Tag color="processing" style={{ marginInlineEnd: 0 }}>
                          自定义配置
                        </Tag>
                      ) : (
                        <Tag color="default" style={{ marginInlineEnd: 0 }}>
                          默认配置
                        </Tag>
                      )}
                    </Space>
                  );
                })}
              </Space>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  这里展示所有已选对象；移到右侧后会自动生成默认配置，点击对象名称可切换并改成自定义配置。
                </Text>
              </div>
            </Card>
            <Spin spinning={fieldLoading}>
              <Checkbox.Group
                style={{ width: '100%' }}
                value={activeObjectKey ? selectedFieldsMap[activeObjectKey] || [] : []}
                onChange={(checked) => {
                  if (!activeObjectKey) return;
                  setSelectedFieldsMap((prev) => ({
                    ...prev,
                    [activeObjectKey]: checked as string[],
                  }));
                  setObjectConfigStatusMap((prev) => ({ ...prev, [activeObjectKey]: 'custom' }));
                }}
              >
                <Row gutter={[8, 8]}>
                  {fieldOptions.map((field) => (
                    <Col span={8} key={field.value}>
                      <Checkbox value={field.value}>{field.label}</Checkbox>
                    </Col>
                  ))}
                  {!fieldOptions.length && (
                    <Col span={24}>
                      <Text type="secondary">请先在上方选择一个对象，系统将自动探查字段。</Text>
                    </Col>
                  )}
                </Row>
              </Checkbox.Group>
              {!!fieldOptions.length && (
                <Card
                  size="small"
                  style={{ marginTop: 12, background: '#fafcff' }}
                  bodyStyle={{ paddingBottom: 8 }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary">主键字段（用于 UPSERT）：</Text>
                      <Select
                        mode="multiple"
                        style={{ width: '100%', marginTop: 8 }}
                        placeholder="可选，默认使用源主键或自动哈希"
                        value={activeObjectKey ? keyFieldsMap[activeObjectKey] || [] : []}
                        options={fieldOptions.map((f) => ({ label: f.value, value: f.value }))}
                        onChange={(vals) => {
                          if (!activeObjectKey) return;
                          setKeyFieldsMap((prev) => ({ ...prev, [activeObjectKey]: vals }));
                          setObjectConfigStatusMap((prev) => ({
                            ...prev,
                            [activeObjectKey]: 'custom',
                          }));
                        }}
                      />
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">过滤表达式</Text>
                      <Input
                        style={{ marginTop: 8 }}
                        placeholder="例如：update_time > :cursor，可引用 :cursor"
                        value={activeObjectKey ? filterExprMap[activeObjectKey] || '' : ''}
                        onChange={(e) => {
                          if (!activeObjectKey) return;
                          setFilterExprMap((prev) => ({
                            ...prev,
                            [activeObjectKey]: e.target.value,
                          }));
                          setObjectConfigStatusMap((prev) => ({
                            ...prev,
                            [activeObjectKey]: 'custom',
                          }));
                        }}
                      />
                    </Col>
                    <Col span={12} style={{ marginTop: 12 }}>
                      <Text type="secondary">对象游标字段（选填）</Text>
                      <Select
                        allowClear
                        style={{ width: '100%', marginTop: 8 }}
                        placeholder="留空则使用增量配置中的游标字段"
                        value={
                          activeObjectKey ? cursorFieldMap[activeObjectKey] || undefined : undefined
                        }
                        options={fieldOptions.map((f) => ({ label: f.value, value: f.value }))}
                        onChange={(value) => {
                          if (!activeObjectKey) return;
                          setCursorFieldMap((prev) => ({
                            ...prev,
                            [activeObjectKey]: value || '',
                          }));
                          setObjectConfigStatusMap((prev) => ({
                            ...prev,
                            [activeObjectKey]: 'custom',
                          }));
                        }}
                      />
                    </Col>
                  </Row>
                </Card>
              )}
            </Spin>
          </>
        )}
      </Modal>

      <Modal
        open={importTaskDetailVisible}
        title={
          selectedImportTask ? `导入任务详情 - ${selectedImportTask.name || '-'}` : '导入任务详情'
        }
        onCancel={closeImportTaskDetail}
        footer={null}
        width={920}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card bordered={false} size="small">
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 16,
                  alignItems: 'start',
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
                    基础配置
                  </Text>
                  <div
                    style={{
                      marginTop: 10,
                      padding: '4px 14px',
                      background: '#fafcff',
                      border: '1px solid #edf2ff',
                      borderRadius: 10,
                    }}
                  >
                    {[
                      ['抽取方式', formatExtractMode(selectedImportTask?.extractMode)],
                      ['调度方式', formatScheduleType(selectedImportTask?.scheduleType)],
                      ['写入方式', formatWriteMode(selectedImportTask?.writeMode)],
                      ['批次大小', selectedImportTask?.batchSize],
                      ['限流条数', selectedImportTask?.maxRowsPerObject],
                      ['任务备注', selectedImportTask?.remark],
                    ].map(([label, value]) => renderDetailLine(String(label), value))}
                    {renderTagDetailLine(
                      '启用状态',
                      selectedImportTask?.enabled === 1 ? (
                        <Tag color="success">启用</Tag>
                      ) : (
                        <Tag>停用</Tag>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
                    运行
                  </Text>
                  <div
                    style={{
                      marginTop: 10,
                      padding: '4px 14px',
                      background: '#fafcff',
                      border: '1px solid #edf2ff',
                      borderRadius: 10,
                    }}
                  >
                    {[
                      ['最近成功运行 ID', selectedImportTask?.lastSuccessRunId],
                      ['最近运行时间', formatTaskDateTime(selectedImportTask?.lastRunTime)],
                      ['最近触发时间', formatTaskDateTime(selectedImportTask?.lastTriggerTime)],
                      ['下次触发时间', formatTaskDateTime(selectedImportTask?.nextTriggerTime)],
                      ['创建时间', formatTaskDateTime(selectedImportTask?.createTime)],
                      ['更新时间', formatTaskDateTime(selectedImportTask?.updateTime)],
                    ].map(([label, value]) => renderDetailLine(String(label), value))}
                    {renderTagDetailLine(
                      '最近运行状态',
                      getTaskStatusTag(selectedImportTask?.lastRunStatus),
                    )}
                  </div>
                </div>
              </div>

              {selectedImportTask?.scheduleType === 'CRON' && (
                <div>
                  <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
                    定时配置
                  </Text>
                  <div
                    style={{
                      marginTop: 10,
                      padding: '4px 14px',
                      background: '#fafcff',
                      border: '1px solid #edf2ff',
                      borderRadius: 10,
                    }}
                  >
                    {[
                      [
                        '调度类型',
                        formatScheduleSimpleType(selectedImportTask?.scheduleConfig?.simpleType),
                      ],
                      ['间隔分钟数', selectedImportTask?.scheduleConfig?.intervalMinutes],
                      ['执行时间', selectedImportTask?.scheduleConfig?.dailyTime],
                    ].map(([label, value]) => renderDetailLine(String(label), value))}
                  </div>
                </div>
              )}

              {selectedImportTask?.extractMode === 'INCREMENTAL' && (
                <div>
                  <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
                    增量配置
                  </Text>
                  <div
                    style={{
                      marginTop: 10,
                      padding: '4px 14px',
                      background: '#fafcff',
                      border: '1px solid #edf2ff',
                      borderRadius: 10,
                    }}
                  >
                    {[
                      [
                        '增量模式',
                        formatIncrementalMode(selectedImportTask?.cursorConfig?.incrementalMode),
                      ],
                      ['任务游标字段', selectedImportTask?.cursorConfig?.cursorField],
                      ['游标比较方式', selectedImportTask?.cursorConfig?.cursorCompare],
                      ['初始游标', selectedImportTask?.cursorConfig?.initialCursor],
                    ].map(([label, value]) => renderDetailLine(String(label), value))}
                  </div>
                </div>
              )}
            </Space>
          </Card>

          <Card
            bordered={false}
            size="small"
            title="对象范围"
            style={{ background: '#fafcff', border: '1px solid #edf2ff' }}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {(selectedImportTask?.objects?.length
                ? selectedImportTask.objects
                : [
                    {
                      objectName: '-',
                      objectKind: '-',
                      columns: [],
                      keyFields: [],
                      filterExpr: undefined,
                      cursorField: undefined,
                      cursorConfig: undefined,
                    },
                  ]
              ).map((item, index) => (
                <Card
                  key={`${item.objectName || 'object'}-${index}`}
                  size="small"
                  style={{ background: '#fff', borderColor: '#eef2f6', borderRadius: 10 }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {item.objectName || '-'}
                    </Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      {item.objectKind || '-'}
                    </Text>
                  </div>
                  <div style={{ marginTop: 6, padding: '4px 0' }}>
                    {[
                      ['字段列表', item.columns?.length ? item.columns.join(', ') : '-'],
                      ['主键字段', item.keyFields?.length ? item.keyFields.join(', ') : '-'],
                      ['过滤表达式', item.filterExpr],
                      ['游标字段', item.cursorField],
                    ].map(([label, value]) =>
                      renderDetailLine(String(label), value, `${String(label)}-${index}`),
                    )}
                  </div>
                </Card>
              ))}
            </Space>
          </Card>
        </Space>
      </Modal>

      <Modal
        open={importRunVisible}
        width={1200}
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingRight: 32,
            }}
          >
            <Space direction="vertical" size={2}>
              <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
                {selectedRunTask
                  ? `触发记录 - ${selectedRunTask.name}`
                  : selectedRunSource
                    ? `触发记录 - ${selectedRunSource.name}`
                    : '触发记录'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedRunTask
                  ? `${selectedRunSource?.name || '-'} 下当前导入任务的触发记录`
                  : '最近导入触发记录'}
              </Text>
            </Space>
            <Select
              allowClear
              placeholder="全部触发类型"
              style={{ width: 180 }}
              value={importRunTaskType}
              onChange={handleImportRunTaskTypeChange}
              options={[
                { label: '手动触发', value: 'MANUAL' },
                { label: '定时任务', value: 'CRON' },
              ]}
            />
          </div>
        }
        onCancel={closeImportRuns}
        footer={null}
        width={1200}
      >
        <div
          style={{
            background: '#f7faff',
            border: '1px solid #dbe7ff',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 14px 14px', background: '#f7faff' }}>
            <Table<ImportRunRecord>
              rowKey="id"
              size="small"
              loading={importRunLoading}
              dataSource={importRuns}
              columns={importRunColumns}
              pagination={false}
              locale={{ emptyText: importRunLoading ? '触发记录加载中...' : '暂无触发记录' }}
              style={{ background: '#ffffff', borderRadius: 8 }}
            />
          </div>
        </div>
      </Modal>
    </Space>
  );
}
