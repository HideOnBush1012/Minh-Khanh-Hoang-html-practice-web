let currentUser = null;

const authSection = document.getElementById("authSection");

/**
 * Gán văn bản an toàn để tránh XSS
 */
function safeText(el, text) {
    if (el) el.textContent = text;
}

/**
 * Fetch API với xử lý lỗi tập trung
 */
async function safeFetch(url, options = {}) {
    const res = await fetch(url, {
        credentials: "include",
        ...options
    });
    if (!res.ok) throw new Error("Server error");
    return await res.json();
}

/* ================= AUTHENTICATION ================= */

async function checkLogin() {
    try {
        const user = await safeFetch("/api/me");
        currentUser = user;
        renderUserUI();
    } catch {
        renderGuestUI();
    }
}

function renderGuestUI() {
    if (!authSection) return;
    authSection.innerHTML = `
        <button onclick="location.href='index.html'" class="btn-nav">Home / Login</button>
    `;
}

function renderUserUI() {
    if (!authSection) return;
    authSection.innerHTML = `
        <span class="rank-colored" style="color:${currentUser.rankColor}; font-weight:bold; cursor:pointer" onclick="location.href='profile.html'">
            ${currentUser.username}
        </span> 
        <span style="color:#fff">(${currentUser.rating})</span>
        <button onclick="location.href='leaderboard.html'" class="btn-nav">Leaderboard</button>
        <button onclick="logout()" class="btn-logout">Logout</button>
    `;
}

async function logout() {
    if(!confirm("Bạn có chắc muốn đăng xuất?")) return;
    try {
        await safeFetch("/api/logout", { method: "POST" });
        location.href = "index.html";
    } catch (err) {
        alert("Lỗi khi đăng xuất");
    }
}

/* ================= LOAD SUBMISSION DETAIL ================= */

async function loadSubmission() {
    const params = new URLSearchParams(window.location.search);
    const submissionId = params.get("id");

    if (!submissionId) {
        alert("ID lần nộp bài không hợp lệ!");
        return;
    }

    try {
        // API này hiện đã trả về: username, problemTitle, score, ratingGain, isBest, code, problemId
        const data = await safeFetch(`/api/submission/${submissionId}`);

        // 1. Thông tin cơ bản
        safeText(document.getElementById("username"), data.username);
        safeText(document.getElementById("problemTitle"), data.problemTitle || `Bài ${data.problemId}`);
        
        const scoreEl = document.getElementById("score");
        if (data.score === 100) {
            scoreEl.innerHTML = `<span style="color:#16a34a; font-weight:bold">100 (Accepted)</span>`;
        } else {
            scoreEl.textContent = data.score;
        }

        safeText(
            document.getElementById("createdAt"),
            new Date(data.createdAt).toLocaleString('vi-VN')
        );

        // 2. Hiển thị thay đổi Rating (Rating Gain)
        const ratingChangeEl = document.getElementById("ratingChange");
        if (data.ratingGain > 0) {
            ratingChangeEl.innerHTML = `<span style="color:#16a34a; font-weight:bold">+${data.ratingGain}</span>`;
        } else {
            ratingChangeEl.innerHTML = `<span style="color:#94a3b8;">0 (Không đổi)</span>`;
        }

        // 3. Huy hiệu "Best Submission" (Điểm cao nhất của User cho bài này)
        const bestEl = document.getElementById("bestBadge");
        if (bestEl) {
            bestEl.innerHTML = data.isBest 
                ? `<span style="color:#eab308; font-weight:bold">★ Kỷ lục cá nhân</span>` 
                : `<span style="color:#94a3b8; font-size:0.9em">(Có lần nộp khác điểm cao hơn)</span>`;
        }

        // 4. Hiển thị Code (Sử dụng textContent để an toàn)
        const codeBlock = document.getElementById("codeBlock");
        if (codeBlock) {
            codeBlock.textContent = data.code || "// Không có nội dung mã nguồn";
        }

        // 5. Nút quay lại bài tập
        if (data.problemId) {
            const container = document.querySelector(".container");
            const backBtn = document.createElement("button");
            backBtn.className = "btn-secondary";
            backBtn.style.marginBottom = "15px";
            backBtn.innerHTML = "← Quay lại bài tập";
            backBtn.onclick = () => {
                location.href = `task.html?id=${data.problemId}`;
            };
            container.prepend(backBtn);
        }

    } catch (err) {
        console.error(err);
        alert("Không thể tải thông tin chi tiết lần nộp bài.");
    }
}

/* ================= KHỞI TẠO ================= */

document.addEventListener("DOMContentLoaded", () => {
    checkLogin();
    loadSubmission();
});