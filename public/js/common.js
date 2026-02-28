// public/js/common.js

/**
 * Kiểm tra trạng thái đăng nhập khi load trang
 */
async function checkLogin() {
  try {
    const res = await fetch("/api/me", { credentials: "include" });

    if (res.ok) {
      const user = await res.json();
      renderUserUI(user);
    } else {
      renderGuestUI();
    }
  } catch (err) {
    console.error("Auth check failed", err);
    renderGuestUI();
  }
}

/**
 * Hiển thị giao diện khi đã đăng nhập
 */
function renderUserUI(user) {
  const authSection = document.getElementById("authSection");
  if (!authSection) return;

  authSection.innerHTML = `
    <div class="user-nav">
      <button onclick="location.href='quiz.html'" class="btn-nav">Quiz</button>
      <button onclick="location.href='leaderboard.html'" class="btn-nav">Bảng xếp hạng</button>

      <span class="rank-colored"
            style="color: ${user.rankColor}; font-weight: bold; cursor: pointer"
            onclick="location.href='profile.html'">
        ${user.username}
        <span style="color: #fff; font-weight: normal">(${user.rating})</span>
      </span>

      <button onclick="handleLogout()" class="btn-logout">Đăng xuất</button>
    </div>
  `;
}

/**
 * Hiển thị giao diện khi chưa đăng nhập
 */
function renderGuestUI() {
  const authSection = document.getElementById("authSection");
  if (!authSection) return;

  authSection.innerHTML = `
    <div class="user-nav">
      <button onclick="location.href='quiz.html'" class="btn-nav">Quiz</button>
      <button onclick="location.href='auth.html'" class="btn-nav">Đăng nhập / Đăng ký</button>
    </div>
  `;
}

/**
 * Xử lý Đăng xuất
 */
async function handleLogout() {
  if (!confirm("Bạn có chắc chắn muốn đăng xuất?")) return;

  try {
    const res = await fetch("/api/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (res.ok) {
      window.location.href = "index.html";
    } else {
      alert("Lỗi khi đăng xuất!");
    }
  } catch (err) {
    alert("Không thể kết nối máy chủ!");
  }
}

// Tự động chạy khi tài liệu sẵn sàng
document.addEventListener("DOMContentLoaded", checkLogin);