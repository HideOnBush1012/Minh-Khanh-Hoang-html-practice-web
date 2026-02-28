// judge/htmlComparator.js
const { JSDOM } = require("jsdom");
const {
  normalizeText,
  getStyleSignature,
  styleSimilarity
} = require("./domUtils");

/**
 * Extract DOM nodes (bỏ node rỗng)
 */
function extractElements(doc) {
  return Array.from(doc.body.querySelectorAll("*")).filter(el =>
    normalizeText(el.textContent) !== ""
  );
}

/**
 * Match expected node với user node tốt nhất
 */
function matchNode(expected, userNodes, window) {
  let best = { score: 0, node: null };

  const expectedText = normalizeText(expected.textContent);
  const expectedStyle = getStyleSignature(expected, window);

  for (const u of userNodes) {
    if (u.tagName !== expected.tagName) continue;

    const textSim =
      expectedText === ""
        ? 1
        : normalizeText(u.textContent).includes(expectedText)
        ? 1
        : 0;

    const styleSim = styleSimilarity(
      expectedStyle,
      getStyleSignature(u, window)
    );

    const score = textSim * 0.6 + styleSim * 0.4;

    if (score > best.score) {
      best = { score, node: u };
    }
  }

  return best.score;
}

function compareHtml(userHtml, expectedHtml) {
  try {
    const userDom = new JSDOM(userHtml, { pretendToBeVisual: true });
    const expectedDom = new JSDOM(expectedHtml, { pretendToBeVisual: true });

    const userDoc = userDom.window.document;
    const expectedDoc = expectedDom.window.document;

    const userNodes = extractElements(userDoc);
    const expectedNodes = extractElements(expectedDoc);

    let totalScore = 0;

    for (const exp of expectedNodes) {
      totalScore += matchNode(
        exp,
        userNodes,
        expectedDom.window
      );
    }

    const finalScore = Math.round(
      (totalScore / expectedNodes.length) * 100
    );

    return {
      pass: finalScore >= 70,
      score: finalScore,
      feedback:
        finalScore >= 70
          ? ["Cấu trúc và định dạng HTML đạt yêu cầu"]
          : ["HTML gần đúng nhưng còn sai về cấu trúc hoặc style"]
    };

  } catch (err) {
    return {
      pass: false,
      score: 0,
      feedback: ["HTML không hợp lệ"]
    };
  }
}

module.exports = { compareHtml };