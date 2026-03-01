const express = require("express");
const multer  = require("multer");
const fs      = require("fs-extra");
const path    = require("path");
const db      = require("../db");

const { compareHtml }      = require("../judge/htmlComparator");
const { updateUserRating } = require("../services/ratingEngine");

const router = express.Router();

/* ================================================================
   MULTER CONFIG
================================================================ */
const upload = multer({
    dest: "sandbox/",
    limits: { fileSize: 300 * 1024 }, // 300KB
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== ".html") {
            return cb(new Error("Chỉ cho phép nộp file .html"));
        }
        cb(null, true);
    },
});

/* ================================================================
   AUTH MIDDLEWARE
================================================================ */
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }
    next();
}

/* ================================================================
   POST /api/upload
   Body (multipart/form-data):
     - codeFile  : file .html
     - problemId : number

   Response:
     { success, submissionId, score, ratingUpdate }
================================================================ */
router.post(
    "/api/upload",
    requireLogin,
    upload.single("codeFile"),
    async (req, res) => {
        const tempFiles = [];

        try {
            const userId    = req.session.userId;
            const problemId = Number(req.body.problemId);

            if (!problemId || !req.file) {
                return res.status(400).json({
                    error: "Thiếu thông tin bài tập hoặc file",
                });
            }

            const userHtmlPath = req.file.path;
            tempFiles.push(userHtmlPath);

            // 1. Đọc file HTML học sinh
            const userHtml = await fs.readFile(userHtmlPath, "utf-8");

            // 2. Đọc HTML mẫu (ẩn với học sinh)
            const answerPath = path.join(
                __dirname,
                "../judge/html",
                `bai${problemId}.html`
            );

            if (!(await fs.pathExists(answerPath))) {
                return res.status(404).json({
                    error: "Không tìm thấy HTML mẫu cho bài tập này",
                });
            }

            const expectedHtml = await fs.readFile(answerPath, "utf-8");

            // 3. Chấm điểm — compareHtml(userHtml, expectedHtml)
            const judgeResult = await compareHtml(userHtml, expectedHtml);
            const finalScore  = judgeResult.score;

            // Đảm bảo score là số hợp lệ
            if (typeof finalScore !== "number" || isNaN(finalScore)) {
                throw new Error("Kết quả chấm điểm không hợp lệ");
            }

            // 4. Cập nhật rating
            const ratingResult = await updateUserRating(userId, problemId, finalScore);
            const gain         = ratingResult.updated ? ratingResult.gain : 0;

            // 5. Lưu DB (giữ nguyên schema cũ, không thêm cột)
            const submissionId = await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO submissions
                     (userId, problemId, score, ratingGain, code, createdAt)
                     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                    [userId, problemId, finalScore, gain, userHtml],
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });

            // 6. Trả về — chỉ score, không có feedback
            return res.json({
                success:      true,
                submissionId,
                score:        finalScore,
                ratingUpdate: ratingResult,
            });

        } catch (err) {
            console.error("Judge Error:", err);
            return res.status(500).json({
                error: "Lỗi trong quá trình chấm bài: " + err.message,
            });
        } finally {
            for (const filePath of tempFiles) {
                fs.remove(filePath).catch(e =>
                    console.error("Cleanup error:", e)
                );
            }
        }
    }
);

/* ================================================================
   GET /api/submission/:id

   Response:
     { id, username, problemId, problemTitle, score,
       ratingGain, isBest, createdAt, code }
================================================================ */
router.get("/api/submission/:id", async (req, res) => {
    try {
        const submissionId = req.params.id;

        const submission = await new Promise((resolve, reject) => {
            db.get(
                `SELECT s.*, u.username, p.title AS problemTitle
                 FROM submissions s
                 JOIN  users    u ON s.userId    = u.id
                 LEFT JOIN problems p ON s.problemId = p.id
                 WHERE s.id = ?`,
                [submissionId],
                (err, row) => (err ? reject(err) : resolve(row))
            );
        });

        if (!submission) {
            return res.status(404).json({ error: "Không tìm thấy submission" });
        }

        const bestRow = await new Promise((resolve, reject) => {
            db.get(
                `SELECT MAX(score) AS maxScore
                 FROM submissions
                 WHERE userId = ? AND problemId = ?`,
                [submission.userId, submission.problemId],
                (err, row) => (err ? reject(err) : resolve(row))
            );
        });

        return res.json({
            id:           submission.id,
            username:     submission.username,
            problemId:    submission.problemId,
            problemTitle: submission.problemTitle || `Bài ${submission.problemId}`,
            score:        submission.score,
            ratingGain:   submission.ratingGain || 0,
            isBest:       submission.score === bestRow?.maxScore,
            createdAt:    submission.createdAt,
            code:         submission.code,
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
