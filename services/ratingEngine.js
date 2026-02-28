// services/ratingEngine.js
const db = require("../db");
const { getRankInfo } = require("./rankUtils");

/**
 * Công thức tính điểm Elo Gain:
 * gain = (Difficulty / 20) * (Score / 100) - log2(Attempts) * 2
 */
function calculateEloGain(difficulty, score, attempts) {
    // Độ khó cơ bản (Ví dụ: bài 800 -> base 40)
    const base = difficulty / 20;
    
    // Tỷ lệ hoàn thành (Ví dụ: 100 điểm -> factor 1, 50 điểm -> factor 0.5)
    const scoreFactor = score / 100;
    
    // Phạt dựa trên số lần nộp (càng nộp nhiều penalty càng cao)
    // log2(1)=0, log2(2)=1, log2(4)=2...
    const penalty = Math.log2(Math.max(1, attempts)) * 2;

    const gain = (base * scoreFactor) - penalty;
    
    // Luôn trả về số nguyên dương hoặc 0
    return Math.max(0, Math.round(gain));
}

/**
 * Cập nhật Rating cho User sau khi chấm điểm
 */
async function updateUserRating(userId, problemId, newScore) {
    return new Promise((resolve, reject) => {
        // 1. Lấy thông tin bài tập, rating hiện tại của user, 
        // và kỷ lục cũ (bestScore) của user tại bài tập này.
        const query = `
            SELECT 
                p.difficulty, 
                u.rating, 
                u.maxRating,
                (SELECT MAX(score) FROM submissions WHERE userId = ? AND problemId = ?) as currentBest,
                (SELECT COUNT(*) FROM submissions WHERE userId = ? AND problemId = ?) as totalAttempts
            FROM problems p, users u
            WHERE p.id = ? AND u.id = ?
        `;

        db.get(query, [userId, problemId, userId, problemId, problemId, userId], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve({ updated: false, reason: "Data not found" });

            const { difficulty, rating, maxRating, currentBest, totalAttempts } = row;
            const bestSoFar = currentBest || 0;

            // NẾU ĐIỂM MỚI KHÔNG CAO HƠN ĐIỂM CŨ -> KHÔNG TẶNG RATING
            if (newScore <= bestSoFar) {
                return resolve({ updated: false, gain: 0, reason: "Not a new best score" });
            }

            // Tính toán gain (Attempts + 1 vì tính cả lần nộp hiện tại)
            const gain = calculateEloGain(difficulty, newScore, totalAttempts + 1);

            if (gain <= 0) {
                return resolve({ updated: false, gain: 0, reason: "Gain is zero" });
            }

            // Tính rating mới
            const newRating = rating + gain;
            const newMaxRating = Math.max(maxRating || rating, newRating);
            const rankInfo = getRankInfo(newRating);

            // 2. Cập nhật vào DB
            db.run(`
                UPDATE users 
                SET rating = ?, 
                    maxRating = ?, 
                    rankTitle = ?, 
                    rankColor = ?
                WHERE id = ?
            `, [
                newRating, 
                newMaxRating, 
                rankInfo.title, 
                rankInfo.color, 
                userId
            ], function(err2) {
                if (err2) return reject(err2);

                resolve({
                    updated: true,
                    gain,
                    newRating,
                    rank: rankInfo
                });
            });
        });
    });
}

module.exports = {
    updateUserRating,
};