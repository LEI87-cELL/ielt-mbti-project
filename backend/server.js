/**
 * 留学航空MBTI - Node.js Express 后端服务
 * 支持 CloudBase 云数据库 + 本地 JSON 文件双模式
 * 敏感配置通过环境变量管理
 */

// ===== 手动加载 .env 文件（无需安装 dotenv） =====
(function loadEnvFile() {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const eqIdx = line.indexOf('=');
                if (eqIdx > 0) {
                    const key = line.substring(0, eqIdx).trim();
                    const val = line.substring(eqIdx + 1).trim();
                    process.env[key] = val;
                }
            }
        });
        console.log('✅ 已加载 .env 配置');
    }
})();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// ===== CloudBase 云数据库初始化 =====
let cloudbase;
let app_cloud;
let cloudDB;
let USE_CLOUD_DB = false;

try {
    cloudbase = require('@cloudbase/node-sdk');
    const envId = process.env.CLOUDBASE_ENV_ID || process.env.ENV_ID || '';
    if (envId) {
        app_cloud = cloudbase.init({ env: envId });
        cloudDB = app_cloud.database();
        USE_CLOUD_DB = true;
        console.log('✅ CloudBase 云数据库初始化成功，envId:', envId);
    } else {
        console.log('⚠️  未设置 CLOUDBASE_ENV_ID 环境变量，使用本地 JSON 文件数据库');
    }
} catch (e) {
    console.log('⚠️  CloudBase SDK 未安装，使用本地 JSON 文件数据库');
}

const app = express();
const PORT = process.env.PORT || 3001;

// ===== 敏感配置（必须从环境变量读取） =====
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
let RESET_PASSWORD = process.env.RESET_PASSWORD;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!ADMIN_PASSWORD || !RESET_PASSWORD) {
  if (IS_PRODUCTION) {
    console.error('❌ 错误：生产环境必须设置 ADMIN_PASSWORD 和 RESET_PASSWORD 环境变量！');
    process.exit(1);
  } else {
    console.warn('⚠️  警告：ADMIN_PASSWORD 或 RESET_PASSWORD 环境变量未设置！');
    if (!ADMIN_PASSWORD) ADMIN_PASSWORD = 'dev-admin-123';
    if (!RESET_PASSWORD) RESET_PASSWORD = 'dev-reset-123';
  }
}

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== 本地 JSON 文件数据库（后备方案）=====
const DATA_FILE = path.join(__dirname, 'data.json');
let localDB = {
    users: [],
    testResults: [],
    statistics: { totalTests: 0, clickCount: 0, baobanClicks: 0, loginCount: 0 }
};

function loadLocalData() {
    if (USE_CLOUD_DB) return;
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const loaded = JSON.parse(raw);
            localDB.users = loaded.users || [];
            localDB.testResults = loaded.testResults || [];
            localDB.statistics = loaded.statistics || localDB.statistics;
        }
    } catch (err) {
        console.log('📝 首次运行，创建新数据库');
    }
}

function saveLocalData() {
    if (USE_CLOUD_DB) return;
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(localDB, null, 2));
    } catch (err) {
        console.error('❌ 数据保存失败:', err);
    }
}

// ===== 统一数据访问层 =====

// 获取所有用户
async function getUsers() {
    if (USE_CLOUD_DB) {
        const res = await cloudDB.collection('users').get();
        return res.data || [];
    } else {
        return localDB.users;
    }
}

// 根据ID获取用户
async function getUserById(id) {
    if (USE_CLOUD_DB) {
        const res = await cloudDB.collection('users').where({ id }).get();
        return res.data && res.data[0];
    } else {
        return localDB.users.find(u => u.id === id);
    }
}

// 根据手机号获取用户
async function getUserByPhone(phone) {
    if (USE_CLOUD_DB) {
        const res = await cloudDB.collection('users').where({ phone }).get();
        return res.data && res.data[0];
    } else {
        return localDB.users.find(u => u.phone === phone);
    }
}

// 添加用户
async function addUser(user) {
    if (USE_CLOUD_DB) {
        await cloudDB.collection('users').add(user);
    } else {
        localDB.users.push(user);
        saveLocalData();
    }
}

// 更新用户
async function updateUser(id, data) {
    if (USE_CLOUD_DB) {
        await cloudDB.collection('users').where({ id }).update(data);
    } else {
        const idx = localDB.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            localDB.users[idx] = { ...localDB.users[idx], ...data };
            saveLocalData();
        }
    }
}

// 删除用户
async function deleteUser(id) {
    if (USE_CLOUD_DB) {
        await cloudDB.collection('users').where({ id }).remove();
    } else {
        localDB.users = localDB.users.filter(u => u.id !== id);
        saveLocalData();
    }
}

// 获取所有测试结果
async function getTestResults() {
    if (USE_CLOUD_DB) {
        const res = await cloudDB.collection('testResults').get();
        return res.data || [];
    } else {
        return localDB.testResults;
    }
}

// 添加测试结果
async function addTestResult(result) {
    if (USE_CLOUD_DB) {
        await cloudDB.collection('testResults').add(result);
    } else {
        localDB.testResults.push(result);
        saveLocalData();
    }
}

// 删除测试结果
async function deleteTestResult(id) {
    if (USE_CLOUD_DB) {
        await cloudDB.collection('testResults').where({ id }).remove();
    } else {
        localDB.testResults = localDB.testResults.filter(r => r.id !== id);
        saveLocalData();
    }
}

// 获取统计数据
async function getStatistics() {
    if (USE_CLOUD_DB) {
        const res = await cloudDB.collection('statistics').get();
        if (res.data && res.data[0]) {
            return res.data[0];
        }
        // 如果不存在则创建
        const defaultStats = { _id: 'stats', totalTests: 0, clickCount: 0, baobanClicks: 0, loginCount: 0 };
        await cloudDB.collection('statistics').add(defaultStats);
        return defaultStats;
    } else {
        return localDB.statistics;
    }
}

// 更新统计数据
async function updateStatistics(data) {
    if (USE_CLOUD_DB) {
        const res = await cloudDB.collection('statistics').get();
        if (res.data && res.data[0]) {
            await cloudDB.collection('statistics').where({ _id: res.data[0]._id }).update(data);
        } else {
            await cloudDB.collection('statistics').add({ _id: 'stats', ...data });
        }
    } else {
        localDB.statistics = { ...localDB.statistics, ...data };
        saveLocalData();
    }
}

// 重置所有数据
async function resetAllData() {
    if (USE_CLOUD_DB) {
        // 删除所有用户
        const users = await cloudDB.collection('users').get();
        for (const u of (users.data || [])) {
            await cloudDB.collection('users').where({ _id: u._id }).remove();
        }
        // 删除所有测试结果
        const results = await cloudDB.collection('testResults').get();
        for (const r of (results.data || [])) {
            await cloudDB.collection('testResults').where({ _id: r._id }).remove();
        }
        // 重置统计数据
        const stats = await cloudDB.collection('statistics').get();
        for (const s of (stats.data || [])) {
            await cloudDB.collection('statistics').where({ _id: s._id }).update({
                totalTests: 0, clickCount: 0, baobanClicks: 0, loginCount: 0
            });
        }
    } else {
        localDB.users = [];
        localDB.testResults = [];
        localDB.statistics = { totalTests: 0, clickCount: 0, baobanClicks: 0, loginCount: 0 };
        saveLocalData();
    }
}

// ===== 工具函数 =====

// 密码哈希（SHA-256 + salt）
function hashPassword(password, salt) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
    return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
    const { hash } = hashPassword(password, salt);
    return hash === storedHash;
}

// ===== 验证码存储 =====
let verificationCodes = {};
let loginVerificationCodes = {};
let captchaCodes = {};

// 管理员会话token存储
let adminSessions = {};
const ADMIN_SESSION_TTL = 2 * 60 * 60 * 1000;

// 管理员验证中间件
function adminAuth(req, res, next) {
    const adminPassword = req.headers['x-admin-password'] || req.query.admin_password;
    if (adminPassword !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: '管理员密码错误' });
    }
    next();
}

// ===== 初始化本地数据 =====
loadLocalData();

// ===== API 路由 =====

// 1. 发送注册验证码
app.post('/api/send-code', async (req, res) => {
    const { phone } = req.body;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.json({ success: false, message: '请输入正确的手机号' });
    }
    
    const existing = await getUserByPhone(phone);
    if (existing) {
        return res.json({ success: false, message: '该手机号已注册' });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[phone] = { code, expiresAt: Date.now() + 5 * 60 * 1000 };
    
    console.log(`📱 注册验证码 ${phone}: ${code}（生产环境应接入短信服务）`);
    res.json({ success: true, message: '验证码已发送（控制台查看）', code });
});

// 2. 注册
app.post('/api/register', async (req, res) => {
    const { name, phone, verificationCode, grade } = req.body;
    
    if (!verificationCodes[phone]) {
        return res.json({ success: false, message: '请先获取验证码' });
    }
    if (Date.now() > verificationCodes[phone].expiresAt) {
        delete verificationCodes[phone];
        return res.json({ success: false, message: '验证码已过期' });
    }
    if (verificationCodes[phone].code !== verificationCode) {
        return res.json({ success: false, message: '验证码错误' });
    }
    delete verificationCodes[phone];
    
    const existing = await getUserByPhone(phone);
    if (existing) {
        return res.json({ success: false, message: '该手机号已注册' });
    }
    
    const user = {
        id: uuidv4(),
        userId: req.body.userId || '',
        name,
        phone,
        grade: grade || '',
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
    
    await addUser(user);
    
    // 更新统计
    const stats = await getStatistics();
    await updateStatistics(stats);
    
    console.log(`✅ 用户注册: ${name} (${phone})`);
    
    res.json({
        success: true,
        message: '注册成功',
        user: { id: user.id, name: user.name, phone: user.phone, grade: user.grade }
    });
});

// 2-1. 发送登录验证码
app.post('/api/send-login-code', (req, res) => {
    const { phone } = req.body;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.json({ success: false, message: '请输入正确的手机号' });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    loginVerificationCodes[phone] = { code, expiresAt: Date.now() + 5 * 60 * 1000 };
    
    console.log(`📱 登录验证码 ${phone}: ${code}（生产环境应接入短信服务）`);
    res.json({ success: true, message: '验证码已发送（控制台查看）', code });
});

// 2-2. 登录
app.post('/api/login', async (req, res) => {
    const { phone, verificationCode } = req.body;
    
    if (!loginVerificationCodes[phone]) {
        return res.json({ success: false, message: '请先获取验证码' });
    }
    if (Date.now() > loginVerificationCodes[phone].expiresAt) {
        delete loginVerificationCodes[phone];
        return res.json({ success: false, message: '验证码已过期，请重新获取' });
    }
    if (loginVerificationCodes[phone].code !== verificationCode) {
        return res.json({ success: false, message: '验证码错误' });
    }
    delete loginVerificationCodes[phone];
    
    const user = await getUserByPhone(phone);
    if (!user) {
        return res.json({ success: false, message: '该手机号未注册' });
    }
    
    // 更新最后登录时间
    await updateUser(user.id, { lastLogin: new Date().toISOString() });
    
    // 更新统计
    const stats = await getStatistics();
    stats.loginCount = (stats.loginCount || 0) + 1;
    await updateStatistics(stats);
    
    // 查询该用户之前的测试结果（按时间倒序）
    const allResults = await getTestResults();
    const userResults = allResults
        .filter(r => r.userId === user.id)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    const testCount = userResults.length;
    const previousResult = userResults.length > 0 ? userResults[0] : null;
    
    console.log(`🔐 用户登录: ${user.name} (${user.phone}) - 已测试 ${testCount} 次`);
    
    res.json({
        success: true,
        message: '登录成功',
        user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            grade: user.grade
        },
        testCount: testCount,
        previousResult: previousResult,
        allResults: userResults
    });
});

// 3. 提交测试结果
app.post('/api/submit-test', async (req, res) => {
    const { userId, mbti, scores, answers, personaType, country, advice, userSchool } = req.body;
    
    if (!mbti) {
        return res.json({ success: false, message: '测试结果不完整' });
    }
    
    // 检查用户测试次数（仅对登录用户限制）
    if (userId && userId !== 'anonymous') {
        const allResults = await getTestResults();
        const userTestCount = allResults.filter(r => r.userId === userId).length;
        if (userTestCount >= 2) {
            return res.json({ 
                success: false, 
                message: '测试次数已用完（最多2次），如需重新测试请联系管理员' 
            });
        }
    }
    
    const isKeyUser = answers && answers[3] === 2;
    
    const result = {
        id: uuidv4(),
        userId: userId || 'anonymous',
        mbti,
        scores,
        answers,
        personaType,
        country,
        advice,
        userSchool: userSchool || '',
        isKeyUser: isKeyUser,
        submittedAt: new Date().toISOString()
    };
    
    await addTestResult(result);
    
    // 更新统计
    const stats = await getStatistics();
    stats.totalTests = (stats.totalTests || 0) + 1;
    await updateStatistics(stats);
    
    console.log(`📊 新测试提交: ${mbti} - 用户: ${userId || '匿名'} 学校: ${userSchool || '未选择'} ${isKeyUser ? '⭐重点用户' : ''}`);
    
    res.json({
        success: true,
        message: '结果已保存',
        resultId: result.id
    });
});

// 3-1. 查询用户测试次数
app.get('/api/user-test-count', async (req, res) => {
    const { userId } = req.query;
    
    if (!userId) {
        return res.json({ success: false, message: '缺少用户ID' });
    }
    
    const allResults = await getTestResults();
    const userTestCount = allResults.filter(r => r.userId === userId).length;
    const userResults = allResults
        .filter(r => r.userId === userId)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    const lastResult = userResults.length > 0 ? userResults[0] : null;
    
    res.json({
        success: true,
        testCount: userTestCount,
        lastResult: lastResult,
        canTest: userTestCount < 2
    });
});

// 4. 记录点击事件
app.post('/api/track-click', async (req, res) => {
    const { type, userId } = req.body;
    
    const stats = await getStatistics();
    stats.clickCount = (stats.clickCount || 0) + 1;
    
    if (type === 'baoban') {
        stats.baobanClicks = (stats.baobanClicks || 0) + 1;
        console.log(`📢 报班按钮点击: 用户 ${userId || '匿名'}`);
    }
    
    await updateStatistics(stats);
    
    res.json({ success: true, message: '点击已记录' });
});

// 5. 获取统计数据（管理员）
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    const users = await getUsers();
    const results = await getTestResults();
    const stats = await getStatistics();
    
    const mbtiStats = {};
    results.forEach(r => {
        mbtiStats[r.mbti] = (mbtiStats[r.mbti] || 0) + 1;
    });
    
    const gradeStats = {};
    users.forEach(u => {
        gradeStats[u.grade] = (gradeStats[u.grade] || 0) + 1;
    });
    
    const recentTests = results.slice(-10).reverse().map(r => {
        const user = users.find(u => u.id === r.userId);
        return {
            ...r,
            userName: user ? user.name : '匿名用户',
            userPhone: user ? user.phone : '-',
            userGrade: user ? user.grade : '-'
        };
    });
    
    res.json({
        success: true,
        data: {
            ...stats,
            totalUsers: users.length,
            totalResults: results.length,
            mbtiDistribution: mbtiStats,
            gradeDistribution: gradeStats,
            recentUsers: users.slice(-10).reverse(),
            recentTests: recentTests
        }
    });
});

// 6. 获取用户列表（管理员）
app.get('/api/admin/users', adminAuth, async (req, res) => {
    const users = await getUsers();
    res.json({
        success: true,
        users: users.map(u => ({
            id: u.id,
            userId: u.userId,
            name: u.name,
            phone: u.phone,
            grade: u.grade,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin
        }))
    });
});

// 7. 获取测试结果列表（管理员）
app.get('/api/admin/results', adminAuth, async (req, res) => {
    const users = await getUsers();
    const results = await getTestResults();
    
    const resultsWithUserName = results.map(r => {
        const user = users.find(u => u.id === r.userId);
        return {
            ...r,
            userName: user ? user.name : '匿名用户',
            userPhone: user ? user.phone : '-',
            userGrade: user ? user.grade : '-'
        };
    });
    
    res.json({
        success: true,
        results: resultsWithUserName
    });
});

// 8. 删除单条测试记录（管理员）
app.delete('/api/admin/results/:id', adminAuth, async (req, res) => {
    const resultId = req.params.id;
    
    await deleteTestResult(resultId);
    
    console.log(`🗑️ 删除测试记录: ${resultId}`);
    
    res.json({ success: true, message: '删除成功' });
});

// 9. 重置所有数据（管理员）
app.post('/api/admin/reset', async (req, res) => {
    const { password } = req.body;
    
    if (password !== RESET_PASSWORD) {
        return res.json({ success: false, message: '重置密码错误' });
    }
    
    const users = await getUsers();
    const results = await getTestResults();
    
    const stats = {
        usersCount: users.length,
        resultsCount: results.length
    };
    
    await resetAllData();
    
    console.log(`🗑️ 所有数据已重置! 用户: ${stats.usersCount}, 测试: ${stats.resultsCount}`);
    
    res.json({
        success: true,
        message: `数据已重置！共清理 ${stats.usersCount} 个用户，${stats.resultsCount} 条测试记录`,
        stats: stats
    });
});

// 10. 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: USE_CLOUD_DB ? 'CloudBase' : 'Local JSON'
    });
});

// 11. 管理员登录
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (password !== ADMIN_PASSWORD) {
        return res.json({ success: false, message: '管理员密码错误' });
    }
    
    const token = `admin_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    adminSessions[token] = {
        createdAt: Date.now(),
        expiresAt: Date.now() + ADMIN_SESSION_TTL
    };
    
    // 清理过期session
    Object.keys(adminSessions).forEach(t => {
        if (Date.now() > adminSessions[t].expiresAt) {
            delete adminSessions[t];
        }
    });
    
    console.log(`🔐 管理员登录成功, token: ${token.slice(0, 20)}...`);
    
    res.json({
        success: true,
        message: '管理员登录成功',
        token: token
    });
});

// 11-1. 验证管理员token是否有效
app.post('/api/admin/verify', (req, res) => {
    const { token } = req.body;
    
    if (!token || !adminSessions[token]) {
        return res.json({ success: false, message: '会话已过期，请重新登录' });
    }
    
    if (Date.now() > adminSessions[token].expiresAt) {
        delete adminSessions[token];
        return res.json({ success: false, message: '会话已过期，请重新登录' });
    }
    
    // 刷新过期时间
    adminSessions[token].expiresAt = Date.now() + ADMIN_SESSION_TTL;
    
    res.json({ success: true, message: '会话有效' });
});

// 12. 导出所有数据为Excel（管理员）
app.get('/api/admin/export', adminAuth, async (req, res) => {
    try {
        const users = await getUsers();
        const results = await getTestResults();
        
        const wb = new ExcelJS.Workbook();
        
        const wsUsers = wb.addWorksheet('用户列表');
        wsUsers.columns = [
            { header: '姓名', key: 'name', width: 15 },
            { header: '手机号', key: 'phone', width: 15 },
            { header: '年级', key: 'grade', width: 10 },
            { header: '学号/ID', key: 'userId', width: 18 },
            { header: '注册时间', key: 'createdAt', width: 22 },
            { header: '最近登录', key: 'lastLogin', width: 22 }
        ];
        users.forEach(u => {
            wsUsers.addRow({
                name: u.name,
                phone: u.phone,
                grade: u.grade,
                userId: u.userId,
                createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString('zh-CN') : '',
                lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString('zh-CN') : '未登录'
            });
        });
        
        const wsResults = wb.addWorksheet('测试记录');
        wsResults.columns = [
            { header: '用户姓名', key: 'userName', width: 15 },
            { header: '手机号', key: 'userPhone', width: 15 },
            { header: '年级', key: 'userGrade', width: 10 },
            { header: '重点用户', key: 'isKeyUser', width: 12 },
            { header: 'MBTI类型', key: 'mbti', width: 12 },
            { header: '推荐国家', key: 'country', width: 25 },
            { header: '心仪学校', key: 'userSchool', width: 25 },
            { header: '测试时间', key: 'submittedAt', width: 22 },
            { header: 'E维度得分', key: 'E', width: 12 },
            { header: 'I维度得分', key: 'I', width: 12 },
            { header: 'S维度得分', key: 'S', width: 12 },
            { header: 'N维度得分', key: 'N', width: 12 },
            { header: 'T维度得分', key: 'T', width: 12 },
            { header: 'F维度得分', key: 'F', width: 12 },
            { header: 'J维度得分', key: 'J', width: 12 },
            { header: 'P维度得分', key: 'P', width: 12 }
        ];
        results.forEach(r => {
            const user = users.find(u => u.id === r.userId);
            wsResults.addRow({
                userName: user ? user.name : '匿名用户',
                userPhone: user ? user.phone : '-',
                userGrade: user ? user.grade : '-',
                isKeyUser: r.isKeyUser ? '是' : '否',
                mbti: r.mbti,
                country: r.country || '',
                userSchool: r.userSchool || '',
                submittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString('zh-CN') : '',
                E: r.scores ? r.scores.E : '',
                I: r.scores ? r.scores.I : '',
                S: r.scores ? r.scores.S : '',
                N: r.scores ? r.scores.N : '',
                T: r.scores ? r.scores.T : '',
                F: r.scores ? r.scores.F : '',
                J: r.scores ? r.scores.J : '',
                P: r.scores ? r.scores.P : ''
            });
        });
        
        const fileName = `MBTI数据导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
        const tempPath = path.join(__dirname, fileName);
        await wb.xlsx.writeFile(tempPath);
        
        res.download(tempPath, fileName, (err) => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        });
    } catch (err) {
        console.error('导出失败:', err);
        res.json({ success: false, message: '导出失败: ' + err.message });
    }
});

// 13. 安全下载导出文件（管理员）
app.get('/api/admin/download/:fileName', adminAuth, (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, fileName);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: '文件不存在' });
    }
    
    res.download(filePath, fileName, (err) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
});

// 启动服务
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 留学航空MBTI后端服务启动成功！`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`💾 数据库模式: ${USE_CLOUD_DB ? '☁️  CloudBase 云数据库' : '📝 本地 JSON 文件'}`);
    console.log(`${'='.repeat(60)}\n`);
});
