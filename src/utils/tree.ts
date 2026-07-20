import { DataNode } from 'antd/es/tree';
import { parse } from 'querystring';

/**
 * 构造树型结构数据
 * @param {*} data 数据源
 * @param {*} id id字段 默认 'id'
 * @param {*} parentId 父节点字段 默认 'parentId'
 * @param {*} children 孩子节点字段 默认 'children'
 */
export function buildTreeData(
  data: any[],
  id: string,
  name: string,
  parentId: string,
  parentName: string,
  children: string,
) {
  const config = {
    id: id || 'id',
    name: name || 'name',
    parentId: parentId || 'parentId',
    parentName: parentName || 'parentName',
    childrenList: children || 'children',
  };

  const source = Array.isArray(data) ? data : [];
  const childrenListMap: Record<string, any[]> = {};
  const nodeIds: Record<string, any> = {};
  const tree: any[] = [];

  source.forEach((item) => {
    const d = item;
    const nodeId = d[config.id];
    const pId = d[config.parentId];
    const nodeKey = String(nodeId);
    const parentKey = String(typeof pId === 'undefined' || pId === null ? 0 : pId);

    if (!childrenListMap[parentKey]) {
      childrenListMap[parentKey] = [];
    }
    d.key = nodeId;
    d.title = d[config.name];
    d.value = nodeId;
    if (Object.prototype.hasOwnProperty.call(d, config.childrenList)) {
      delete d[config.childrenList];
    }
    nodeIds[nodeKey] = d;
    childrenListMap[parentKey].push(d);
  });

  source.forEach((item: any) => {
    const d = item;
    const pId = d[config.parentId];
    const parentKey = String(typeof pId === 'undefined' || pId === null ? 0 : pId);
    if (!nodeIds[parentKey]) {
      d[config.parentName] = '';
      tree.push(d);
    }
  });

  function adaptToChildrenList(item: any) {
    const o = item;
    const childrenNodes = childrenListMap[String(o[config.id])];
    if (childrenNodes && childrenNodes.length > 0) {
      o[config.childrenList] = childrenNodes;
      childrenNodes.forEach((child: any) => {
        const c = child;
        c[config.parentName] = o[config.name];
        adaptToChildrenList(c);
      });
    }
  }

  tree.forEach((t: any) => {
    adaptToChildrenList(t);
  });

  return tree;
}

export function handleTree<T extends Record<string, any>>(
  data: T[] = [],
  id = 'id',
  parentId = 'parentId',
  children = 'children',
  rootId?: any,
): T[] {
  const sourceData = Array.isArray(data) ? data : [];
  const rootValue =
    typeof rootId !== 'undefined'
      ? rootId
      : Math.min.apply(
          Math,
          sourceData.map((item) => item[parentId]),
        ) || 0;
  const cloneData = JSON.parse(JSON.stringify(sourceData));
  const treeData = cloneData.filter((father: T) => {
    const branchArr = cloneData.filter((child: T) => father[id] === child[parentId]);
    if (branchArr.length > 0) {
      father[children] = branchArr;
    }
    return father[parentId] === rootValue;
  });
  return treeData.length > 0 ? treeData : sourceData;
}

export const getPageQuery = () => parse(window.location.href.split('?')[1]);

export function formatTreeData(arrayList: any): DataNode[] {
  const sourceList = Array.isArray(arrayList) ? arrayList : [];

  const createNode = (item: any): DataNode => ({
    title: item.label,
    key: `${item.id}`,
    value: item.id,
  });

  const hasNestedChildren = sourceList.some(
    (item: any) => Array.isArray(item?.children) && item.children.length > 0,
  );

  if (hasNestedChildren) {
    return sourceList.map((item: any) => {
      const node = createNode(item);
      if (Array.isArray(item.children) && item.children.length > 0) {
        node.children = formatTreeData(item.children);
      }
      return node;
    });
  }

  const nodeMap = new Map<string, DataNode>();
  const rootNodes: DataNode[] = [];

  sourceList.forEach((item: any) => {
    nodeMap.set(`${item.id}`, createNode(item));
  });

  sourceList.forEach((item: any) => {
    const currentNode = nodeMap.get(`${item.id}`);
    const parentId = item.parentId;
    const hasParent =
      typeof parentId !== 'undefined' &&
      parentId !== null &&
      `${parentId}` !== '0' &&
      nodeMap.has(`${parentId}`);

    if (!currentNode) {
      return;
    }

    if (hasParent) {
      const parentNode = nodeMap.get(`${parentId}`);
      if (!parentNode?.children) {
        parentNode!.children = [];
      }
      parentNode!.children!.push(currentNode);
      return;
    }

    rootNodes.push(currentNode);
  });

  return rootNodes;
}
