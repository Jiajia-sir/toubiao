const ALL_PERMISSION = '*:*:*';

const permissionActionAliases: Record<string, string[]> = {
  add: ['add', 'create'],
  create: ['create', 'add'],
  edit: ['edit', 'update'],
  update: ['update', 'edit'],
  remove: ['remove', 'delete', 'del'],
  delete: ['delete', 'remove', 'del'],
  del: ['del', 'delete', 'remove'],
  view: ['view', 'query', 'get'],
  query: ['query', 'view', 'list', 'page', 'get'],
  list: ['list', 'query', 'page'],
  page: ['page', 'list', 'query'],
};

function buildPermissionCandidates(value: string): string[] {
  if (!value) {
    return [];
  }

  const parts = value.split(':');
  if (parts.length < 3) {
    return [value];
  }

  const action = parts[parts.length - 1];
  const actionAliases = permissionActionAliases[action] || [action];
  return actionAliases.map((alias) => [...parts.slice(0, -1), alias].join(':'));
}

function normalizePermissions(permissions: any[] | undefined): string[] {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item.permission === 'string') {
        return item.permission;
      }
      if (item && typeof item.code === 'string') {
        return item.code;
      }
      return '';
    })
    .filter(Boolean);
}

// /**
//  * 字符权限校验
//  * @param {Array} value 校验值
//  * @returns {Boolean}
//  */
export function matchPerms(permissions: string[], value: string[]) {
  if (value && value instanceof Array && value.length > 0) {
    const normalizedPermissions = normalizePermissions(permissions);
    const permissionDatas = value.flatMap((item) => buildPermissionCandidates(item));
    const hasPermission = normalizedPermissions.some((permission) => {
      return ALL_PERMISSION === permission || permissionDatas.includes(permission);
    });
    if (!hasPermission) {
      return false;
    }
    return true;
  }
  console.error(`need roles! Like checkPermi="['system:user:add','system:user:edit']"`);
  return false;
}

export function matchPerm(permissions: string[], value: string) {
  if (value && value.length > 0) {
    const permissionDatas = buildPermissionCandidates(value);
    const normalizedPermissions = normalizePermissions(permissions);
    const hasPermission = normalizedPermissions.some((permission) => {
      return ALL_PERMISSION === permission || permissionDatas.includes(permission);
    });
    if (!hasPermission) {
      return false;
    }
    return true;
  }
  console.error(`need roles! Like checkPermi="['system:user:add','system:user:edit']"`);
  return false;
}

export function matchPermission(permissions: string[] | undefined, value: any): boolean {
  if (permissions === undefined) return false;
  const type = typeof value;
  if (type === 'string') {
    return matchPerm(permissions, value);
  }
  return matchPerms(permissions, value);
}

/**
 * 角色权限校验
 * @param {Array} value 校验值
 * @returns {Boolean}
 */
export function checkRole(roles: API.System.Role[] | undefined, value: string[]) {
  if (roles && value && value.length > 0) {
    for (let i = 0; i < roles?.length; i++) {
      for (let j = 0; j < value?.length; j++) {
        if (value[j] === roles[i].roleKey) {
          return true;
        }
      }
    }
  }
  console.error(`need roles! Like checkRole="['admin','editor']"`);
  return false;
}
