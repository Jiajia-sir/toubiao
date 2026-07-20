
declare namespace API.System {

  interface Role {
    roleId: number;
    roleName: string;
    roleKey: string;
    roleSort: number;
    type?: number;
    dataScope: string | number;
    dataScopeDeptIds?: number[];
    menuCheckStrictly: number;
    deptCheckStrictly: number;
    status: string | number;
    delFlag: string;
    createBy: string;
    createTime: string | number | Date;
    updateBy: string;
    updateTime: string | number | Date;
    remark: string;
  }

  export interface RoleListParams {
    roleId?: string;
    roleName?: string;
    roleKey?: string;
    roleSort?: string;
    dataScope?: string;
    menuCheckStrictly?: string;
    deptCheckStrictly?: string;
    status?: string;
    delFlag?: string;
    createBy?: string;
    createTime?: string;
    updateBy?: string;
    updateTime?: string;
    remark?: string;
    pageSize?: string;
    current?: string;
    pageNo?: string;
    beginTime?: string;
    endTime?: string;
    'params[beginTime]'?: string;
    'params[endTime]'?: string;
  }

  export interface RoleInfoResult { 
    code: number;
    msg: string;
    data: Role;
    menuIds?: number[];
    deptIds?: number[];
  } 

   export interface RolePageResult { 
    code: number;
    msg: string;
    data?: {
      list?: Array<Role>;
      total?: number;
    };
    total: number;
    rows: Array<Role>;
  }

  export type RoleMenuNode = {
    id: number|string;
    label: string;
    children?: Array<RoleMenuNode>;
  }
  export interface RoleMenuResult { 
    code: number;
    msg: string;
    checkedKeys: number[];
    menus: Array<RoleMenuNode>;
  }

}
