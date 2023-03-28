
let lol = (player, level, leaderboard) => {
  var numberOfRecords = 0
  var levels = 0
  var progs = 0
  if (leaderboard[player].levels[0] != "none" && leaderboard[player].levels[0]) {
    numberOfRecords += leaderboard[player].levels.length
    levels += leaderboard[player].levels.length
  }
  if (leaderboard[player].progs[0] != "none" && leaderboard[player].progs[0]) {
    numberOfRecords += leaderboard[player].progs.length
    progs += leaderboard[player].progs.length
  }
  let allBasePoints = new Array(numberOfRecords)
  if (leaderboard[player].levels[0] != "none" && leaderboard[player].levels[0]) {
    for (let i = 0; i < leaderboard[player].levels.length; i++) {
      leaderboard[player].levels.sort((a, b) => Object.keys(level).indexOf(a) - Object.keys(level).indexOf(b))
      var count = Object.keys(level).indexOf(leaderboard[player].levels[i]) + 1
      if (count > 150) break;
      if (count <= 50) {
        allBasePoints[i] = 50.0 / (Math.pow(Math.E, 0.001 * count)) * Math.log((1 / (0.008 * count)));
      } else if (count > 50 && count <= 100) {
        allBasePoints[i] = 50.0 / (Math.pow(Math.E, 0.01 * count)) * Math.log((210 / Math.pow(count, 1.001)));
      } else {
        allBasePoints[i] = 50.0 / (Math.pow(Math.E, 0.01 * count)) * Math.log((3.3 / Math.pow(count, .1)));
      }
    }
  }
  // allBasePoints[i+levels]
  if (leaderboard[player].progs[0] != "none" && leaderboard[player].progs[0]) {
    leaderboard[player].progs.sort((a, b) => Object.keys(level).indexOf(a.name) - Object.keys(level).indexOf(b.name))
    for (let i = 0; i < progs; i++) {
      var jk = 0
      var count = Object.keys(level).indexOf(leaderboard[player].progs[i].name) + 1
      if (count > 75) break;
      if (level[leaderboard[player].progs[i].name].minimumPercent > leaderboard[player].progs[i].percent) continue;
      if (count <= 50) {
        allBasePoints[i + levels] = 50.0 / (Math.pow(Math.E, 0.001 * count)) * Math.log((1 / (0.008 * count)));
      } else {
        allBasePoints[i + levels] = 50.0 / (Math.pow(Math.E, 0.01 * count)) * Math.log((210 / Math.pow(count, 1.001)));
      }

      allBasePoints[i + levels] = allBasePoints[i + levels] * (Math.pow(5, ((leaderboard[player].progs[i].percent - level[leaderboard[player].progs[i].name].minimumPercent) / (100 - level[leaderboard[player].progs[i].name].minimumPercent))) / 10);
    }
  }
  allBasePoints.sort((a, b) => b - a);
  let point = allBasePoints.reduce(
    (sum, currentValue, index) => sum + currentValue * Math.pow(0.95, index), 0);
  return Math.round(100 * point) / 100
}

module.exports = lol