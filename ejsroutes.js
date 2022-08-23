const express = require("express")
const levelsSchema = require("./schemas/levels.js")
const sixtyoneSchema = require("./schemas/61hertz")
const loginSchema = require("./schemas/logins.js")
const rolePacksSchema = require("./schemas/role_packs.js")
const allowedPeople = require("./schemas/allowedPeople.js")
const leaderboardSchema = require("./schemas/leaderboard.js")
const app = express.Router()
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const {discord_token} = process.env
const levels_point_calc = require("./levels_point_calc")
const levels_progs_calc = require("./levels_progs_calc")
const {request} = require("undici")

const {REST} = require("@discordjs/rest")
const {Routes} = require("discord-api-types/v10")

const rest = new REST({version: '10'}).setToken(discord_token);

app.use(express.urlencoded({ extended: true }))
const point_calc = require("./point_calc")
const { default: mongoose } = require("mongoose")
function getCookie(cname, req) {
  var cookies = ` ${req.headers.cookie}`.split(";");
  var val = "";
  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].split("=");
    if (cookie[0] == ` ${cname}`) {
      return cookie[1];
    }
  }
  return "";
}
async function findToken(req) {
  if(getCookie("token", req)) {
    try {
       let token = jwt.verify(getCookie("token", req),  process.env.WEB_TOKEN)
  let people = await loginSchema.findOne({name: token.username})
  if(!people) return {exists: false}
  let isSame = await bcrypt.compare(token.password, people.password)
  if(!isSame) return {exists: false};
  return {exists: true, name: token.username}
    }catch(e) {
      return {exists: false}
    }
  }
   return {exists: false}
}

app.get("/", async (req, res) => {
  let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  res.render("homepage.ejs", {editable, editing, loggedIn: loggedIn.exists})
})

app.get("/404.ejs", (req, res) => {
  res.render("404.ejs")
})

app.get("/added.ejs", (req, res) => {
  res.render("added.ejs")
})

app.get("/roulette", (req, res) => {
  res.render("roulette.ejs")
})

app.get("/61plus.html", async (req, res) => {
  let everything = await sixtyoneSchema.find().sort({position: 1})
  let obj = await request("https://gdlrrlist-new.gdhpsk.repl.co/api/nationalities")
  let objOfNations = await obj.body.json()
   let obj2 = await request("https://gdlrrlist-new.gdhpsk.repl.co/api/nations")
  let nationabbr = await obj2.body.json()
   let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  res.render("61plus.ejs", {active: "61plus", levels: everything, objOfNations: objOfNations, nationabbr: nationabbr, editing: editing, editable, loggedIn: loggedIn.exists})
})

app.get("/sitechanges.html", async (req, res) => {
   let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  res.render("sitechanges.ejs", {editing, editable, loggedIn: loggedIn.exists})
})

app.get("/credits.html", async (req, res) => {
   let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  res.render("credits.ejs", {editable, editing, loggedIn: loggedIn.exists})
})

app.get("/homepage.html", async (req, res) => {
   res.redirect("/")
})

app.get("/autoassign", async (req, res) => {

  let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  if(!loggedIn || !editable) return res.render("404.ejs")
  
  let everything2 = await leaderboardSchema.find({"socials": {$exists: "discordid"}})
  let everything = await levelsSchema.find().sort({position: 1})
  const levels = everything.reduce(function(acc, cur, i) {
            acc[everything[i].name] = cur;
            return acc;
          }, {});
  const leaderboard = everything2.reduce(function(acc, cur, i) {
            acc[everything2[i].name] = cur;
            return acc;
          }, {});
  for(let i = 0; i < everything2.length; i++) {
    let point = point_calc(everything2[i].name, levels, leaderboard)
      try {
        let roles = [
          "762505872630087712",
          "762506483568214016",
          "762512918276210819",
          "762513043980156938",
          "762513070361804800",
          "762513104550494228",
          "762513141325365298"
        ]
        let role = []
        if(point > 0) {
          role.push(roles[0])
        } 
        if(point > 49) {
          role.push(roles[1])
        } 
        if(point > 99) {
          role.push(roles[2])
        }
        if(point > 199) {
          role.push(roles[3])
        }
        if(point > 299) {
          role.push(roles[4])
        }
        if(point > 499) {
          role.push(roles[5])
        }
        if(point > 999) {
          role.push(roles[6])
        }
        for(let x = 0; x < role.length; x++) {
      await rest.put(Routes.guildMemberRole("671450116133224456", everything2[i].socials.discordid, role[x]))
        }
        const test = await rest.get(Routes.guildMember("671450116133224456", everything2[i].socials.discordid))
        for(let x = 0; x < roles.length; x++) {
          if(test.roles.includes(roles[x]) && role.indexOf(roles[x]) == -1) {
             await rest.delete(Routes.guildMemberRole("671450116133224456", everything2[i].socials.discordid, roles[x]))
          }
        }
        let user_packs = []
        let level_packs = (await rolePacksSchema.findById("629f0d8cea10be1cf846e85d"))["Level Packs"]
        for(let key in level_packs) {
          for(let x = 0; x < Object.values(level_packs[key]).length; x++) {
            let pack = Object.values(level_packs[key])[x]
            let includesIt = pack.every((element) => {
              return everything2[i].levels.includes(element)
            })
            if(includesIt) {
              await rest.put(Routes.guildMemberRole("671450116133224456", everything2[i].socials.discordid, Object.keys(level_packs[key])[x]))
            }
          }
        }
      } catch(e) {
        //console.log(e)
        continue;
      }
  }
  res.send("All done")
})

app.get("/leaderboard.html", async (req, res) => {
  let page = 0
  if(!isNaN(req.query.page)) {
    if(Math.sign(parseInt(req.query.page)) != -1) {
      if(Number.isInteger(parseInt(req.query.page))) {
        page = parseInt(req.query.page)
      } else {
        page = Math.ceil(parseInt(req.query.page))
      }
    }
  }
  let dat = await request("https://gdlrrlist-new.gdhpsk.repl.co/api/nations")
  let nationabbr = await dat.body.json()
  let everything = await levelsSchema.find().sort({position: 1})
  let everything2 = await leaderboardSchema.find({ban: {$exists: false}})
  const levels = everything.reduce(function(acc, cur, i) {
            acc[everything[i].name] = cur;
            return acc;
          }, {});
  const leaderboard = everything2.reduce(function(acc, cur, i) {
            acc[everything2[i].name] = cur;
            return acc;
          }, {});
  let array = []
   
  for(const item of everything2) {
    let point = point_calc(item.name, levels, leaderboard)

    array.push({
      name: item.name,
      nationality: item.nationality ? nationabbr[item.nationality.replace(/_/g, " ").toLowerCase()] : undefined,
      nationreal: item.nationality ? item.nationality.replace(/_/g, " ") : undefined,
      points: point
    })
  }
  array.sort((a, b) => b.points - a.points)
  for(let i = 0; i < array.length; i++) {
    array[i].pos = i+1
  }
  let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  res.render("leaderboard.ejs", {page: page, last: Math.floor(array.findIndex(e => e.points == 0)/50), active: "leaderboard", editable, editing, loggedIn: loggedIn.exists, profiles: array, flag_data: nationabbr})
})

app.get("/alllevels", async (req, res) => {
  let everything = await levelsSchema.find().sort({position: 1})
  let leaderboards = await leaderboardSchema.find()
   let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  if(!loggedIn || !editable) return res.render("404.ejs")
  res.render("alllevels.ejs", {levels: everything, editing: editing, editable, loggedIn: loggedIn.exists, active: "search", leaderboards})
})

app.get("/index.html", async (req, res) => {
  let everything = await levelsSchema.find().sort({position: 1})
  let leaderboards = await leaderboardSchema.find()
   let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  res.render("index.ejs", {levels: everything, active: "index", editing: editing, editable, loggedIn: loggedIn.exists, leaderboards})
})

app.get("/extended.html", async (req, res) => {
  let everything = await levelsSchema.find().sort({position: 1})
  let leaderboards = await leaderboardSchema.find()
   let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  res.render("extended.ejs", {levels: everything, active: "extended", editing: editing, editable: editable, loggedIn: loggedIn.exists, leaderboards})
})

app.get("/legacy.html", async (req, res) => {
  let everything = await levelsSchema.find().sort({position: 1})
   let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  res.render("legacy.ejs", {levels: everything, active: "legacy", editing: editing, editable, loggedIn: loggedIn.exists})
})

app.get("/level/:id", async (req, res) => {
  if(isNaN(req.params.id)) return res.render("404.ejs")
  let level = await levelsSchema.findOne({position:req.params.id})
  if(!level) return res.render("404.ejs")
  let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  let obj = {}
  for(const key in level) {
    obj[key] = level[key]
  }
  for(let i = 0; i < obj["list"].length; i++) {
     let user = await leaderboardSchema.findOne({name: obj.list[i].name})
    if(!user?.ban) {
    if(user?.nationality) {
      let data = require("./flagsjson.json")
      let flag = data[user.nationality.toLowerCase().replace(/_/g, " ")]
      if(flag) {
        obj.list[i].realnation = user.nationality
      obj.list[i].nationality = flag
      }
    }
    } else {
      obj.list = obj.list.filter(e => e.name != obj.list[i].name)
    }
  }
  if(obj["progresses"] && obj.position < 76) {
 //   if(!editing) {
    obj.progresses.sort((a, b) => b.percent - a.percent)
 //   }
  for(let i = 0; i < obj["progresses"].length; i++) {
     let user = await leaderboardSchema.findOne({name: obj.progresses[i].name})
  if(!user?.ban) {
    if(user?.nationality) {
      let data = require("./flagsjson.json")
      let flag = data[user.nationality.toLowerCase().replace(/_/g, " ")]
      if(flag) {
        obj.progresses[i].realnation = user.nationality
      obj.progresses[i].nationality = flag
      }
    }
  } else {
    obj.progresses = obj.progresses.filter(e => e.name != obj.progresses[i].name)
  }
  }
}
  obj["editing"] = editing
  obj["editable"] = editable
  obj["loggedIn"] = loggedIn.exists
  obj.active = "lrr-levels"
  res.render("info/newlevels.ejs", obj)
})

app.get("/leaderboard/:name", async (req, res) => {
  let profile = await leaderboardSchema.findOne({name: req.params.name, ban: {$exists: false}})
  if(!profile) return res.render("404.ejs")
  let everything = await levelsSchema.find().sort({position: 1})
  let everything2 = await leaderboardSchema.find()
  const levels = everything.reduce(function(acc, cur, i) {
            acc[everything[i].name] = cur;
            return acc;
          }, {});
  const leaderboard = everything2.reduce(function(acc, cur, i) {
            acc[everything2[i].name] = cur;
            return acc;
          }, {});
  let array2 = []
  if(profile.levels[0]) {
    for(let i = 0; i < profile.levels.length; i++) {
      let placement = everything.findIndex(e => e.name == profile.levels[i])+1
    array2.push({
      name: profile.levels[i],
      percent: 100,
       placement,
      points: levels_point_calc(profile.levels[i], levels)
    })
    }
  }
   if(profile.progs[0] != "none") {
     for(let i = 0; i < profile.progs.length; i++) {
       let placement = everything.findIndex(e => e.name == profile.progs[i].name)+1
    array2.push({
     name: profile.progs[i].name,
    percent: profile.progs[i].percent,
      placement,
      points: levels_progs_calc(profile.progs[i].name, profile.progs[i].percent, levels)
    })
  }
   }
  array2.sort((a, b) => a.placement - b.placement)
  array2.sort((a, b) => b.points - a.points)
  let array = []
  for(let i = 0; i < everything2.length; i++) {
    let point = point_calc(everything2[i].name, levels, leaderboard)
    array.push({
      name: everything2[i].name,
      points: point
    })
  }
  array.sort((a, b) => b.points - a.points)
  let placement = array.findIndex(e => e.name == req.params.name)+1
  profile.realnation = profile.nationality
  profile.placement = placement
  profile.points = array[placement-1].points
  profile.progs = array2
  if(profile.nationality) {
    let data = require("./flagsjson.json")
      let flag = data[profile.nationality.toLowerCase().replace(/_/g, " ")]
      if(flag) {
        profile.nationality = flag
      }
  }
  let obj = {}
  for(const key in profile) {
    obj[key] = profile[key]
  }
  let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(allowed.find(e => e.name == loggedIn.name && e.id == loggedIn.id) && loggedIn.exists) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  obj["loggedIn"] = loggedIn
  obj["editing"] = editing
  obj["editable"] = editable
  obj["active"] = "leaderboard-profile"
  res.render("info/leaderboard.ejs", obj)
})

module.exports = app