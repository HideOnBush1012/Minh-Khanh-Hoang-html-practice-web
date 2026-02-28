async function safeFetchJSON(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  const text = await res.text();
  try { return { ok: res.ok, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, data: text }; }
}

document.getElementById("loginBtn").onclick = async () => {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (username.length < 3 || password.length < 4) return alert("Thông tin không hợp lệ");

  const { ok, data } = await safeFetchJSON("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!ok || !data?.success) return alert("Sai tài khoản hoặc lỗi server!");
  location.href = "index.html";
};

document.getElementById("registerBtn").onclick = async () => {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  if (username.length < 3 || password.length < 4) return alert("Thông tin không hợp lệ");

  const { ok, data } = await safeFetchJSON("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!ok || !data?.success) return alert("Không thể đăng ký!");
  alert("Đăng ký thành công! Bạn có thể đăng nhập.");
};