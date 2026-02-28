const express = require("express");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const db = require("../db");

// NÊN import qua judge/index.js (ổn định hơn)
// const { compareHtml } = require("../judge");
const { compareHtml } = require("../judge/htmlComparator"); // vẫn OK nếu bạn muốn giữ

const { updateUserRating } = require("../services/ratingEngine");

const router = express.Router();

/* ================= MULTER CONFIG ================= */
// Chỉ cho phép upload file .html
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

/* ================= AUTH MIDDLEWARE ================= */
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

/* ================= UPLOAD & JUDGE (DOM/HTML) ================= */
router.post(
  "/api/upload",
  requireLogin,
  upload.single("codeFile"),
  async (req, res) => {
    let tempFiles = [];

    try {
      const userId = req.session.userId;
      const problemId = Number(req.body.problemId);

      if (!problemId || !req.file) {
        return res.status(400).json({
          error: "Thiếu thông tin bài tập hoặc file",
        });
      }

      const userHtmlPath = req.file.path;
      tempFiles.push(userHtmlPath);

      // 1) Đọc HTML user
      const userHtml = await fs.readFile(userHtmlPath, "utf-8");

      // 2) Đọc HTML mẫu (đáp án)
      // LƯU Ý: bạn cần đặt bai1.html..baiN.html ở: /judge/html/
      const answerPath = path.join(__dirname, "../judge/html", `bai${problemId}.html`);

      const exists = await fs.pathExists(answerPath);
      if (!exists) {
        return res.status(404).json({
          error: "Không tìm thấy HTML mẫu cho bài tập này",
        });
      }

      const expectedHtml = await fs.readFile(answerPath, "utf-8");

      // 3) CHẤM DOM/HTML
      // compareHtml trả: { pass, score, feedback }
      const judgeResult = compareHtml(userHtml, expectedHtml);
      const finalScore = Number(judgeResult?.score ?? 0);

      // 4) Update rating (tuỳ engine của bạn)
      const ratingResult = await updateUserRating(userId, problemId, finalScore);
      const gain = ratingResult?.updated ? ratingResult.gain : 0;

      // 5) Lưu DB
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

      // 6) Response
      return res.json({
        success: true,
        submissionId,
        score: finalScore,
        pass: !!judgeResult?.pass,
        feedback: judgeResult?.feedback || [],
        ratingUpdate: ratingResult,
      });
    } catch (err) {
      console.error("Judge Error:", err);
      return res.status(500).json({
        error: "Lỗi trong quá trình chấm bài: " + err.message,
      });
    } finally {
      // cleanup file upload
      for (const filePath of tempFiles) {
        fs.remove(filePath).catch((e) => console.error("Cleanup error:", e));
      }
    }
  }
);

module.exports = router;