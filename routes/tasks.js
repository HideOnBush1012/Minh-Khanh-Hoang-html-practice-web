const express = require("express");
const db = require("../db");
const router = express.Router();

/* =====================================================
   LẤY DANH SÁCH BÀI TẬP (Kèm điểm cao nhất của User)
===================================================== */
router.get("/api/tasks", (req, res) => {
    const userId = req.session.userId || 0;

    // Truy vấn lấy danh sách bài tập và left join với submissions để xem user đã làm chưa
    const query = `
        SELECT 
            p.id, p.title, p.difficulty, p.imageTarget,
            MAX(s.score) as userBestScore
        FROM problems p
        LEFT JOIN submissions s ON s.problemId = p.id AND s.userId = ?
        GROUP BY p.id
        ORDER BY p.id ASC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

/* =====================================================
   CHI TIẾT MỘT BÀI TẬP
===================================================== */
router.get("/api/task/:id", (req, res) => {
    const problemId = Number(req.params.id);

    db.get("SELECT * FROM problems WHERE id = ?", [problemId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Task not found" });
        res.json(row);
    });
});

router.get("/api/task/:id/my-best", (req, res) => {
    const userId = req.session.userId || 0;
    const problemId = req.params.id;
    db.get("SELECT MAX(score) as bestScore FROM submissions WHERE userId = ? AND problemId = ?", [userId, problemId], (err, row) => {
        res.json(row || { bestScore: 0 });
    });
});

module.exports = router;