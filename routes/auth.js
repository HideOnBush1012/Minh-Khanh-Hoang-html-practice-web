const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

// API Đăng ký
router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password || username.length < 3 || password.length < 4) {
        return res.status(400).json({ success: false, error: "Thông tin không hợp lệ" });
    }

    try {
        const hash = await bcrypt.hash(password, 12); // Tăng độ an toàn lên 12 rounds
        db.run(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            [username, hash],
            function(err) {
                if (err) {
                    if (err.message.includes("UNIQUE")) {
                        return res.json({ success: false, error: "Tên đăng nhập đã tồn tại" });
                    }
                    return res.json({ success: false, error: "Lỗi database" });
                }
                res.json({ success: true });
            }
        );
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API Đăng nhập
router.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        async (err, user) => {
            if (err || !user) return res.json({ success: false, error: "Sai tài khoản" });

            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.json({ success: false, error: "Sai mật khẩu" });

            req.session.userId = user.id;
            res.json({ success: true });
        }
    );
});

// API Lấy thông tin user hiện tại (Sửa lỗi mapping cho frontend)
router.get("/api/me", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Chưa đăng nhập" });

    db.get(
        "SELECT id, username, rating, maxRating, rankTitle, rankColor FROM users WHERE id = ?",
        [req.session.userId],
        (err, user) => {
            if (err || !user) return res.status(404).json({ error: "User không tồn tại" });
            
            // Tính toán thêm số bài đã làm để đồng bộ với UI index.html
            db.get("SELECT COUNT(DISTINCT problemId) as done, COUNT(*) as subs FROM submissions WHERE userId = ?", 
            [user.id], (err2, stats) => {
                res.json({
                    ...user,
                    tasksDone: stats?.done || 0,
                    submissionCount: stats?.subs || 0
                });
            });
        }
    );
});

// API Đăng xuất (Hỗ trợ cả POST và GET để tránh lỗi frontend)
const logoutHandler = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false });
        res.clearCookie("connect.sid");
        res.json({ success: true });
    });
};

router.post("/api/logout", logoutHandler);
router.post("/logout", logoutHandler);
router.get("/api/logout", logoutHandler); // Hỗ trợ thẻ <a> nếu cần

module.exports = router;