const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-super-secret-key-that-is-long-and-random';


// ---------------- API 端点 ----------------

// --- “金丝雀”测试路由 ---
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'Success! The server is alive and running the latest code.' });
});

// ========= 1. 公共路由 (不需要登录) =========
// ...



app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    }
    console.log('Connected to the SQLite database.');
});

db.exec('PRAGMA foreign_keys = ON;', (err) => {
    if (err) console.error("Failed to enable foreign keys:", err.message);
});

db.serialize(() => {
    // --- 修改 #1: 为 users 表添加 points 字段 ---
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        points INTEGER DEFAULT 0 NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS lottery_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        result TEXT NOT NULL,
        drew_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ratings (
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
        PRIMARY KEY (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);
});

// --- 公共路由 ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.run(sql, [username, hashedPassword], function (err) {
            if (err) return res.status(400).json({ message: 'Username already exists.' });
            res.status(201).json({ id: this.lastID, username });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ message: 'Invalid credentials.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, username: user.username } });
    });
});

app.get('/api/posts', (req, res) => {
    const sql = `
        SELECT p.id, p.content, p.created_at, u.username, p.user_id,
               COALESCE(r.avg_score, 0) AS average_score, 
               COALESCE(r.rating_count, 0) AS rating_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN (
            SELECT post_id, AVG(score) as avg_score, COUNT(score) as rating_count 
            FROM ratings 
            GROUP BY post_id
        ) r ON p.id = r.post_id
        ORDER BY p.created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error fetching posts', error: err.message });
        res.json(rows);
    });
});

// --- 身份验证中间件 ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
};

// --- 受保护的路由 ---

// --- 修改 #2: 个人主页 API 返回更多信息 ---
app.get('/api/profile', authMiddleware, (req, res) => {
    const userId = req.user.id;
    let userProfile = {};

    const userSql = 'SELECT id, username, points FROM users WHERE id = ?';
    db.get(userSql, [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ message: 'User not found.' });
        userProfile.user = user;

        const historySql = 'SELECT id, result, drew_at FROM lottery_records WHERE user_id = ? ORDER BY drew_at DESC';
        db.all(historySql, [userId], (err, records) => {
            if (err) return res.status(500).json({ message: 'Failed to fetch lottery history.' });
            userProfile.lotteryHistory = records;
            res.json(userProfile);
        });
    });
});

app.post('/api/posts', authMiddleware, (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;
    if (!content) return res.status(400).json({ message: 'Post content cannot be empty.' });
    const sql = 'INSERT INTO posts (content, user_id) VALUES (?, ?)';
    db.run(sql, [content, userId], function (err) {
        if (err) return res.status(500).json({ message: 'Failed to create post.' });
        const getNewPostSql = `SELECT p.id, p.content, p.created_at, u.username, p.user_id, 0 as average_score, 0 as rating_count FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`;
        db.get(getNewPostSql, [this.lastID], (err, row) => {
            if (err) return res.status(500).json({ message: 'Post created, but failed to fetch it.' });
            res.status(201).json(row);
        });
    });
});

app.delete('/api/posts/:id', authMiddleware, (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const sql = 'DELETE FROM posts WHERE id = ? AND user_id = ?';
    db.run(sql, [postId, userId], function (err) {
        if (err) return res.status(500).json({ message: 'Failed to delete post.' });
        if (this.changes === 0) return res.status(403).json({ message: 'Post not found or you do not have permission to delete it.' });
        res.status(200).json({ message: 'Post deleted successfully.' });
    });
});

// --- 修改 #3: 评分 API 增加作者积分 ---
app.post('/api/posts/:id/rate', authMiddleware, (req, res) => {
    const postId = req.params.id;
    const score = parseInt(req.body.score, 10);
    const raterUserId = req.user.id;

    if (isNaN(score) || score < 1 || score > 5) return res.status(400).json({ message: 'Score must be a number between 1 and 5.' });

    const checkOwnerSql = 'SELECT user_id FROM posts WHERE id = ?';
    db.get(checkOwnerSql, [postId], (err, post) => {
        if (err) return res.status(500).json({ message: 'Server error checking post owner.' });
        if (!post) return res.status(404).json({ message: 'Post not found.' });
        if (post.user_id === raterUserId) return res.status(403).json({ message: 'You cannot rate your own post.' });

        db.serialize(() => {
            db.run('BEGIN TRANSACTION;');
            const upsertSql = `INSERT INTO ratings (post_id, user_id, score) VALUES (?, ?, ?) ON CONFLICT(post_id, user_id) DO UPDATE SET score = excluded.score`;
            db.run(upsertSql, [postId, raterUserId, score], function (err) {
                if (err) {
                    db.run('ROLLBACK;');
                    return res.status(500).json({ message: 'Failed to submit rating.' });
                }
                const addPointsSql = 'UPDATE users SET points = points + ? WHERE id = ?';
                db.run(addPointsSql, [score, post.user_id], function (err) {
                    if (err) {
                        db.run('ROLLBACK;');
                        return res.status(500).json({ message: 'Failed to update user points.' });
                    }
                    db.run('COMMIT;');
                    res.status(200).json({ message: 'Rating submitted and points awarded successfully.' });
                });
            });
        });
    });
});

// --- 修改 #4: 抽奖 API 消耗积分 ---
app.post('/api/lottery/draw', authMiddleware, (req, res) => {
    const { result } = req.body;
    const userId = req.user.id;
    const cost = 1;

    if (!result) return res.status(400).json({ message: 'Result content cannot be empty.' });

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');
        const deductPointsSql = 'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?';
        db.run(deductPointsSql, [cost, userId, cost], function (err) {
            if (err) {
                db.run('ROLLBACK;');
                return res.status(500).json({ message: 'Server error during point deduction.' });
            }
            if (this.changes === 0) {
                db.run('ROLLBACK;');
                return res.status(400).json({ message: 'Insufficient points.' });
            }
            const recordDrawSql = 'INSERT INTO lottery_records (result, user_id) VALUES (?, ?)';
            db.run(recordDrawSql, [result, userId], function (err) {
                if (err) {
                    db.run('ROLLBACK;');
                    return res.status(500).json({ message: 'Failed to save lottery record.' });
                }
                db.run('COMMIT;');
                res.status(201).json({ id: this.lastID, result, message: 'Draw successful.' });
            });
        });
    });
});

app.get('/api/lottery/history', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const sql = 'SELECT id, result, drew_at FROM lottery_records WHERE user_id = ? ORDER BY drew_at DESC';
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch lottery history.' });
        res.json(rows);
    });
});

app.delete('/api/lottery/history', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const sql = 'DELETE FROM lottery_records WHERE user_id = ?';
    db.run(sql, [userId], function (err) {
        if (err) return res.status(500).json({ message: 'Failed to clear lottery history.' });
        res.json({ message: `Successfully cleared ${this.changes} records.` });
    });
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});