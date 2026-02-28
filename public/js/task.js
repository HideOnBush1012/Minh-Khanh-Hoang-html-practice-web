// public/js/task.js
const urlParams = new URLSearchParams(window.location.search);
const problemId = urlParams.get("id");

async function loadProblem() {
    if (!problemId) return location.href = "index.html";

    const res = await fetch(`/api/task/${problemId}`);
    const data = await res.json();

    document.getElementById("problemTitle").innerText = data.title;
    document.getElementById("difficulty").innerText = data.difficulty;
    document.getElementById("targetImage").src = data.imageTarget;

    loadMyBest();
    loadTaskLeaderboard();
}

async function loadMyBest() {
    const res = await fetch(`/api/task/${problemId}/my-best`);
    if (!res.ok) return;

    const data = await res.json();
    const myBestEl = document.getElementById("myBest");
    myBestEl.innerText = data.bestScore || 0;
    if (data.bestScore === 100) myBestEl.style.color = "green";
}

async function loadTaskLeaderboard() {
    const res = await fetch(`/api/task/${problemId}/leaderboard`);
    const data = await res.json();

    const tbody = document.querySelector("#taskLeaderboard tbody");
    tbody.innerHTML = "";

    data.forEach(row => {
        tbody.innerHTML += `
            <tr>
                <td>${row.rank}</td>
                <td style="color:${row.rankColor}; font-weight:bold">${row.username}</td>
                <td>${row.score}</td>
            </tr>
        `;
    });
}

async function submitSolution() {
    const fileInput = document.getElementById("fileInput");
    if (!fileInput.files[0]) return alert("Vui lòng chọn file HTML!");

    const btn = document.querySelector("button[onclick='submitSolution()']");
    btn.disabled = true;
    btn.innerText = "Đang chấm bài...";

    const formData = new FormData();
    formData.append("problemId", problemId);
    formData.append("codeFile", fileInput.files[0]);

    try {
        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        
        let message = `Điểm của bạn: ${data.score}/100`;
        if (data.ratingUpdate && data.ratingUpdate.updated) {
            message += `\nChúc mừng! Bạn được cộng ${data.ratingUpdate.gain} Rating.`;
        } else if (data.score > 0) {
            message += `\n(Điểm này không giúp bạn tăng Rating thêm)`;
        }

        alert(message);
        location.reload(); // Reload để cập nhật bảng điểm

    } catch (err) {
        alert("Có lỗi xảy ra khi nộp bài!");
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit";
    }
}

document.addEventListener("DOMContentLoaded", loadProblem);