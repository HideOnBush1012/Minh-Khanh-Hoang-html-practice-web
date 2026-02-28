// public/js/quiz_list.js

async function loadQuizzes() {
  const grid = document.getElementById("quizGrid");
  if (!grid) return;

  try {
    // Gọi API đã được nâng cấp (có LEFT JOIN với bảng submissions)
    const res = await fetch("/api/quizzes", { credentials: "include" });
    const quizzes = await res.json();

    grid.innerHTML = "";

    quizzes.forEach(q => {
      // submissionId !== null nghĩa là user này đã làm bài quiz này rồi
      const isDone = q.submissionId !== null;
      
      const card = document.createElement("div");
      card.className = "quiz-card";
      
      // Hiển thị giao diện dựa trên trạng thái bài làm
      card.innerHTML = `
        <div style="flex: 1;">
          <h4>${q.title}</h4>
          <div class="quiz-meta">
            <span class="badge">🧩 ${q.questionCount} câu</span>
            ${isDone 
              ? `<span class="badge" style="border-color: #16a34a; color: #16a34a; font-weight: bold;">
                  ✓ Đã xong: ${q.score}đ (+${q.ratingGain} Elo)
                 </span>` 
              : `<span class="badge">⏱️ ~10 phút</span>`
            }
          </div>
        </div>
        <div style="display:flex; align-items:center;">
          <button class="btn ${isDone ? "" : "btn-primary"}" style="min-width: 120px;">
            ${isDone ? "View Result" : "Start"}
          </button>
        </div>
      `;

      // Xử lý sự kiện click: Nếu đã làm thì xem kết quả, chưa làm thì bắt đầu làm
      card.querySelector("button").onclick = () => {
        if (isDone) {
          location.href = `quiz_result.html?quizId=${q.id}`;
        } else {
          location.href = `quiz_take.html?quizId=${q.id}`;
        }
      };

      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Lỗi khi tải danh sách quiz:", err);
    grid.innerHTML = `<p style="padding: 20px; color: var(--muted);">Không thể tải danh sách bài tập. Vui lòng đăng nhập lại.</p>`;
  }
}

// Chạy hàm khi trang web tải xong
document.addEventListener("DOMContentLoaded", loadQuizzes);