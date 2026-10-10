import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        marginTop: 20,
        padding: '14px 24px',
        color: '#8a94a6',
        background: 'rgba(255, 255, 255, 0.96)',
        borderTop: '1px solid rgba(17, 24, 39, 0.08)',
        fontSize: 12,
        lineHeight: 1.6,
        letterSpacing: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          maxWidth: 1280,
          margin: '0 auto',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            width: 24,
            height: 1,
            background: 'linear-gradient(90deg, transparent, #2563eb)',
          }}
        />
        <span>© {currentYear} 企业蜂窝人工智能一体化平台</span>
        <span
          style={{
            width: 24,
            height: 1,
            background: 'linear-gradient(90deg, #06b6d4, transparent)',
          }}
        />
      </div>
    </footer>
  );
};

export default Footer;
