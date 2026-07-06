
declare namespace API.System {

  interface User {
    userId: number;
    id?: number;
    username?: string;
    deptId: number;
    deptName?: string;
    userName: string;
    nickName: string;
    nickname?: string;
    userType: string;
    email: string;
    phonenumber: string;
    mobile?: string;
    sex: string;
    avatar: string;
    password: string;
    status: string;
    postIds?: number[];
    roles?: Array<{ id?: number; roleId?: number; name?: string; roleName?: string }>;
    delFlag: string;
    loginIp: string;
    loginDate: Date;
    createBy: string;
    createTime: Date;
    updateBy: string;
    updateTime: Date;
    remark: string;
  }

  export interface UserListParams {
    userId?: string;
    username?: string;
    deptId?: string;
    userName?: string;
    nickName?: string;
    userType?: string;
    email?: string;
    phonenumber?: string;
    sex?: string;
    avatar?: string;
    password?: string;
    status?: string;
    delFlag?: string;
    loginIp?: string;
    loginDate?: string;
    createBy?: string;
    createTime?: string;
    updateBy?: string;
    updateTime?: string;
    remark?: string;
    pageSize?: string;
    currentPage?: string;
    filter?: string;
    sorter?: string;
  }

  export interface UserInfoResult { 
    current: number;
    pageSize: number;
    total: number;
    data: User;
    posts: [];
    postIds: any;
    roleId: number;
    roleIds: [];
    roles: [];
  } 

   export interface UserPageResult { 
    code: number;
    msg: string;
    total: number;
    rows: Array<User>;
  }

}
