// judge/domUtils.js
function normalizeText(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getStyleSignature(el, window) {
  const style = window.getComputedStyle(el);

  return {
    color: style.color,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textDecoration: style.textDecorationLine
  };
}

function styleSimilarity(a, b) {
  let score = 0;
  let total = 0;

  for (const key of Object.keys(a)) {
    total++;
    if (a[key] === b[key]) score++;
  }

  return total === 0 ? 1 : score / total;
}

module.exports = {
  normalizeText,
  getStyleSignature,
  styleSimilarity
};