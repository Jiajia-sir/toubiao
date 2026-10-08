/**
 * @name umi 鐨勮矾鐢遍厤缃?
 * @description 鍙敮鎸?path,component,routes,redirect,wrappers,name,icon 鐨勯厤缃?
 * @param path  path 鍙敮鎸佷袱绉嶅崰浣嶇閰嶇疆锛岀涓€绉嶆槸鍔ㄦ€佸弬鏁?:id 鐨勫舰寮忥紝绗簩绉嶆槸 * 閫氶厤绗︼紝閫氶厤绗﹀彧鑳藉嚭鐜拌矾鐢卞瓧绗︿覆鐨勬渶鍚庛€?
 * @param component 閰嶇疆 location 鍜?path 鍖归厤鍚庣敤浜庢覆鏌撶殑 React 缁勪欢璺緞銆傚彲浠ユ槸缁濆璺緞锛屼篃鍙互鏄浉瀵硅矾寰勶紝濡傛灉鏄浉瀵硅矾寰勶紝浼氫粠 src/pages 寮€濮嬫壘璧枫€?
 * @param routes 閰嶇疆瀛愯矾鐢憋紝閫氬父鍦ㄩ渶瑕佷负澶氫釜璺緞澧炲姞 layout 缁勪欢鏃朵娇鐢ㄣ€?
 * @param redirect 閰嶇疆璺敱璺宠浆
 * @param wrappers 閰嶇疆璺敱缁勪欢鐨勫寘瑁呯粍浠讹紝閫氳繃鍖呰缁勪欢鍙互涓哄綋鍓嶇殑璺敱缁勪欢缁勫悎杩涙洿澶氱殑鍔熻兘銆?姣斿锛屽彲浠ョ敤浜庤矾鐢辩骇鍒殑鏉冮檺鏍￠獙
 * @param name 閰嶇疆璺敱鐨勬爣棰橈紝榛樿璇诲彇鍥介檯鍖栨枃浠?menu.ts 涓?menu.xxxx 鐨勫€硷紝濡傞厤缃?name 涓?login锛屽垯璇诲彇 menu.ts 涓?menu.login 鐨勫彇鍊间綔涓烘爣棰?
 * @param icon 閰嶇疆璺敱鐨勫浘鏍囷紝鍙栧€煎弬鑰?https://ant.design/components/icon-cn锛?娉ㄦ剰鍘婚櫎椋庢牸鍚庣紑鍜屽ぇ灏忓啓锛屽鎯宠閰嶇疆鍥炬爣涓?<StepBackwardOutlined /> 鍒欏彇鍊煎簲涓?stepBackward 鎴?StepBackward锛屽鎯宠閰嶇疆鍥炬爣涓?<UserOutlined /> 鍒欏彇鍊煎簲涓?user 鎴栬€?User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './User/Login',
      },
    ],
  },
  {
    name: '工作台',
    icon: 'dashboard',
    path: '/dashboard',
    component: './Dashboard',
  },
  {
    name: '采购运行态势',
    icon: 'dashboard',
    path: '/procurement-cockpit',
    component: './ProcurementCockpit',
  },
  {
    name: '智能体',
    icon: 'robot',
    path: '/ai-agent',
    routes: [
      {
        name: '智能体管理',
        icon: 'robot',
        path: '/ai-agent/agents',
        component: './AiAgent/Agents',
      },
      {
        name: '工作流编排',
        icon: 'branches',
        path: '/ai-agent/workflow',
        component: './AiAgent/Workflow',
      },
      {
        name: 'Skills / MCP 管理',
        icon: 'tool',
        path: '/ai-agent/skills',
        component: './AiAgent/Skills',
      },
    ],
  },
  {
    name: '工作台',
    icon: 'appstore',
    path: '/procurement',
    component: './ProcurementPortal',
  },
  {
    name: 'AI 政策助手',
    icon: 'robot',
    path: '/procurement/policy-assistant',
    component: './ProcurementPortal',
  },
  {
    name: '采购法规知识库',
    icon: 'book',
    path: '/procurement/knowledge-base',
    component: './ProcurementPortal',
  },
  {
    name: '项目管理',
    icon: 'project',
    path: '/procurement/projects',
    component: './ProcurementPortal',
  },
  {
    name: '项目详情',
    path: '/procurement/projects/detail',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '采购需求',
    icon: 'form',
    path: '/procurement/requirements',
    component: './ProcurementPortal',
  },
  {
    name: '需求智能审核',
    path: '/procurement/requirements/review',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '采购文件',
    path: '/procurement/documents',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '文件门控',
    path: '/procurement/documents/gate',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '采购文件拟制',
    path: '/procurement/documents/draft',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '供应商管理',
    icon: 'team',
    path: '/procurement/suppliers',
    component: './ProcurementPortal',
  },
  {
    name: '供应商风险详情',
    path: '/procurement/suppliers/risk',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '合同管理',
    icon: 'file-done',
    path: '/procurement/contracts',
    component: './ProcurementPortal',
  },
  {
    name: '合同建议方案',
    path: '/procurement/contracts/proposal',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '合同履约管理',
    path: '/procurement/contracts/fulfillment',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '履约节点详情',
    path: '/procurement/contracts/fulfillment/node-detail',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '现场验收',
    path: '/procurement/acceptance',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '验收提交结果',
    path: '/procurement/acceptance/result',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '验收报告',
    path: '/procurement/acceptance/report',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '供应商履约评价',
    path: '/procurement/acceptance/evaluation',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '全过程记录',
    icon: 'history',
    path: '/procurement/records',
    component: './ProcurementPortal',
  },
  {
    name: '数据报表',
    icon: 'bar-chart',
    path: '/procurement/reports',
    component: './ProcurementPortal',
  },
  {
    name: '角色视图',
    path: '/procurement/roles',
    component: './ProcurementPortal',
    hideInMenu: true,
  },
  {
    name: '平台总览',
    icon: 'dashboard',
    path: '/platform-overview',
    component: './ProcurementPortal',
  },
  {
    name: '模型与推理服务',
    icon: 'deployment-unit',
    path: '/platform-models',
    component: './ProcurementPortal',
  },
  {
    name: '知识库',
    icon: 'book',
    path: '/knowledge',
    component: './Knowledge',
  },
  {
    path: '/knowledge/detail/:id',
    component: './KnowledgeDetail',
  },
  {
    name: '图谱检索',
    icon: 'cluster',
    path: '/graph',
    component: './Graph',
  },
  {
    name: '数据检索',
    icon: 'search',
    path: '/data-search',
    component: './DataSearch',
  },
  {
    name: 'RAG 问答',
    icon: 'robot',
    path: '/rag-system',
    component: './RagSystem',
  },
  {
    name: '鏁版嵁鎺ュ叆',
    icon: 'database',
    path: '/data',
    routes: [
      {
        name: '数据接入工作台',
        path: '/data/source',
        component: './Data/Source',
      },
      {
        name: '导入结果',
        path: '/data/import-result',
        component: './Data/ImportResult',
        hideInMenu: true,
      },
      {
        name: '鏂囨。瀵煎叆',
        path: '/data/document-import',
        component: './Data/DocumentImport',
      },
      {
        name: '瀹炴椂鐩戞帶',
        path: '/data/realtime-monitor',
        component: './Data/Monitor',
      },
      {
        name: '鏂囨。璇︽儏',
        path: '/data/document/:id',
        component: './Data/DocumentDetail',
      },
      {
        name: '鏉ユ簮娓犻亾',
        path: '/data/channel-config',
        component: './Data/ChannelConfig',
      },
      {
        name: '服务器配置',
        path: '/data/host-config',
        component: './Data/HostConfig',
      },
      {
        name: '线路配置',
        path: '/data/dir-config',
        component: './Data/DirConfig',
      },
    ],
  },
  {
    name: '閰嶇疆涓績',
    icon: 'setting',
    path: '/config-center',
    routes: [
      {
        name: '缂栫洰绠＄悊',
        path: '/config-center/catalog',
        component: './ConfigCenter/Catalog',
      },
      {
        name: '鏍囩绠＄悊',
        path: '/config-center/tag',
        component: './ConfigCenter/Tag',
      },
      {
        name: '瀹炰綋绫诲瀷閰嶇疆',
        path: '/config-center/entity-type',
        component: './ConfigCenter/EntityType',
      },
      {
        name: '鐭ヨ瘑鎶藉彇绠＄悊',
        path: '/config-center/knowledge-extract',
        component: './ConfigCenter/KnowledgeExtractConfig',
      },
      {
        name: '妯″瀷绠＄悊',
        path: '/config-center/model-manage',
        component: './ConfigCenter/ModelManage',
      },
      {
        name: '鐭ヨ瘑鎶藉彇閰嶇疆',
        path: '/config-center/knowledge-extract/config',
        component: './ConfigCenter/KnowledgeExtractConfig/config',
      },
      {
        name: '娑堣瀺閰嶇疆',
        path: '/config-center/ablation',
        component: './ConfigCenter/Ablation',
      },
      {
        name: '瀹炰綋娑堣瀺',
        path: '/config-center/ablation/entity',
        component: './ConfigCenter/Ablation/Entity',
      },
      {
        name: '鍏崇郴娑堣瀺',
        path: '/config-center/ablation/relation',
        component: './ConfigCenter/Ablation/Relation',
      },
      {
        name: '属性消融',
        path: '/config-center/ablation/attribute',
        component: './ConfigCenter/Ablation/Attribute',
      },
    ],
  },
  {
    path: '/configCenter/catalog/index',
    component: './ConfigCenter/Catalog',
  },
  {
    path: '/configCenter/tag/index',
    component: './ConfigCenter/Tag',
  },
  {
    path: '/configCenter/entityType/index',
    component: './ConfigCenter/EntityType',
  },
  {
    path: '/configCenter/knowledgeExtract/config/index',
    component: './ConfigCenter/KnowledgeExtractConfig',
  },
  {
    path: '/configCenter/modelManage/index',
    component: './ConfigCenter/ModelManage',
  },
  {
    path: '/configCenter/ablation/index',
    component: './ConfigCenter/Ablation',
  },
  {
    path: '/configCenter/ablation/entity/index',
    component: './ConfigCenter/Ablation/Entity',
  },
  {
    path: '/configCenter/ablation/relation/index',
    component: './ConfigCenter/Ablation/Relation',
  },
  {
    path: '/configCenter/ablation/attribute/index',
    component: './ConfigCenter/Ablation/Attribute',
  },
  {
    path: '/account',
    routes: [
      {
        name: 'acenter',
        path: '/account/center',
        component: './User/Center',
      },
      {
        name: 'asettings',
        path: '/account/settings',
        component: './User/Settings',
      },
    ],
  },
  {
    name: 'system',
    path: '/system',
    routes: [
      {
        name: '瀛楀吀鏁版嵁',
        path: '/system/dict-data/index/:id',
        component: './System/DictData',
      },
      {
        name: '鍒嗛厤鐢ㄦ埛',
        path: '/system/role-auth/user/:id',
        component: './System/Role/authUser',
      },
    ],
  },
  {
    name: 'monitor',
    path: '/monitor',
    routes: [
      {
        name: '浠诲姟鏃ュ織',
        path: '/monitor/job-log/index/:id',
        component: './Monitor/JobLog',
      },
    ],
  },
  {
    name: 'tool',
    path: '/tool',
    routes: [
      {
        name: '导入表',
        path: '/tool/gen/import',
        component: './Tool/Gen/import',
      },
      {
        name: '编辑表',
        path: '/tool/gen/edit',
        component: './Tool/Gen/edit',
      },
    ],
  },
  {
    name: '知识图谱操作记录',
    icon: 'history',
    path: '/graph/operation-log',
    component: './Graph/OperationLog',
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];
