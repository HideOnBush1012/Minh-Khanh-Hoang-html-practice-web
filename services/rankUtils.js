// services/rankUtils.js

function getRankInfo(rating) {
  if (rating < 1200) {
    return { title: "Newbie", color: "gray" };
  }
  if (rating < 1400) {
    return { title: "Pupil", color: "green" };
  }
  if (rating < 1700) {
    return { title: "Specialist", color: "blue" };
  }
  if (rating < 1900) {
    return { title: "Expert", color: "darkblue" };
  }
  if (rating < 2100) {
    return { title: "Candidate Master", color: "purple" };
  }
  if (rating < 2300) {
    return { title: "Master", color: "orange" };
  }
  if (rating < 2400) {
    return { title: "Candidate Grandmaster", color: "orangered" };
  }
  return { title: "Grandmaster", color: "red" };
}

module.exports = { getRankInfo };