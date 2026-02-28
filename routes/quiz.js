const express = require("express");
const router = express.Router();
const db = require("../db");
const { addRatingGeneric } = require("../services/ratingEngine");

/**
 * Middleware: Kiểm tra đăng nhập
 */
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Vui lòng đăng nhập!" });
    }
    next();
}

/**
 * 1. Lấy danh sách tất cả các bộ Quiz
 * Trả về thông tin quiz và trạng thái đã làm (isDone) của user hiện tại
 */
router.get("/api/quizzes", requireLogin, (req, res) => {
    const userId = req.session.userId;

    const sql = `
        SELECT q.*, 
        (SELECT COUNT(*) FROM quiz_submissions WHERE userId = ? AND quizId = q.id) as isDone
        FROM quiz_list q
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: "Lỗi cơ sở dữ liệu" });
        
        // Chuyển đổi COUNT sang boolean true/false
        const result = rows.map(r => ({
            ...r,
            isDone: r.isDone > 0
        }));
        res.json(result);
    });
});

/**
 * 2. Lấy chi tiết câu hỏi của một bộ Quiz
 * BẢO MẬT: Không lấy cột 'correctAnswer' để tránh học sinh soi source code
 */
router.get("/api/quiz/:id", requireLogin, (req, res) => {
    const quizId = req.params.id;

    // 1. Kiểm tra bảng quiz_list (phải khớp với db.js)
    db.get("SELECT * FROM quiz_list WHERE id = ?", [quizId], (err, quiz) => {
        if (err) {
            console.error("LỖI SQL 1 (quiz_list):", err.message); // Xem lỗi ở Terminal
            return res.status(500).json({ error: "Lỗi truy vấn danh sách quiz" });
        }

        if (!quiz) {
            return res.status(404).json({ error: "Không tìm thấy bộ đề trong database!" });
        }

        // 2. Kiểm tra bảng quiz_questions (phải khớp với db.js)
        const sqlQuestions = `
            SELECT id, question, answerA, answerB, answerC, answerD 
            FROM quiz_questions 
            WHERE quizId = ?
        `;

        db.all(sqlQuestions, [quizId], (err, questions) => {
            if (err) {
                console.error("LỖI SQL 2 (quiz_questions):", err.message); // Xem lỗi ở Terminal
                return res.status(500).json({ error: "Lỗi truy vấn câu hỏi" });
            }

            // Trả về dữ liệu thành công
            res.json({
                title: quiz.title,
                difficulty: quiz.difficulty,
                questions: questions
            });
        });
    });
});

/**
 * 3. Nộp bài Quiz và chấm điểm
 */
router.post("/api/quiz/submit", requireLogin, async (req, res) => {
    const { quizId, userAnswers } = req.body;
    const userId = req.session.userId;

    db.get("SELECT id FROM quiz_submissions WHERE userId = ? AND quizId = ?", [userId, quizId], (err, done) => {
        if (done) return res.status(400).json({ error: "Bạn đã hoàn thành bài tập này rồi!" });

        db.all("SELECT id, correctAnswer FROM quiz_questions WHERE quizId = ?", [quizId], async (err, questions) => {
            if (err || !questions.length) return res.status(500).json({ error: "Lỗi dữ liệu câu hỏi" });

            let score = 0;
            const total = questions.length; // Tổng số câu hỏi
            const details = [];

            questions.forEach(q => {
                const userAns = userAnswers[q.id];
                const isCorrect = (userAns === q.correctAnswer);
                if (isCorrect) score++;

                details.push({
                    id: q.id,
                    correct: isCorrect,
                    correctAnswer: q.correctAnswer
                });
            });

            const gain = score * 10;

            // CHỈNH SỬA Ở ĐÂY: Bỏ cột total ra khỏi INSERT
            const sql = `INSERT INTO quiz_submissions (userId, quizId, score, ratingGain) VALUES (?, ?, ?, ?)`;
            
            db.run(sql, [userId, quizId, score, gain], async function(err) {
                if (err) {
                    console.error("SQL Error:", err.message);
                    return res.status(500).json({ error: "Lỗi database" });
                }

                // Cập nhật Elo (giả sử bạn dùng hàm này trong ratingEngine)
                const { addRatingGeneric } = require("../services/ratingEngine");
                const ratingResult = await addRatingGeneric(userId, gain);

                res.json({
                    success: true,
                    score: score,
                    total: total, // Gửi total về cho frontend hiển thị, dù không lưu trong DB
                    gain: gain,
                    details: details,
                    newRating: ratingResult.newRating,
                    rank: ratingResult.rank
                });
            });
        });
    });
});

// API lấy dữ liệu để xem lại kết quả
router.get("/api/quiz/review/:id", requireLogin, (req, res) => {
    const quizId = req.params.id;
    const userId = req.session.userId;

    // Sửa lại SQL để JOIN lấy title và difficulty của quiz
    const sqlQuizInfo = `
        SELECT qs.score, q.title, q.difficulty 
        FROM quiz_submissions qs
        JOIN quiz_list q ON qs.quizId = q.id
        WHERE qs.userId = ? AND qs.quizId = ?
    `;

    db.get(sqlQuizInfo, [userId, quizId], (err, quizInfo) => {
        if (err || !quizInfo) {
            return res.status(403).json({ error: "Bạn chưa hoàn thành bài tập này!" });
        }

        db.all("SELECT id, question, answerA, answerB, answerC, answerD, correctAnswer FROM quiz_questions WHERE quizId = ?", [quizId], (err, questions) => {
            if (err) return res.status(500).json({ error: "Lỗi database" });

            // TRẢ VỀ ĐẦY ĐỦ THÔNG TIN
            res.json({
                title: quizInfo.title,
                difficulty: quizInfo.difficulty,
                score: quizInfo.score,
                questions: questions
            });
        });
    });
});

module.exports = router;