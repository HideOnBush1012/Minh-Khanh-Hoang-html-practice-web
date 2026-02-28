const express = require("express");
const db = require("../db");

const router = express.Router();

/* =====================================================
   GLOBAL LEADERBOARD (Xếp hạng theo Rating)
===================================================== */
router.get("/api/leaderboard", (req, res) => {
    // Sắp xếp theo rating giảm dần, nếu rating bằng nhau thì xét maxRating
    const query = `
        SELECT 
            u.username,
            u.rating,
            u.maxRating,
            u.rankTitle,
            u.rankColor,
            (SELECT COUNT(DISTINCT problemId) FROM submissions WHERE userId = u.id) as tasksDone
        FROM users u
        ORDER BY u.rating DESC, u.maxRating DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json([]);
        }

        const ranked = rows.map((row, index) => ({
            rank: index + 1,
            username: row.username,
            rating: row.rating,
            maxRating: row.maxRating,
            rankTitle: row.rankTitle,
            rankColor: row.rankColor,
            tasksDone: row.tasksDone
        }));

        res.json(ranked);
    });
});

/* =====================================================
   TASK LEADERBOARD (Xếp hạng Top 10 của 1 bài tập)
===================================================== */
router.get("/api/task/:id/leaderboard", (req, res) => {
    const problemId = Number(req.params.id);

    const query = `
        SELECT 
            u.username,
            u.rating,
            u.rankColor,
            MAX(s.score) as bestScore
        FROM submissions s
        JOIN users u ON u.id = s.userId
        WHERE s.problemId = ?
        GROUP BY s.userId
        ORDER BY bestScore DESC, s.createdAt ASC
        LIMIT 10
    `;

    db.all(query, [problemId], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json([]);
        }

        const ranked = rows.map((row, index) => ({
            rank: index + 1,
            username: row.username,
            rankColor: row.rankColor,
            score: row.bestScore
        }));

        res.json(ranked);
    });
});

module.exports = router;