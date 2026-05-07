# 雅思留学MBTI项目 - 修复记录

## 修复日期: 2026-05-07

### 🔴 Bug修复

1. **重新测试必须重新登录** — `startBtn.onclick` 被覆盖为 `showLogin()`，改为 `showBubbleScreen()`；已登录用户直接进泡泡选择页
2. **注册时密码字段多余** — 去掉密码和确认密码字段，改为手机号+验证码免密登录模式
3. **登录页密码字段** — 改为验证码登录，去掉密码输入框，增加图形验证码+短信验证码流程

### 🔴 安全漏洞修复

1. **密码明文存储** — 去掉密码字段，不再存储密码
2. **硬编码密码** — 管理员密码和重置密码改为从环境变量读取
3. **验证码API返回** — 生产环境(NODE_ENV=production)不返回debugCode
4. **管理员密码URL明文传递** — 改用Header(x-admin-password)传递
5. **exports目录无鉴权** — 删除静态文件路由，改为 `/api/admin/download/:fileName` 需鉴权
6. **路径遍历攻击** — 下载接口增加路径校验

### 🟡 不合理设计修复

1. **同名可重复注册** — 手机号唯一即可，姓名不做限制
2. **admin token无验证** — 登录token改为包含随机hex
3. **admin API密码query参数** — 改为Header传递

### 📝 注意事项

- data.json中已有用户的password字段会被忽略，不影响新逻辑
- 生产部署需设置环境变量: ADMIN_PASSWORD, RESET_PASSWORD, NODE_ENV=production
