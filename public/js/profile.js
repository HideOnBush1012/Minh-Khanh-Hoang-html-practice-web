// public/js/profile.js

async function loadProfile() {
  try {
    // 1. Gọi API lấy thông tin hồ sơ
    const res = await fetch("/api/profile", { credentials: "include" });
    
    if (!res.ok) {
      // Nếu chưa đăng nhập, đẩy về trang chủ
      window.location.href = "index.html";
      return;
    }

    const data = await res.json();

    // 2. Cập nhật thông tin Header (Tên, Rank, Badge)
    const usernameEl = document.getElementById("username");
    const profileSub = document.getElementById("profileSub");
    const rankBadge = document.getElementById("rankBadge");

    usernameEl.innerText = data.username;
    usernameEl.style.color = data.rankColor;

    // Hiển thị tổng quan số lượng bài đã làm
    profileSub.innerText = `Thực hành: ${data.tasksDone} bài • Quiz: ${data.quizzesDone || 0} bài`;
    
    rankBadge.innerText = data.rankTitle;
    rankBadge.style.backgroundColor = data.rankColor; // Đổi màu nền badge cho nổi bật
    rankBadge.style.color = "#fff";

    // 3. Cập nhật các chỉ số Stats (Rating)
    document.getElementById("rating").innerText = data.rating;
    document.getElementById("maxRating").innerText = data.maxRating;

    const rankTitleEl = document.getElementById("rankTitle");
    rankTitleEl.innerText = data.rankTitle;
    rankTitleEl.style.color = data.rankColor;
    rankTitleEl.style.fontWeight = "bold";

    // 4. Cập nhật bảng Lịch sử (Merge cả Practice và Quiz)
    const tbody = document.querySelector("#submissionTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Gom tất cả các loại submission vào một mảng duy nhất để hiển thị
    // (Backend của bạn nên trả về một danh sách đã gộp hoặc JS sẽ xử lý ở đây)
    const allHistory = data.submissions || [];

    if (allHistory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted);">Bạn chưa có hoạt động nào gần đây.</td></tr>`;
      return;
    }

    allHistory.forEach((item) => {
      // Phân biệt giữa Bài thực hành và Quiz
      const isQuiz = item.quizId !== undefined;
      
      // -- Cột Tên Bài tập & Link --
      let titleLink = "";
      if (isQuiz) {
        titleLink = `<span class="badge" style="border-color:#8b5cf6; color:#8b5cf6; margin-right:8px;">Quiz</span>
                     <a href="quiz_result.html?quizId=${item.quizId}" style="color:#e5e7eb; text-decoration:none;">${item.quizTitle || 'Bài Quiz'}</a>`;
      } else {
        titleLink = `<span class="badge" style="border-color:#3b82f6; color:#3b82f6; margin-right:8px;">Code</span>
                     <a href="task.html?id=${item.problemId}" style="color:#93c5fd; font-weight:700; text-decoration:none;">${item.problemTitle || "Bài " + item.problemId}</a>`;
      }

      // -- Cột Điểm & Link chi tiết (Chỉ Practice mới có trang chi tiết code) --
      const scoreColor = item.score === 100 ? "#16a34a" : "#93c5fd";
      let scoreDisplay = "";
      if (isQuiz) {
          scoreDisplay = `<span style="font-weight:800; color:${scoreColor}">${item.score}</span>`;
      } else {
          scoreDisplay = `<a href="submission.html?id=${item.id}" style="font-weight:800; color:${scoreColor}; text-decoration:none;" title="Xem code đã nộp">
                            ${item.score}
                          </a>`;
      }

      // -- Cột Elo Gain --
      const gainDisplay = item.ratingGain > 0
          ? `<span style="color: #16a34a; font-weight: 800;">+${item.ratingGain}</span>`
          : `<span style="color: #94a3b8;">0</span>`;

      // -- Cột Thời gian --
      const timeDisplay = new Date(item.createdAt).toLocaleString("vi-VN", {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
      });

      // Tạo dòng và chèn vào bảng
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="color:var(--muted); font-size:12px;">${item.id}</td>
        <td>${titleLink}</td>
        <td>${scoreDisplay}</td>
        <td>${gainDisplay}</td>
        <td>${timeDisplay}</td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error("Failed to load profile:", err);
    alert("Không thể tải thông tin cá nhân. Vui lòng thử lại sau!");
  }
}

// Gọi hàm khi tài liệu đã sẵn sàng
document.addEventListener("DOMContentLoaded", loadProfile);