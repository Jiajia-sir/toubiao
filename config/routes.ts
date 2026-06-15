/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '*',
    layout: false,
    component: './404',
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
    name: '数据接入',
    icon: 'database',
    path: '/data',
    routes: [
      {
        name: '数据接入工作台',
        path: '/data/source',
        component: './Data/Source',
      },
      {
        name: '文档导入',
        path: '/data/document-import',
        component: './Data/DocumentImport',
      },
      {
        name: '实时监控',
        path: '/data/realtime-monitor',
        component: './Data/Monitor',
      },
      {
        name: '文档详情',
        path: '/data/document/:id',
        component: './Data/DocumentDetail',
      },
    ],
  },
  {
    name: '配置中心',
    icon: 'setting',
    path: '/config-center',
    routes: [
      {
        name: '编目管理',
        path: '/config-center/catalog',
        component: './ConfigCenter/Catalog',
      },
      {
        name: '标签管理',
        path: '/config-center/tag',
        component: './ConfigCenter/Tag',
      },
      {
        name: '实体类型配置',
        path: '/config-center/entity-type',
        component: './ConfigCenter/EntityType',
      },
      {
        name: '知识抽取配置',
        path: '/config-center/knowledge-extract',
        component: './ConfigCenter/KnowledgeExtractConfig',
      },
      {
        name: '消融配置',
        path: '/config-center/ablation',
        component: './ConfigCenter/Ablation',
      },
      {
        name: '实体消融',
        path: '/config-center/ablation/entity',
        component: './ConfigCenter/Ablation/Entity',
      },
      {
        name: '关系消融',
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
        name: '字典数据',
        path: '/system/dict-data/index/:id',
        component: './System/DictData',
      },
      {
        name: '分配用户',
        path: '/system/role-auth/user/:id',
        component: './System/Role/authUser',
      },
    ]
  },
  {
    name: 'monitor',
    path: '/monitor',
    routes: [
      {
        name: '任务日志',
        path: '/monitor/job-log/index/:id',
        component: './Monitor/JobLog',
      },
    ]
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
    ]
  },
];
