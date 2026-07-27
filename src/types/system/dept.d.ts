
declare namespace API.System {

  interface Dept {
    deptId: number;
    parentId: number;
    ancestors: string;
    deptName: string;
    orderNum: number;
    leader: string;
    leaderUserId?: number;
    phone: string;
    email: string;
    status: string;
    delFlag: string;
    createBy: string;
    createTime: Date;
    updateBy: string;
    updateTime: Date;
  }

  export interface DeptListParams {
    deptId?: string;
    parentId?: string;
    ancestors?: string;
    deptName?: string;
    orderNum?: string;
    leader?: string;
    phone?: string;
    email?: string;
    status?: string;
    delFlag?: string;
    createBy?: string;
    createTime?: string;
    updateBy?: string;
    updateTime?: string;
    pageSize?: string;
    current?: string;
  }

  export interface DeptInfoResult { 
    code: number;
    msg: string;
    data: Dept;
  } 

   export interface DeptPageResult { 
    code: number;
    msg: string;
    total: number;
    data: Array<Dept>;
  }

  export interface UserSimpleRespVO {
    id: number;
    nickname: string;
    deptId?: number;
    deptName?: string;
  }

  export interface UserSimpleListResult {
    code: number;
    msg: string;
    data: Array<UserSimpleRespVO>;
  }

}
