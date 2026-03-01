/**
 * judge/htmlComparator.js
 *
 * Sử dụng FPT AI Marketplace thay cho Anthropic.
 * Interface giữ nguyên — submissions.js không cần sửa gì.
 *
 *   compareHtml(userHtml, expectedHtml) → { score: number }
 *
 * Yêu cầu: FPT_API_KEY trong file .env
 * ⚠️  Thay BASE_URL bằng URL lấy từ dashboard FPT AI Marketplace
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const FPT_API_KEY = process.env.FPT_API_KEY;

// ⚠️ Vào marketplace.fptcloud.com → chọn model → tab "API Integration"
//    rồi copy base URL từ đoạn code mẫu vào đây:
const BASE_URL   = process.env.FPT_BASE_URL || "https://mkp-api.fptcloud.com/v1/chat/completions";
const MODEL      = process.env.FPT_MODEL    || "Llama-3.3-70B-Instruct";
const MAX_TOKENS = 256;
const TIMEOUT_MS = 15_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPrompt(userHtml, expectedHtml) {
    return `Bạn là hệ thống chấm điểm HTML tự động. So sánh bài làm của học sinh với HTML mẫu và cho điểm từ 0 đến 100.

Tiêu chí:
- Cấu trúc HTML giống mẫu (thẻ, thứ tự, phân cấp)
- Nội dung văn bản đúng
- Thuộc tính quan trọng có mặt (id, class, href, src, alt…)
- Không cần trùng từng ký tự, chỉ cần đúng về mặt ngữ nghĩa và chức năng

HTML MẪU:
\`\`\`html
${expectedHtml.slice(0, 4000)}
\`\`\`

BÀI LÀM HỌC SINH:
\`\`\`html
${userHtml.slice(0, 4000)}
\`\`\`

Trả về JSON duy nhất, không giải thích gì thêm:
{"score": <số nguyên 0-100>}`;
}

async function fetchWithTimeout(url, options, ms) {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function compareHtml(userHtml, expectedHtml) {
    if (!FPT_API_KEY) {
        throw new Error("Thiếu FPT_API_KEY trong biến môi trường.");
    }

    const response = await fetchWithTimeout(
        BASE_URL,
        {
            method:  "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${FPT_API_KEY}`,
            },
            body: JSON.stringify({
                model:      MODEL,
                max_tokens: MAX_TOKENS,
                messages: [
                    {
                        role:    "system",
                        content: "Bạn là hệ thống chấm điểm HTML. Chỉ trả về JSON, không giải thích.",
                    },
                    {
                        role:    "user",
                        content: buildPrompt(userHtml, expectedHtml),
                    },
                ],
            }),
        },
        TIMEOUT_MS
    );

    // ── Kiểm tra content-type để phát hiện URL sai sớm ──
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(
            `FPT AI trả về HTML thay vì JSON — BASE_URL có thể sai!\n` +
            `URL đang dùng: ${BASE_URL}\n` +
            `HTTP status: ${response.status}\n` +
            `Hãy vào marketplace.fptcloud.com → chọn model → tab API Integration để lấy URL đúng.`
        );
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
            `FPT AI API lỗi ${response.status}: ${err?.error?.message ?? JSON.stringify(err)}`
        );
    }

    const data = await response.json();
    const raw  = data?.choices?.[0]?.message?.content ?? "";

    // Parse JSON — chịu đựng trường hợp model bọc trong ```json ... ```
    const cleaned = raw.replace(/```json|```/gi, "").trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error(`FPT AI trả về định dạng không hợp lệ: ${raw.slice(0, 200)}`);
    }

    const score = Number(parsed?.score);
    if (isNaN(score) || score < 0 || score > 100) {
        throw new Error(`Điểm không hợp lệ: ${parsed?.score}`);
    }

    return { score: Math.round(score) };
}

module.exports = { compareHtml };
