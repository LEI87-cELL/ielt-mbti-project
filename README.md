# 留学航空MBTI测试系统
#已配
前后端分离项目，包含用户注册登录、MBTI测试、管理后台等功能。

## 项目结构

```
ielt-mbti-project/
├── frontend/          # 前端（静态HTML）
│   ├── index.html    # 用户端首页
│   └── admin.html    # 管理后台
└── backend/          # 后端（Node.js + Express）
    ├── server.js     # 主服务器
    ├── package.json  # 依赖配置
    └── data.json     # 数据存储（自动生成）
```

## 快速启动

### 1. 启动后端服务

```bash
cd ielt-mbti-project/backend
npm install
npm start
```

后端启动后会显示：
- 服务地址：http://localhost:3001
- 管理员密码：123456
- 管理后台：http://localhost:3001/admin.html

### 2. 访问前端

打开浏览器访问：http://localhost:3001

## 功能说明

### 用户端 (index.html)
- ✅ 首页展示，点击"开启航班"开始测试
- ✅ 手机号登录 / 姓名登录 两种登录方式
- ✅ 注册功能（姓名、学号、年级、手机号、密码）
- ✅ 8道MBTI测试题目
- ✅ 测试完成后显示人格结果页面
- ✅ 老用户登录后自动显示历史测试结果
- ✅ 点击"复制微信号"按钮记录报班点击
- ✅ 分享功能

### 管理后台 (admin.html)
- 管理员密码：123456
- 查看统计数据（测试次数、用户数、点击率、报班点击）
- MBTI人格分布统计
- 用户列表
- 测试记录列表

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/register | POST | 用户注册 |
| /api/login | POST | 用户登录（支持手机号/姓名） |
| /api/submit-test | POST | 提交测试结果 |
| /api/track-click | POST | 记录点击事件 |
| /api/admin/stats | GET | 获取统计数据（需密码） |
| /api/admin/users | GET | 用户列表（需密码） |
| /api/admin/results | GET | 测试结果列表（需密码） |

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML/CSS/JavaScript
- **数据存储**：JSON文件（data.json）
- **端口**：3001
