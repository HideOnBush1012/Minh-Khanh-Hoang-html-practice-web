async function loadProblems() {
  try {
    const res = await fetch("/api/tasks", { credentials: "include" });
    if (!res.ok) {
      console.error("Failed to load tasks:", res.status);
      return;
    }

    const data = await res.json();

    const grid = document.getElementById("practiceGrid");
    if (!grid) {
      console.error("Missing #practiceGrid in HTML");
      return;
    }

    const searchEl = document.getElementById("practiceSearch");
    const diffEl = document.getElementById("difficultyFilter");

    const render = () => {
      const q = (searchEl?.value || "").trim().toLowerCase();
      const d = (diffEl?.value || "").trim();

      const filtered = data.filter(p => {
        const matchText =
          !q ||
          String(p.id).includes(q) ||
          (p.title || "").toLowerCase().includes(q) ||
          (p.difficulty || "").toLowerCase().includes(q);

        const matchDiff = !d || String(p.difficulty) === d;
        return matchText && matchDiff;
      });

      grid.innerHTML = "";

      filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "practice-card";

        card.innerHTML = `
          <div>
            <h4>${p.id}. ${p.title}</h4>
            <div class="practice-meta">
              <span class="badge">🎯 ${p.difficulty}</span>
              <span class="badge">🖼️ Image match</span>
              <span class="badge">⚡ Auto score</span>
            </div>
          </div>
          <div style="display:flex; align-items:center;">
            <button class="btn btn-primary">Start</button>
          </div>
        `;

        card.querySelector("button").onclick = (e) => {
          e.stopPropagation();
          location.href = `task.html?id=${p.id}`;
        };
        card.onclick = () => (location.href = `task.html?id=${p.id}`);

        grid.appendChild(card);
      });

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="panel" style="grid-column: 1 / -1; padding: 18px;">
            <div class="muted">Không có bài nào phù hợp bộ lọc hiện tại.</div>
          </div>
        `;
      }
    };

    // init + listeners
    render();
    if (searchEl) searchEl.addEventListener("input", render);
    if (diffEl) diffEl.addEventListener("change", render);

  } catch (e) {
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", loadProblems);