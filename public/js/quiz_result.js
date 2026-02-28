async function loadResult() {
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quizId");

    if (!quizId) {
        location.href = "quiz.html";
        return;
    }

    try {
        const res = await fetch(`/api/quizzes/${quizId}/result`, { credentials: "include" });
        if (!res.ok) throw new Error("Không tìm thấy kết quả");
        const data = await res.json();

        // 1. Hiển thị thông tin tổng quan
        document.getElementById("resTitle").textContent = "Kết quả bài làm";
        document.getElementById("resStats").textContent = `Bạn đã đạt được ${data.score}/100 điểm`;
        document.getElementById("eloBadge").textContent = `+${data.ratingGain} Elo`;

        const container = document.getElementById("resultContent");
        container.innerHTML = "";

        const charToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

        // Hàm chống lỗi hiển thị thẻ HTML (giống bên quiz_take)
        const escapeHTML = (str) => {
            if (!str) return "";
            return str.replace(/[&<>"']/g, (m) => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[m]));
        };

        // 2. Lặp qua danh sách câu hỏi để hiển thị
        data.questions.forEach((q, idx) => {
            const block = document.createElement("div");
            block.className = "res-card";

            const choices = [q.answerA, q.answerB, q.answerC, q.answerD];
            const correctIdx = charToIndex[q.correctAnswer];

            let choicesHTML = "";
            choices.forEach((text, i) => {
                const isCorrect = i === correctIdx;
                
                choicesHTML += `
                    <div class="choice ${isCorrect ? 'correct-answer-box' : ''}" style="cursor: default;">
                        <span class="choice-text" style="color: ${isCorrect ? '#fff' : '#a7b0c0'}">
                            ${isCorrect ? "✅ " : "○ "}
                            ${escapeHTML(text)}
                            ${isCorrect ? '<span class="correct-label">(Đáp án đúng)</span>' : ''}
                        </span>
                    </div>
                `;
            });

            block.innerHTML = `
                <p class="q-title" style="margin-bottom:15px;">
                    <b style="color:var(--primary)">Câu ${idx + 1}:</b> ${escapeHTML(q.question)}
                </p>
                <div class="choices">
                    ${choicesHTML}
                </div>
            `;
            container.appendChild(block);
        });

    } catch (err) {
        console.error(err);
        document.getElementById("resultContent").innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--muted);">
                Không thể tải kết quả. Có thể bạn chưa hoàn thành bài Quiz này.
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", loadResult);