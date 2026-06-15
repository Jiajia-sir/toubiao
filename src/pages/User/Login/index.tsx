<<<<<<< HEAD
import Footer from '@/components/Footer';
import { login } from '@/services/system/auth';
import { ensureRemoteMenu, setRemoteMenu } from '@/services/session';
import {
  AlipayCircleOutlined,
  LockOutlined,
  MobileOutlined,
  TaobaoCircleOutlined,
  UserOutlined,
  WeiboCircleOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { FormattedMessage, history, SelectLang, useIntl, useModel, Helmet } from '@umijs/max';
import { Alert, message, Tabs } from 'antd';
import Settings from '../../../../config/defaultSettings';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
=======
>>>>>>> 2366a979228c6af00cc166eec0be0999f53dd355
import { clearSessionToken, setSessionToken } from '@/access';
import { login } from '@/services/system/auth';
import { history, Helmet, useIntl, useModel } from '@umijs/max';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, message } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Settings from '../../../../config/defaultSettings';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();
  const intl = useIntl();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cubeRotate, setCubeRotate] = useState({ x: -20, y: 30 });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      // 计算立方体旋转角度，基于鼠标位置
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const rotateX = -20 + ((e.clientY - centerY) / centerY) * 10;
      const rotateY = 30 + ((e.clientX - centerX) / centerX) * 15;
      setCubeRotate({ x: rotateX, y: rotateY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 星空粒子
    const stars: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
      twinkle: number;
    }> = [];

    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random(),
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    // 流星
    const meteors: Array<{
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
      angle: number;
    }> = [];

    const createMeteor = () => {
      meteors.push({
        x: Math.random() * canvas.width,
        y: -10,
        length: Math.random() * 80 + 40,
        speed: Math.random() * 8 + 4,
        opacity: 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      });
    };

    // 光环粒子
    const orbs: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      speedX: number;
      speedY: number;
      pulse: number;
    }> = [
      {
        x: canvas.width * 0.2,
        y: canvas.height * 0.3,
        radius: 150,
        color: 'rgba(99, 102, 241, 0.15)',
        speedX: 0.3,
        speedY: 0.2,
        pulse: 0,
      },
      {
        x: canvas.width * 0.8,
        y: canvas.height * 0.6,
        radius: 200,
        color: 'rgba(139, 92, 246, 0.12)',
        speedX: -0.2,
        speedY: 0.3,
        pulse: Math.PI,
      },
      {
        x: canvas.width * 0.5,
        y: canvas.height * 0.8,
        radius: 120,
        color: 'rgba(59, 130, 246, 0.1)',
        speedX: 0.4,
        speedY: -0.2,
        pulse: Math.PI / 2,
      },
    ];

    let frame = 0;
    let lastMeteor = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // 绘制星空背景
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, '#0f0c29');
      bgGradient.addColorStop(0.5, '#1a1a3e');
      bgGradient.addColorStop(1, '#24243e');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制光环
      orbs.forEach((orb) => {
        orb.x += orb.speedX;
        orb.y += orb.speedY;
        orb.pulse += 0.02;

        if (orb.x < -orb.radius) orb.x = canvas.width + orb.radius;
        if (orb.x > canvas.width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = canvas.height + orb.radius;
        if (orb.y > canvas.height + orb.radius) orb.y = -orb.radius;

        const pulseSize = Math.sin(orb.pulse) * 20;
        const gradient = ctx.createRadialGradient(
          orb.x,
          orb.y,
          0,
          orb.x,
          orb.y,
          orb.radius + pulseSize,
        );
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // 绘制星星
      stars.forEach((star) => {
        star.twinkle += 0.02;
        star.opacity = 0.3 + Math.sin(star.twinkle) * 0.5;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();

        // 星星拖尾
        if (star.size > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.1})`;
          ctx.fill();
        }

        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      // 创建流星
      if (frame - lastMeteor > 60 && Math.random() > 0.95) {
        createMeteor();
        lastMeteor = frame;
      }

      // 绘制流星
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;
        m.opacity -= 0.01;

        if (m.opacity <= 0 || m.y > canvas.height) {
          meteors.splice(i, 1);
          continue;
        }

        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = m.y - Math.sin(m.angle) * m.length;

        const gradient = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${m.opacity})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 流星头部光晕
        ctx.beginPath();
        ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${m.opacity})`;
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  type LoginFormValues = {
    username: string;
    password: string;
    autoLogin?: boolean;
  };

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((state) => ({
          ...state,
          currentUser: userInfo,
        }));
      });
    }
  };

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await login({
        username: values.username,
        password: values.password,
      });

      if (response.code === 200) {
        const current = new Date();
        const expireTime = current.setTime(current.getTime() + 1000 * 12 * 60 * 60);
        setSessionToken(response?.data?.accessToken, response?.data?.refreshToken, expireTime);
<<<<<<< HEAD
        setRemoteMenu(null);
        message.success(defaultLoginSuccessMessage);
        await fetchUserInfo();
        await ensureRemoteMenu();
        console.log('login ok');
=======
        message.success(
          intl.formatMessage({ id: 'pages.login.success', defaultMessage: '登录成功' }),
        );
        await fetchUserInfo();
>>>>>>> 2366a979228c6af00cc166eec0be0999f53dd355
        const urlParams = new URL(window.location.href).searchParams;
        history.push(urlParams.get('redirect') || '/');
        return;
      }

      clearSessionToken();
      message.error(response.msg || '用户名或密码错误');
    } catch (error) {
      clearSessionToken();
      message.error(
        intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试' }),
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <Helmet>
        <title>登录页 - {Settings.title}</title>
      </Helmet>
      {/* 动态背景 */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* 鼠标跟随光效 */}
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          transform: `translate(${mousePos.x - 200}px, ${mousePos.y - 200}px)`,
          transition: 'transform 0.1s ease-out',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 主内容 - 50/50布局 */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {/* 左侧品牌区域 - 50% */}
        <div
          className="login-brand"
          style={{
            width: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // padding: "5%",
          }}
        >
          {/* 内容容器 - 占左侧80% */}
          <div
            style={{
              width: '100%',
              // maxWidth: "600px",
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3vh',
            }}
          >
            {/* 2.5D 主视觉区域 - 文档智能处理主题 */}
            <div
              style={{
                position: 'relative',
                width: '80%',
                height: '50vh',
                minHeight: '350px',
                maxHeight: '500px',
                perspective: '1200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 主容器 - 跟随鼠标旋转 */}
              <div
                style={{
                  width: '55%',
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: `rotateX(${cubeRotate.x * 0.8}deg) rotateY(${cubeRotate.y * 1}deg)`,
                  // width: "70%",
                  // maxWidth: "380px",
                  aspectRatio: '1',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.15s ease-out',
                }}
              >
                {/* 文档堆叠 - 3D效果 */}
                {[...Array(4)].map((_, i) => {
                  // 根据悬浮的文档类型改变颜色
                  const hoveredColors: Record<string, { r: number; g: number; b: number }> = {
                    pdf: { r: 129, g: 140, b: 248 },
                    word: { r: 147, g: 197, b: 253 },
                    excel: { r: 165, g: 180, b: 252 },
                    ppt: { r: 196, g: 181, b: 253 },
                  };
                  const defaultColor = { r: 99, g: 102, b: 241 };
                  const currentColor = hoveredItem
                    ? hoveredColors[hoveredItem] || defaultColor
                    : defaultColor;
                  const opacity = 0.8 - i * 0.15;
                  const isHovered = hoveredItem !== null;

                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        width: '55%',
                        height: '70%',
                        background: `linear-gradient(135deg, rgba(${currentColor.r + i * 10}, ${currentColor.g + i * 8}, ${currentColor.b}, ${opacity}), rgba(${currentColor.r + 20 + i * 5}, ${currentColor.g + 10 + i * 5}, ${currentColor.b - 20}, ${opacity}))`,
                        border: `1px solid ${isHovered ? `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.5)` : 'rgba(255, 255, 255, 0.2)'}`,
                        borderRadius: '12px',
                        transform: `translateZ(${i * -30}px) translateY(${i * -8}px) rotateY(${i * 3}deg) ${isHovered && i === 0 ? 'scale(1.02)' : ''}`,
                        boxShadow: isHovered
                          ? `0 ${10 + i * 5}px ${20 + i * 10}px rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.5), 0 0 30px rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.3)`
                          : `0 ${10 + i * 5}px ${20 + i * 10}px rgba(99, 102, 241, ${0.3 - i * 0.05})`,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '8%',
                        gap: '4%',
                        transition: 'all 0.4s ease',
                      }}
                    >
                      {/* 文档线条模拟 */}
                      <div
                        style={{
                          width: '60%',
                          height: '6%',
                          background: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: '4px',
                        }}
                      />
                      <div
                        style={{
                          width: '100%',
                          height: '4%',
                          background: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: '3px',
                        }}
                      />
                      <div
                        style={{
                          width: '80%',
                          height: '4%',
                          background: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: '3px',
                        }}
                      />
                      <div
                        style={{
                          width: '90%',
                          height: '4%',
                          background: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: '3px',
                        }}
                      />
                      <div
                        style={{
                          width: '70%',
                          height: '4%',
                          background: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: '3px',
                        }}
                      />
                      {/* AI扫描效果 */}
                      {i === 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: hoveredItem
                              ? `linear-gradient(90deg, transparent, ${hoveredItem === 'pdf' ? '#818cf8' : hoveredItem === 'word' ? '#93c5fd' : hoveredItem === 'excel' ? '#a5b4fc' : '#c4b5fd'}, transparent)`
                              : 'linear-gradient(90deg, transparent, #00ff88, transparent)',
                            animation: 'scan 2s linear infinite',
                            boxShadow: hoveredItem
                              ? `0 0 20px ${hoveredItem === 'pdf' ? '#818cf8' : hoveredItem === 'word' ? '#93c5fd' : hoveredItem === 'excel' ? '#a5b4fc' : '#c4b5fd'}`
                              : '0 0 20px #00ff88',
                            transition: 'all 0.3s ease',
                          }}
                        />
                      )}
                      {/* 显示当前悬浮的文档类型 */}
                      {i === 0 && hoveredItem && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(0, 0, 0, 0.7)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: `1px solid ${hoveredItem === 'pdf' ? '#818cf8' : hoveredItem === 'word' ? '#93c5fd' : hoveredItem === 'excel' ? '#a5b4fc' : '#c4b5fd'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            animation: 'fadeIn 0.3s ease',
                          }}
                        >
                          <span
                            style={{
                              color: '#fff',
                              fontSize: '14px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                            }}
                          >
                            {hoveredItem}
                          </span>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={
                              hoveredItem === 'pdf'
                                ? '#818cf8'
                                : hoveredItem === 'word'
                                  ? '#93c5fd'
                                  : hoveredItem === 'excel'
                                    ? '#a5b4fc'
                                    : '#c4b5fd'
                            }
                            strokeWidth="2"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 中心AI核心 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '66%',
                    left: '60%',
                    transform: `translate(-50%, -50%) translateZ(80px) ${hoveredItem ? 'scale(1.15)' : 'scale(1)'}`,
                    width: '20%',
                    height: '20%',
                    background: hoveredItem
                      ? `linear-gradient(135deg, ${hoveredItem === 'pdf' ? '#818cf8' : hoveredItem === 'word' ? '#93c5fd' : hoveredItem === 'excel' ? '#a5b4fc' : '#c4b5fd'}, ${hoveredItem === 'pdf' ? '#6366f1' : hoveredItem === 'word' ? '#3b82f6' : hoveredItem === 'excel' ? '#818cf8' : '#8b5cf6'})`
                      : 'linear-gradient(135deg, #7862f0, #502f7d)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: hoveredItem
                      ? `0 0 40px ${hoveredItem === 'pdf' ? 'rgba(129, 140, 248, 0.8)' : hoveredItem === 'word' ? 'rgba(147, 197, 253, 0.8)' : hoveredItem === 'excel' ? 'rgba(165, 180, 252, 0.8)' : 'rgba(196, 181, 253, 0.8)'}, 0 0 80px ${hoveredItem === 'pdf' ? 'rgba(129, 140, 248, 0.4)' : hoveredItem === 'word' ? 'rgba(147, 197, 253, 0.4)' : hoveredItem === 'excel' ? 'rgba(165, 180, 252, 0.4)' : 'rgba(196, 181, 253, 0.4)'}`
                      : '0 0 40px rgba(99, 102, 241, 0.6), 0 0 80px rgba(99, 102, 241, 0.3)',
                    animation: hoveredItem ? 'none' : 'pulse 2s ease-in-out infinite',
                    transition: 'all 0.4s ease',
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>

                {/* AI核心外圈脉冲环 - 悬浮时显示 */}
                {hoveredItem && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: '66%',
                        left: '60%',
                        transform: 'translate(-50%, -50%) translateZ(75px)',
                        width: '28%',
                        height: '28%',
                        border: `2px solid ${hoveredItem === 'pdf' ? 'rgba(129, 140, 248, 0.6)' : hoveredItem === 'word' ? 'rgba(147, 197, 253, 0.6)' : hoveredItem === 'excel' ? 'rgba(165, 180, 252, 0.6)' : 'rgba(196, 181, 253, 0.6)'}`,
                        borderRadius: '50%',
                        animation: 'pulseRing 1.5s ease-out infinite',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '66%',
                        left: '60%',
                        transform: 'translate(-50%, -50%) translateZ(70px)',
                        width: '35%',
                        height: '35%',
                        border: `1px solid ${hoveredItem === 'pdf' ? 'rgba(129, 140, 248, 0.3)' : hoveredItem === 'word' ? 'rgba(147, 197, 253, 0.3)' : hoveredItem === 'excel' ? 'rgba(165, 180, 252, 0.3)' : 'rgba(196, 181, 253, 0.3)'}`,
                        borderRadius: '50%',
                        animation: 'pulseRing 1.5s ease-out infinite 0.3s',
                      }}
                    />
                  </>
                )}

                {/* 数据流动粒子 */}
                {[...Array(8)].map((_, i) => {
                  const particleColor = hoveredItem
                    ? hoveredItem === 'pdf'
                      ? '#818cf8'
                      : hoveredItem === 'word'
                        ? '#93c5fd'
                        : hoveredItem === 'excel'
                          ? '#a5b4fc'
                          : '#c4b5fd'
                    : i % 2 === 0
                      ? '#00ff88'
                      : '#3b82f6';
                  return (
                    <div
                      key={`particle-${i}`}
                      style={{
                        position: 'absolute',
                        top: '70%',
                        left: '70%',
                        width: '2%',
                        height: '2%',
                        minWidth: '4px',
                        minHeight: '4px',
                        background: particleColor,
                        borderRadius: '50%',
                        boxShadow: `0 0 10px ${particleColor}`,
                        animation: `orbit ${3 + i * 0.5}s linear infinite`,
                        animationDelay: `${i * 0.4}s`,
                        transition: 'all 0.4s ease',
                      }}
                    />
                  );
                })}
              </div>

              {/* 装饰元素 - 各种文档 */}
              {[
                { id: 'pdf', name: 'PDF', top: '8%', left: '8%', color: '#818cf8', delay: 0 },
                { id: 'word', name: 'Word', top: '8%', right: '8%', color: '#93c5fd', delay: 0.5 },
                {
                  id: 'excel',
                  name: 'Excel',
                  bottom: '8%',
                  left: '8%',
                  color: '#a5b4fc',
                  delay: 1,
                },
                { id: 'ppt', name: 'PPT', bottom: '8%', right: '8%', color: '#c4b5fd', delay: 1.5 },
              ].map((item) => (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    position: 'absolute',
                    ...{ top: item.top, bottom: item.bottom, left: item.left, right: item.right },
                    width: '12%',
                    height: '12%',
                    minWidth: '45px',
                    minHeight: '45px',
                    background: `linear-gradient(135deg, ${item.color}20, ${item.color}10)`,
                    border: `1px solid ${item.color}40`,
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    animation: `float${(item.delay % 3) + 1} 4s ease-in-out infinite`,
                    animationDelay: `${item.delay}s`,
                    transition: 'all 0.3s ease',
                    transform:
                      hoveredItem === item.id ? 'scale(1.15) translateY(-5px)' : 'scale(1)',
                    boxShadow: hoveredItem === item.id ? `0 0 30px ${item.color}60` : 'none',
                  }}
                >
                  {/* 文档图标 */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    {item.id === 'pdf' && (
                      <>
                        <text
                          x="8"
                          y="16"
                          fontSize="6"
                          fill={item.color}
                          stroke="none"
                          fontWeight="bold"
                        >
                          PDF
                        </text>
                      </>
                    )}
                    {item.id === 'word' && (
                      <>
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <text
                          x="8"
                          y="16"
                          fontSize="6"
                          fill={item.color}
                          stroke="none"
                          fontWeight="bold"
                        >
                          W
                        </text>
                      </>
                    )}
                    {item.id === 'excel' && (
                      <>
                        <line x1="8" y1="12" x2="16" y2="12" />
                        <line x1="8" y1="16" x2="16" y2="16" />
                        <line x1="12" y1="10" x2="12" y2="18" />
                      </>
                    )}
                    {item.id === 'ppt' && (
                      <>
                        <rect x="9" y="11" width="6" height="5" rx="1" />
                        <line x1="12" y1="16" x2="12" y2="18" />
                      </>
                    )}
                  </svg>
                  {/* 文字标签 */}
                  <span style={{ fontSize: '10px', color: item.color, fontWeight: 500 }}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>

            {/* 文字内容 */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div
                style={{
                  fontSize: 'clamp(28px, 4vw, 48px)',
                  fontWeight: 800,
                  marginBottom: '16px',
                  background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.3,
                }}
              >
                文档信息
                <br />
                智能处理系统
              </div>

              <p
                style={{
                  fontSize: 'clamp(14px, 1.5vw, 18px)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: '28px',
                  lineHeight: 1.8,
                }}
              >
                企业级知识管理与智能分析平台
              </p>

              {/* 特性标签 */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  justifyContent: 'center',
                }}
              >
                {['数据接入', '智能处理', '智能检索', '实时分析'].map((tag, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 18px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '16px',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧登录卡片 - 50% */}
        <div
          className="login-right"
          style={{
            width: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'start',
            padding: '5%',
          }}
        >
          <div style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>
            {/* 卡片光晕 */}
            <div
              style={{
                position: 'absolute',
                inset: '-4px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #3b82f6, #6366f1)',
                backgroundSize: '300% 300%',
                animation: 'gradientBorder 4s ease infinite',
                filter: 'blur(8px)',
                opacity: 0.6,
                zIndex: -1,
              }}
            />

            {/* 卡片主体 */}
            <div
              style={{
                background: 'rgba(15, 15, 40, 0.85)',
                backdropFilter: 'blur(40px)',
                borderRadius: '24px',
                padding: 'clamp(24px, 4vw, 48px) clamp(20px, 3vw, 40px)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* 卡片顶部装饰 */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #3b82f6)',
                }}
              />

              {/* 卡片内部光效 */}
              <div
                style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background:
                    'radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Logo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'clamp(20px, 3vw, 32px)',
                }}
              >
                <div
                  style={{
                    width: 'clamp(48px, 5vw, 64px)',
                    height: 'clamp(48px, 5vw, 64px)',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  <img src="/logo.svg" alt="logo" style={{ width: '60%', height: '60%' }} />
                </div>
              </div>

              {/* 标题 */}
              <h2
                style={{
                  textAlign: 'center',
                  fontSize: 'clamp(20px, 2.5vw, 26px)',
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: '8px',
                }}
              >
                欢迎回来
              </h2>
              <p
                style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: '36px',
                }}
              >
                登录您的账户以继续
              </p>

              {/* 表单 */}
              <Form
                name="login"
                form={form}
                initialValues={{
                  autoLogin: true,
                  username: 'admin',
                  password: 'admin123',
                }}
                onFinish={onFinish}
                size="large"
              >
                <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input
                    prefix={
                      <UserOutlined style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px' }} />
                    }
                    placeholder="用户名"
                    style={{
                      height: '52px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '14px',
                      color: '#fff',
                      fontSize: '15px',
                    }}
                  />
                </Form.Item>

                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password
                    autoComplete="off"
                    prefix={
                      <LockOutlined style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px' }} />
                    }
                    placeholder="密码"
                    style={{
                      height: '52px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '14px',
                      color: '#fff',
                      fontSize: '15px',
                    }}
                  />
                </Form.Item>

                <Form.Item>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Form.Item name="autoLogin" valuePropName="checked" noStyle>
                      <Checkbox style={{ color: 'rgba(255,255,255,0.5)' }}>自动登录</Checkbox>
                    </Form.Item>
                    {/* <a
                    style={{
                      color: "#818cf8",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    忘记密码?
                  </a> */}
                  </div>
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={loading}
                    style={{
                      height: 'clamp(44px, 4vw, 52px)',
                      borderRadius: '14px',
                      fontSize: 'clamp(14px, 1.2vw, 16px)',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      border: 'none',
                      boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                      letterSpacing: '4px',
                    }}
                  >
                    登 录
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>

        {/* 全局动画样式 */}
        <style>{`
        @keyframes gradientBorder {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .ant-input,
        .ant-input-password .ant-input {
          background: transparent !important;
          color: #fff !important;
        }

        .ant-input::placeholder {
          color: rgba(255, 255, 255, 0.3) !important;
        }

        .ant-input-prefix {
          color: rgba(255, 255, 255, 0.3) !important;
        }

        .ant-input-password-icon {
          color: rgba(255, 255, 255, 0.3) !important;
        }

        .ant-input-password-icon:hover {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        .ant-checkbox-inner {
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }

        .ant-input:focus,
        .ant-input-focused,
        .ant-input-affix-wrapper:focus,
        .ant-input-affix-wrapper-focused {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
        }

        .ant-input:hover,
        .ant-input-affix-wrapper:hover {
          border-color: rgba(99, 102, 241, 0.5) !important;
        }

        @keyframes cubeFloat {
          0%, 100% {
            transform: translate(-50%, -50%) rotateX(-20deg) rotateY(30deg) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) rotateX(-20deg) rotateY(30deg) translateY(-15px);
          }
        }

        @keyframes float1 {
          0%, 100% {
            transform: rotate(-15deg) translateY(0);
          }
          50% {
            transform: rotate(-15deg) translateY(-20px);
          }
        }

        @keyframes float2 {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-25px) scale(1.1);
          }
        }

        @keyframes float3 {
          0%, 100% {
            transform: rotate(45deg) translateY(0);
          }
          50% {
            transform: rotate(45deg) translateY(-18px);
          }
        }

        @keyframes rotate {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(240px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) translateZ(80px) scale(1);
            box-shadow: 0 0 40px rgba(99, 102, 241, 0.6), 0 0 80px rgba(99, 102, 241, 0.3);
          }
          50% {
            transform: translate(-50%, -50%) translateZ(80px) scale(1.1);
            box-shadow: 0 0 60px rgba(99, 102, 241, 0.8), 0 0 120px rgba(99, 102, 241, 0.4);
          }
        }

        @keyframes orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(100px) rotate(0deg);
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(100px) rotate(-360deg);
            opacity: 1;
          }
        }

        @keyframes uploadBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes pulseRing {
          0% {
            transform: translate(-50%, -50%) translateZ(75px) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) translateZ(75px) scale(1.5);
            opacity: 0;
          }
        }

        @media (max-width: 1024px) {
          .login-brand {
            display: none !important;
          }
          
          /* 小屏幕时右侧占满 */
          .login-right {
            width: 100% !important;
            padding: 20px !important;
          }
        }
      `}</style>
      </div>
    </div>
  );
};

export default Login;
