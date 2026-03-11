require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const fs = require("fs-extra");

const db = require("./db"); 

fs.ensureDirSync("sandbox");
fs.ensureDirSync("screenshots");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax"
  }
}));

app.use(express.static("public"));
app.use("/targets", express.static("targets"));

/* ====== ROUTES CŨ ====== */
app.use("/", require("./routes/auth"));
app.use("/", require("./routes/tasks"));
app.use("/", require("./routes/submissions"));
app.use("/", require("./routes/leaderboard"));
app.use("/", require("./routes/profile"));

/* ====== QUIZ API (ĐÃ SỬA VÀ BỔ SUNG) ====== */

// 1. Lấy danh sách Quiz (có kèm trạng thái đã làm hay chưa)
app.get("/api/quizzes", (req, res) => {
  const userId = req.session.userId || 0;
  const query = `
    SELECT 
      q.id, 
      q.title,
      (SELECT COUNT(*) FROM quiz_questions WHERE quizId = q.id) as questionCount,
      s.id as submissionId,
      s.score,
      s.ratingGain
    FROM quiz_list q
    LEFT JOIN quiz_submissions s ON q.id = s.quizId AND s.userId = ?
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Lỗi cơ sở dữ liệu" });
    res.json(rows);
  });
});

// --- DÒNG CODE BỔ SUNG QUAN TRỌNG NHẤT ---
// 2. Lấy chi tiết CÂU HỎI của 1 bài Quiz để làm bài
app.get("/api/quizzes/:id", (req, res) => {
  const quizId = Number(req.params.id);

  // Lấy thông tin bộ quiz
  db.get("SELECT * FROM quiz_list WHERE id = ?", [quizId], (err, quiz) => {
    if (err || !quiz) return res.status(404).json({ error: "Không tìm thấy Quiz" });

    // Lấy danh sách câu hỏi và format lại cho Frontend
    db.all("SELECT id, question, answerA, answerB, answerC, answerD FROM quiz_questions WHERE quizId = ?", [quizId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        id: quiz.id,
        title: quiz.title,
        questions: rows.map(r => ({
          id: r.id,
          text: r.question, // Map 'question' trong DB -> 'text' trong JS
          choices: [r.answerA, r.answerB, r.answerC, r.answerD] // Gom 4 cột thành mảng 'choices'
        }))
      });
    });
  });
});
// ----------------------------------------

// 3. Chấm điểm và Lưu kết quả
app.post("/api/quizzes/:id/submit", (req, res) => {
  const quizId = Number(req.params.id);
  const userId = req.session.userId;
  const userAnswers = req.body?.answers;

  if (!userId) return res.status(401).json({ error: "Bạn cần đăng nhập" });

  db.get("SELECT id FROM quiz_submissions WHERE userId = ? AND quizId = ?", [userId, quizId], (err, existing) => {
    if (existing) return res.status(400).json({ error: "Bạn đã hoàn thành quiz này rồi" });

    db.get("SELECT difficulty FROM quiz_list WHERE id = ?", [quizId], (err, quizInfo) => {
      db.all("SELECT id, correctAnswer FROM quiz_questions WHERE quizId = ?", [quizId], (err, questions) => {
        
        let correctCount = 0;
        const total = questions.length;
        const indexToChar = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };

        questions.forEach(q => {
          const ans = userAnswers.find(ua => ua.questionId === q.id);
          if (ans && indexToChar[ans.choiceIndex] === q.correctAnswer) correctCount++;
        });

        const score = Math.round((correctCount / total) * 100);
        const ratingGain = Math.round((quizInfo.difficulty / 50) * (correctCount / total));

        db.run(
          "INSERT INTO quiz_submissions (userId, quizId, score, ratingGain) VALUES (?, ?, ?, ?)",
          [userId, quizId, score, ratingGain],
          function(err) {
            db.run("UPDATE users SET rating = rating + ? WHERE id = ?", [ratingGain, userId]);
            res.json({ success: true, score, ratingGain });
          }
        );
      });
    });
  });
});

// 4. Lấy dữ liệu kết quả để hiển thị trang Result (Có kèm đáp án đúng)
app.get("/api/quizzes/:id/result", (req, res) => {
  const quizId = Number(req.params.id);
  const userId = req.session.userId;

  db.get("SELECT score, ratingGain FROM quiz_submissions WHERE userId = ? AND quizId = ?", [userId, quizId], (err, sub) => {
    if (!sub) return res.status(404).json({ error: "Không tìm thấy kết quả" });

    db.all("SELECT id, question, answerA, answerB, answerC, answerD, correctAnswer FROM quiz_questions WHERE quizId = ?", [quizId], (err, questions) => {
      res.json({
        score: sub.score,
        ratingGain: sub.ratingGain,
        questions: questions
      });
    });
  });
});

/* ====== PROFILE ====== */
app.get("/api/profile", (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });

    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User không tồn tại" });

        const countPracticeSql = "SELECT COUNT(DISTINCT problemId) as tasksDone FROM submissions WHERE userId = ?";
        const countQuizSql = "SELECT COUNT(DISTINCT quizId) as quizzesDone FROM quiz_submissions WHERE userId = ?";

        const practiceHistorySql = `
            SELECT s.id, s.problemId, s.score, s.ratingGain, s.createdAt, p.title as problemTitle 
            FROM submissions s JOIN problems p ON s.problemId = p.id 
            WHERE s.userId = ?`;

        const quizHistorySql = `
            SELECT qs.id, qs.quizId, qs.score, qs.ratingGain, qs.createdAt, ql.title as quizTitle 
            FROM quiz_submissions qs JOIN quiz_list ql ON qs.quizId = ql.id 
            WHERE qs.userId = ?`;

        db.get(countPracticeSql, [userId], (err, pCount) => {
            db.get(countQuizSql, [userId], (err, qCount) => {
                db.all(practiceHistorySql, [userId], (err, pHistory) => {
                    db.all(quizHistorySql, [userId], (err, qHistory) => {
                        
                        const combinedSubmissions = [
                            ...pHistory.map(h => ({ ...h, type: 'practice' })),
                            ...qHistory.map(h => ({ ...h, type: 'quiz' }))
                        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                        res.json({
                            username: user.username,
                            rating: user.rating,
                            maxRating: user.maxRating,
                            rankTitle: user.rankTitle,
                            rankColor: user.rankColor,
                            tasksDone: pCount.tasksDone || 0,
                            quizzesDone: qCount.quizzesDone || 0,
                            submissions: combinedSubmissions
                        });
                    });
                });
            });
        });
    });
});

/* ====== LISTEN CUỐI CÙNG ====== */
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
