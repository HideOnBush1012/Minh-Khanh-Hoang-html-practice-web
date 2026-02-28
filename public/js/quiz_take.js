function getQuizId() {
  const p = new URLSearchParams(location.search);
  return Number(p.get("quizId"));
}

let quiz = null;

function updateProgress() {
  const total = quiz?.questions?.length || 0;
  const checked = document.querySelectorAll("#quizForm input[type='radio']:checked").length;

  const fill = document.getElementById("progressFill");
  const counter = document.getElementById("counter");
  if (fill) fill.style.width = total ? `${Math.round((checked / total) * 100)}%` : "0%";
  if (counter) counter.textContent = `${checked}/${total}`;
}

async function loadQuiz() {
  const quizId = getQuizId();
  const res = await fetch(`/api/quizzes/${quizId}`, { credentials: "include" });
  quiz = await res.json();

  document.getElementById("quizTitle").textContent = quiz.title;

  const form = document.getElementById("quizForm");
  form.innerHTML = "";

  // Hàm nội bộ để biến đổi < thành &lt; giúp hiển thị thẻ code
  const escapeHTML = (str) => {
    if (!str) return "";
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  };

  quiz.questions.forEach((q, idx) => {
    const block = document.createElement("div");
    block.className = "q-card";
    
    // Sử dụng escapeHTML cho q.text
    block.innerHTML = `
      <p class="q-title"><b>Câu ${idx + 1}:</b> ${escapeHTML(q.text)}</p>
      <div class="choices" id="choices_${q.id}"></div>
    `;

    const choicesDiv = block.querySelector(`#choices_${q.id}`);
    q.choices.forEach((c, i) => {
      const id = `q_${q.id}_${i}`;
      const label = document.createElement("label");
      label.className = "choice";
      label.setAttribute("for", id);
      
      // Sử dụng escapeHTML cho nội dung đáp án (c)
      label.innerHTML = `
        <input type="radio" name="q_${q.id}" id="${id}" value="${i}">
        <span class="choice-text">${escapeHTML(c)}</span>
      `;
      
      label.addEventListener("click", () => setTimeout(updateProgress, 0));
      choicesDiv.appendChild(label);
    });

    form.appendChild(block);
  });

  updateProgress();
}

async function submitQuiz() {
  const quizId = getQuizId();
  const answers = [];

  quiz.questions.forEach(q => {
    const picked = document.querySelector(`input[name="q_${q.id}"]:checked`);
    answers.push({
      questionId: q.id,
      choiceIndex: picked ? Number(picked.value) : -1
    });
  });

  const res = await fetch(`/api/quizzes/${quizId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ answers })
  });

  const data = await res.json();
  if (data.success) {
    alert(`Hoàn thành! Điểm: ${data.score}. Elo: +${data.ratingGain}`);
    location.href = `quiz_result.html?quizId=${quizId}`; // Chuyển sang trang kết quả
  } else {
    alert(data.error || "Lỗi khi nộp bài");
  }
}

document.getElementById("submitBtn").addEventListener("click", submitQuiz);
document.addEventListener("DOMContentLoaded", loadQuiz);