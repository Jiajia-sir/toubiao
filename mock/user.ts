import { Request, Response } from 'express';

const waitTime = (time: number = 100) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

async function getFakeCaptcha(req: Request, res: Response) {
  await waitTime(2000);
  return res.json('captcha-xxx');
}

const mockCaptchaCode = '1234';
const mockCaptchaImg =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAxMDAgNDAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIHJ4PSI0IiBmaWxsPSIjZjBmNWZmIi8+PHBhdGggZD0iTTggMzJjMjAtMjQgNDQtMjQgODQgMCIgc3Ryb2tlPSIjOTE5OWEzIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIG9wYWNpdHk9Ii40Ii8+PHRleHQgeD0iNTAiIHk9IjI3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMxZjI5MzciPjEyMzQ8L3RleHQ+PC9zdmc+';

async function getRuoyiCaptcha(req: Request, res: Response) {
  await waitTime(200);
  return res.json({
    code: 200,
    img: mockCaptchaImg,
    msg: 'success',
    uuid: 'mock-captcha-uuid',
  });
}

async function ruoyiLogin(req: Request, res: Response) {
  const { username, password, code } = req.body;
  await waitTime(300);

  if (username === 'admin' && password === 'admin123' && code) {
    access = 'admin';
    res.send({
      code: 200,
      msg: 'success',
      token: 'mock-token',
    });
    return;
  }

  access = '';
  res.send({
    code: 500,
    msg: `验证码为 ${mockCaptchaCode}，用户名密码为 admin/admin123`,
  });
}

const ruoyiUserInfo = {
  userId: '1',
  userName: 'admin',
  nickName: '管理员',
  avatar: '',
  email: 'admin@example.com',
  phonenumber: '13800138000',
  sex: '0',
  permissions: ['*:*:*'],
};

const ruoyiAdminRole = {
  roleId: 1,
  roleName: '超级管理员',
  roleKey: 'admin',
  roleSort: 1,
  dataScope: '1',
  menuCheckStrictly: 1,
  deptCheckStrictly: 1,
  status: '0',
  delFlag: '0',
  createBy: 'admin',
  createTime: '2026-06-08 00:00:00',
  updateBy: '',
  updateTime: '',
  remark: 'mock admin role',
};

type MockRouter = {
  name: string;
  path: string;
  hidden: boolean;
  component: string;
  meta: {
    title: string;
    icon: string;
    noCache: boolean;
    link: string | null;
  };
  redirect?: string;
  alwaysShow?: boolean;
  children?: MockRouter[];
};

const createMenu = (
  name: string,
  path: string,
  component: string,
  title: string,
  icon = '',
): MockRouter => ({
  name,
  path,
  hidden: false,
  component,
  meta: {
    title,
    icon,
    noCache: false,
    link: null,
  },
});

const createLayout = (
  name: string,
  path: string,
  title: string,
  icon: string,
  children: MockRouter[],
): MockRouter => ({
  name,
  path,
  hidden: false,
  redirect: 'noRedirect',
  component: 'Layout',
  alwaysShow: true,
  meta: {
    title,
    icon,
    noCache: false,
    link: null,
  },
  children,
});

const ruoyiRouters = [
  createLayout('System', '/system', '系统管理', 'SettingOutlined', [
    createMenu('SystemUser', 'user', 'System/User/index', '用户管理', 'UserOutlined'),
    createMenu('SystemRole', 'role', 'System/Role/index', '角色管理', 'SafetyCertificateOutlined'),
    createMenu('SystemMenu', 'menu', 'System/Menu/index', '菜单管理', 'MenuOutlined'),
    createMenu('SystemDept', 'dept', 'System/Dept/index', '部门管理', 'ApartmentOutlined'),
    createMenu('SystemPost', 'post', 'System/Post/index', '岗位管理', 'IdcardOutlined'),
    createMenu('SystemDict', 'dict', 'System/Dict/index', '字典管理', 'BookOutlined'),
    createMenu('SystemConfig', 'config', 'System/Config/index', '参数设置', 'ControlOutlined'),
    createMenu('SystemNotice', 'notice', 'System/Notice/index', '通知公告', 'NotificationOutlined'),
    createMenu('SystemLogininfor', 'logininfor', 'System/Logininfor/index', '登录日志', 'LoginOutlined'),
    createMenu('SystemOperlog', 'operlog', 'System/Operlog/index', '操作日志', 'ProfileOutlined'),
  ]),
  createLayout('Monitor', '/monitor', '系统监控', 'DashboardOutlined', [
    createMenu('MonitorOnline', 'online', 'Monitor/Online/index', '在线用户', 'TeamOutlined'),
    createMenu('MonitorJob', 'job', 'Monitor/Job/index', '定时任务', 'ClockCircleOutlined'),
    createMenu('MonitorJobLog', 'job-log', 'Monitor/JobLog/index', '调度日志', 'FileSearchOutlined'),
    createMenu('MonitorLogininfor', 'logininfor', 'Monitor/Logininfor/index', '登录日志', 'LoginOutlined'),
    createMenu('MonitorOperlog', 'operlog', 'Monitor/Operlog/index', '操作日志', 'ProfileOutlined'),
    createMenu('MonitorServer', 'server', 'Monitor/Server/index', '服务监控', 'DesktopOutlined'),
    createMenu('MonitorCache', 'cache', 'Monitor/Cache/index', '缓存监控', 'DatabaseOutlined'),
    createMenu('MonitorDruid', 'druid', 'Monitor/Druid/index', 'Druid监控', 'FundProjectionScreenOutlined'),
  ]),
  createLayout('Tool', '/tool', '系统工具', 'ToolOutlined', [
    createMenu('ToolGen', 'gen', 'Tool/Gen/index', '代码生成', 'CodeOutlined'),
  ]),
  createLayout('Account', '/account', '个人页', 'UserOutlined', [
    createMenu('AccountCenter', 'center', 'User/Center/index', '个人中心', 'UserOutlined'),
    createMenu('AccountSettings', 'settings', 'User/Settings/index', '个人设置', 'SettingOutlined'),
  ]),
];

const { ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION } = process.env;

/**
 * 当前用户的权限，如果为空代表没登录
 * current user access， if is '', user need login
 * 如果是 pro 的预览，默认是有权限的
 */
let access = ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION === 'site' ? 'admin' : '';

const getAccess = (req?: Request) => {
  const authorization = req?.headers.authorization;
  if (authorization === 'Bearer mock-token') {
    access = 'admin';
  }
  return access;
};

// 代码中会兼容本地 service mock 以及部署站点的静态数据
export default {
  // 支持值为 Object 和 Array
  'GET /api/captchaImage': getRuoyiCaptcha,
  'POST /api/login': ruoyiLogin,
  'DELETE /api/logout': (req: Request, res: Response) => {
    access = '';
    res.send({ code: 200, msg: 'success' });
  },
  'GET /api/getInfo': (req: Request, res: Response) => {
    if (!getAccess(req)) {
      res.status(401).send({
        code: 401,
        msg: '请先登录！',
      });
      return;
    }
    res.send({
      code: 200,
      msg: 'success',
      user: ruoyiUserInfo,
      permissions: ruoyiUserInfo.permissions,
      roles: [ruoyiAdminRole],
    });
  },
  'GET /api/getRouters': (req: Request, res: Response) => {
    if (!getAccess(req)) {
      res.status(401).send({
        code: 401,
        msg: '请先登录！',
      });
      return;
    }
    res.send({
      code: 200,
      msg: 'success',
      data: ruoyiRouters,
    });
  },
  'GET /api/currentUser': (req: Request, res: Response) => {
    if (!getAccess(req)) {
      res.status(401).send({
        data: {
          isLogin: false,
        },
        errorCode: '401',
        errorMessage: '请先登录！',
        success: true,
      });
      return;
    }
    res.send({
      success: true,
      data: {
        name: 'Serati Ma',
        avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
        userid: '00000001',
        email: 'antdesign@alipay.com',
        signature: '海纳百川，有容乃大',
        title: '交互专家',
        group: '蚂蚁金服－某某某事业群－某某平台部－某某技术部－UED',
        tags: [
          {
            key: '0',
            label: '很有想法的',
          },
          {
            key: '1',
            label: '专注设计',
          },
          {
            key: '2',
            label: '辣~',
          },
          {
            key: '3',
            label: '大长腿',
          },
          {
            key: '4',
            label: '川妹子',
          },
          {
            key: '5',
            label: '海纳百川',
          },
        ],
        notifyCount: 12,
        unreadCount: 11,
        country: 'China',
        access: getAccess(),
        geographic: {
          province: {
            label: '浙江省',
            key: '330000',
          },
          city: {
            label: '杭州市',
            key: '330100',
          },
        },
        address: '西湖区工专路 77 号',
        phone: '0752-268888888',
      },
    });
  },
  // GET POST 可省略
  'GET /api/users': [
    {
      key: '1',
      name: 'John Brown',
      age: 32,
      address: 'New York No. 1 Lake Park',
    },
    {
      key: '2',
      name: 'Jim Green',
      age: 42,
      address: 'London No. 1 Lake Park',
    },
    {
      key: '3',
      name: 'Joe Black',
      age: 32,
      address: 'Sidney No. 1 Lake Park',
    },
  ],
  'POST /api/login/account': async (req: Request, res: Response) => {
    const { password, username, type } = req.body;
    await waitTime(2000);
    if (password === 'ant.design' && username === 'admin') {
      res.send({
        status: 'ok',
        type,
        currentAuthority: 'admin',
      });
      access = 'admin';
      return;
    }
    if (password === 'ant.design' && username === 'user') {
      res.send({
        status: 'ok',
        type,
        currentAuthority: 'user',
      });
      access = 'user';
      return;
    }
    if (type === 'mobile') {
      res.send({
        status: 'ok',
        type,
        currentAuthority: 'admin',
      });
      access = 'admin';
      return;
    }

    res.send({
      status: 'error',
      type,
      currentAuthority: 'guest',
    });
    access = 'guest';
  },
  'POST /api/login/outLogin': (req: Request, res: Response) => {
    access = '';
    res.send({ data: {}, success: true });
  },
  'POST /api/register': (req: Request, res: Response) => {
    res.send({ status: 'ok', currentAuthority: 'user', success: true });
  },
  'GET /api/500': (req: Request, res: Response) => {
    res.status(500).send({
      timestamp: 1513932555104,
      status: 500,
      error: 'error',
      message: 'error',
      path: '/base/category/list',
    });
  },
  'GET /api/404': (req: Request, res: Response) => {
    res.status(404).send({
      timestamp: 1513932643431,
      status: 404,
      error: 'Not Found',
      message: 'No message available',
      path: '/base/category/list/2121212',
    });
  },
  'GET /api/403': (req: Request, res: Response) => {
    res.status(403).send({
      timestamp: 1513932555104,
      status: 403,
      error: 'Forbidden',
      message: 'Forbidden',
      path: '/base/category/list',
    });
  },
  'GET /api/401': (req: Request, res: Response) => {
    res.status(401).send({
      timestamp: 1513932555104,
      status: 401,
      error: 'Unauthorized',
      message: 'Unauthorized',
      path: '/base/category/list',
    });
  },

  'GET  /api/login/captcha': getFakeCaptcha,
};
