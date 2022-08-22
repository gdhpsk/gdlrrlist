let lol = (level, levels) => {
    var counter = Object.keys(levels).indexOf(level)+1
    if(counter < 76) {
        return Math.round(100*(50.0 / (Math.pow(Math.E, 0.001 * counter)) * Math.log((1 / (0.008 * counter)))))/100
    } else if(counter > 75 && counter < 101) {
        return Math.round(100*(50.0 / (Math.pow(Math.E, 0.01 * counter)) * Math.log((210 / Math.pow(counter, 1.001)))))/100
    } else if(counter > 100 && counter < 151) {
        return Math.round(100*(50.0 / (Math.pow(Math.E, 0.01 * counter)) * Math.log((3.3 / Math.pow(counter, .1)))))/100
    } else {
       return 0// Math.round(100*(50.0 / (Math.pow(Math.E, 0.01 * counter)) * Math.log((3.3 / (Math.pow(counter, .1))))))/100;
    }
}
module.exports = lol