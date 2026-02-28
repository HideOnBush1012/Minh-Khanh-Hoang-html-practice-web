const express = require("express");
const db = require("../db");

const router = express.Router();

function requireLogin(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    next();
}

/* =====================================================
   PROFILE API
===================================================== */
router.get("/api/profile", requireLogin, (req, res) => {
    const userId = req.session.userId;

    // 1. Lấy thông tin User và tính hạng (Global Rank) dựa trên rating
    const userQuery = `
        SELECT u.*, 
        (SELECT COUNT(*) + 1 FROM users WHERE rating > u.rating) as globalRank
        FROM users u 
        WHERE u.id = ?
    `;

    db.get(userQuery, [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });

        // 2. Lấy danh sách submissions kèm theo Gain Rating và tiêu đề bài tập
        const historyQuery = `
            SELECT 
                s.id,
                s.problemId,
                s.score,
                s.ratingGain,
                s.createdAt,
                p.title as problemTitle
            FROM submissions s
            LEFT JOIN problems p ON s.problemId = p.id
            WHERE s.userId = ?
            ORDER BY s.createdAt DESC
        `;

        db.all(historyQuery, [userId], (err, submissions) => {
            if (err) return res.status(500).json({ error: "DB Error" });

            // 3. Đếm số bài đã hoàn thành (ít nhất 1 lần submit)
            db.get("SELECT COUNT(DISTINCT problemId) as done FROM submissions WHERE userId = ?", [userId], (err, stats) => {
                res.json({
                    username: user.username,
                    rating: user.rating,
                    maxRating: user.maxRating,
                    rankTitle: user.rankTitle,
                    rankColor: user.rankColor,
                    globalRank: user.globalRank,
                    tasksDone: stats ? stats.done : 0,
                    submissions: submissions || []
                });
            });
        });
    });
});

module.exports = router;