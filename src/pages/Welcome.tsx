import { PageContainer } from '@ant-design/pro-components';
import { Card, theme } from 'antd';
import React from 'react';

const InfoCard: React.FC<{
  title: string;
  index: number;
  desc: string;
}> = ({ title, index, desc }) => {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        backgroundColor: token.colorBgContainer,
        boxShadow: token.boxShadow,
        borderRadius: 8,
        fontSize: 14,
        color: token.colorTextSecondary,
        lineHeight: '22px',
        padding: '16px 19px',
        minWidth: 220,
        flex: 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0F6CBD 0%, #1CA39B 100%)',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {index}
        </div>
        <div
          style={{
            fontSize: 16,
            color: token.colorText,
            fontWeight: 600,
          }}
        >
          {title}
        </div>
      </div>
      <div>{desc}</div>
    </div>
  );
};

const Welcome: React.FC = () => {
  const { token } = theme.useToken();

  return (
    <PageContainer>
      <Card
        style={{
          borderRadius: 8,
        }}
        bodyStyle={{
          backgroundImage: 'linear-gradient(135deg, #F4FAFF 0%, #F2FCF8 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 24,
                color: token.colorTextHeading,
                fontWeight: 600,
              }}
            >
              欢迎使用企业蜂窝人工智能一体化平台
            </div>
            <p
              style={{
                fontSize: 14,
                color: token.colorTextSecondary,
                lineHeight: '24px',
                marginTop: 16,
                marginBottom: 0,
                maxWidth: 760,
              }}
            >
              平台聚焦文档采集、OCR 识别、结构化解析和结果管理，适用于合同、票据、
              档案等多类业务文档的统一处理与协同流转。
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <InfoCard
              index={1}
              title="文档采集"
              desc="支持上传、归档和批量导入，统一接入多来源业务文档。"
            />
            <InfoCard
              index={2}
              title="智能识别"
              desc="面向 OCR、分类识别和字段抽取，提升文档处理效率与准确率。"
            />
            <InfoCard
              index={3}
              title="结果管理"
              desc="对识别结果进行校验、检索、导出与追踪，形成闭环处理流程。"
            />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default Welcome;
