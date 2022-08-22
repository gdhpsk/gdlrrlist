let lol = (lev, percent, level) => {
    var count = Object.keys(level).indexOf(lev)
    var point = 0
    if(count > 74) {
        point = 0
    } else {
       if(Object.values(level)[count].minimumPercent > percent) {
           point = -1
       } else {
        if(count < 50) point =  50.0 / (Math.pow(Math.E, 0.001 * (count+1))) * Math.log((1 / (0.008 * (count+1))));
        else point = 50.0 / (Math.pow(Math.E, 0.01 * (count+1))) * Math.log((210 / (Math.pow((count+1), 1.001))));
        let req = Object.values(level)[count].minimumPercent;
        point = point * (Math.pow(5, ((percent - req)/(100-req)))/10)
       }
    }
    return Math.round(100*point)/100
}

module.exports = lol