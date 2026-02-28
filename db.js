const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// KIỂM TRA: Nếu chạy trên Render (có thư mục /data) thì dùng /data, nếu chạy máy cá nhân thì dùng thư mục gốc
const dbPath = process.env.RENDER ? "/data/database.db" : path.resolve(__dirname, "database.db");

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Đang khởi tạo cơ sở dữ liệu ---");

    // 1. Bảng Users (Người dùng)
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rating INTEGER DEFAULT 800,
            maxRating INTEGER DEFAULT 800,
            rankTitle TEXT DEFAULT 'Newbie',
            rankColor TEXT DEFAULT 'gray',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Bảng Problems (Bài tập thực hành)
    db.run(`
        CREATE TABLE IF NOT EXISTS problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            difficulty INTEGER DEFAULT 800,
            imageTarget TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 3. Bảng Submissions (Lịch sử nộp bài thực hành)
    db.run(`
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            problemId INTEGER NOT NULL,
            score INTEGER NOT NULL,
            ratingGain INTEGER DEFAULT 0,
            code TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id),
            FOREIGN KEY(problemId) REFERENCES problems(id)
        )
    `);

    // 4. Bảng Quiz List (Danh sách các bộ Quiz)
    db.run(`
        CREATE TABLE IF NOT EXISTS quiz_list (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT,
            difficulty INTEGER DEFAULT 1200,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 5. Bảng Quiz Questions (Câu hỏi chi tiết)
    db.run(`
        CREATE TABLE IF NOT EXISTS quiz_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quizId INTEGER NOT NULL,
            question TEXT NOT NULL,
            answerA TEXT NOT NULL,
            answerB TEXT NOT NULL,
            answerC TEXT NOT NULL,
            answerD TEXT NOT NULL,
            correctAnswer TEXT NOT NULL, -- Lưu 'A', 'B', 'C' hoặc 'D'
            FOREIGN KEY(quizId) REFERENCES quiz_list(id)
        )
    `);

    // 6. Bảng Quiz Submissions (Lưu điểm thi Quiz)
    db.run(`
        CREATE TABLE IF NOT EXISTS quiz_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            quizId INTEGER NOT NULL,
            score INTEGER NOT NULL,
            ratingGain INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id),
            FOREIGN KEY(quizId) REFERENCES quiz_list(id)
        )
    `);

    // --- TỰ ĐỘNG ĐỒNG BỘ BÀI TẬP THỰC HÀNH TỪ THƯ MỤC TARGETS ---
    syncProblemsWithImages();

    // --- CHÈN DỮ LIỆU MẪU CHO QUIZ (NẾU TRỐNG) ---
    seedQuizData();

    console.log("🚀 Hệ thống Database đã sẵn sàng!");
});

/**
 * Hàm tự động quét thư mục targets và thêm vào bảng problems
 */
function syncProblemsWithImages() {
    const targetsDir = path.join(__dirname, "targets");

    if (!fs.existsSync(targetsDir)) {
        console.log("⚠️ Thư mục targets không tồn tại, bỏ qua đồng bộ ảnh.");
        return;
    }

    const files = fs.readdirSync(targetsDir).filter(file => 
        /\.(png|jpg|jpeg|webp)$/i.test(file)
    );

    files.forEach(file => {
        const imagePath = `targets/${file}`;
        const title = `Luyện tập code HTML - ${file.replace(/\.[^/.]+$/, "")}`;

        db.get("SELECT id FROM problems WHERE imageTarget = ?", [imagePath], (err, row) => {
            if (!row) {
                db.run(
                    "INSERT INTO problems (title, difficulty, imageTarget) VALUES (?, ?, ?)",
                    [title, 800, imagePath],
                    function(err) {
                        if (!err) console.log(`✅ Đã tự động thêm bài tập: ${file}`);
                    }
                );
            }
        });
    });
}

/**
 * Hàm chèn dữ liệu Quiz mẫu (Dựa theo ảnh của bạn)
 */
function seedQuizData() {
    db.get("SELECT COUNT(*) as count FROM quiz_list", (err, row) => {
        if (row && row.count === 0) {
            console.log("📝 Đang tạo dữ liệu Quiz mẫu...");
            
            // 1. Thêm bộ Quiz
            db.run("INSERT INTO quiz_list (id, title, category, difficulty) VALUES (1, 'Trắc nghiệm HTML Cơ bản', 'HTML', 1200)");

            // 2. Thêm câu hỏi mẫu cho Quiz 1
            const stmt = db.prepare(`
                INSERT INTO quiz_questions (quizId, question, answerA, answerB, answerC, answerD, correctAnswer) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(1, "Thẻ nào dùng để tạo một đoạn văn?", "<p>", "<div>", "<span>", "<section>", "A");
            stmt.run(1, "Thẻ nào dùng để tạo liên kết (hyperlink)?", "<link>", "<a>", "<href>", "<url>", "B");
            stmt.run(1, "Thuộc tính nào chỉ định địa chỉ liên kết?", "href", "src", "link", "id", "A");
            stmt.run(1, "Thẻ nào dùng để tạo danh sách không thứ tự?", "<ul>", "<ol>", "<li>", "<dl>", "A");
            stmt.run(1, "Thẻ nào tạo tiêu đề cấp cao nhất?", "<h6", "<h1>", "<head>", "<title>", "B");

            stmt.finalize();
            console.log("✅ Đã hoàn tất nạp dữ liệu Quiz.");
        }
    });
}

module.exports = db;
