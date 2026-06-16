import React, { useState, useEffect } from 'react';
import { Tree, message } from 'antd';
import { getDeptTree } from '@/services/system/user';

const { DirectoryTree } = Tree;

/* *
 *
 * @author whiteshader@163.com
 * @datetime  2023/02/06
 * 
 * */


export type TreeProps = {
  onSelect: (values: any) => Promise<void>;
};

const DeptTree: React.FC<TreeProps> = (props) => {
  const [treeData, setTreeData] = useState<any>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);

  const fetchDeptList = async () => {
    const hide = message.loading('正在查询');
    try {
      await getDeptTree({}).then((res: any) => {
        const firstDept = res?.[0];
        const firstDeptKey = firstDept?.key ?? firstDept?.id;
        setTreeData(res);
        if (firstDept) {
          setExpandedKeys([firstDeptKey]);
          setSelectedKeys([firstDeptKey]);
          props.onSelect(firstDept);
        }
      });
      hide();
      return true;
    } catch (error) {
      hide();
      return false;
    }
  };

  useEffect(() => {
    fetchDeptList();
  }, []);

  const onSelect = (keys: React.Key[], info: any) => {
    setSelectedKeys(keys);
    props.onSelect(info.node);
  };

  const onExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  return (
    <DirectoryTree
      // multiple
      defaultExpandAll
      onExpand={onExpand}
      expandedKeys={expandedKeys}
      selectedKeys={selectedKeys}
      autoExpandParent={autoExpandParent}
      onSelect={onSelect}
      treeData={treeData}
    />
  );
};

export default DeptTree;
