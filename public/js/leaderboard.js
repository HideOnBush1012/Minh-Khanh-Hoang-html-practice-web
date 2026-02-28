// public/js/leaderboard.js
async function loadLeaderboard() {
    try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();

        const tbody = document.querySelector("#leaderboardTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        data.forEach(user => {
            tbody.innerHTML += `
                <tr>
                    <td>${user.rank}</td>
                    <td style="color:${user.rankColor}; font-weight:bold">
                        ${user.username}
                        <div style="font-size: 0.8em; font-weight: normal; color: gray;">
                            ${user.rankTitle}
                        </div>
                    </td>
                    <td><b style="color: #2563eb">${user.rating}</b></td>
                    <td>${user.tasksDone} bài</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Leaderboard load failed", err);
    }
}

document.addEventListener("DOMContentLoaded", loadLeaderboard);