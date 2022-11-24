const express = require("express")
const levelsSchema = require("./schemas/levels.js")
const rouletteSchema = require("./schemas/roulette.js")
const sixtyoneSchema = require("./schemas/61hertz")
const loginSchema = require("./schemas/logins.js")
const rolePacksSchema = require("./schemas/role_packs.js")
const allowedPeople = require("./schemas/allowedPeople.js")
const leaderboardSchema = require("./schemas/leaderboard.js")
const app = express.Router()
const config = require("./api/config")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const {discord_token} = process.env
const levels_point_calc = require("./levels_point_calc")
const levels_progs_calc = require("./levels_progs_calc")
const {request} = require("undici")
const logsSchema = require("./schemas/mod_log.js")
const {REST} = require("@discordjs/rest")
const {Routes} = require("discord-api-types/v10")
const fs = require("fs")
const {documentation} = require("./api/config.json")
const dayjs = require("dayjs")

const {google} = require('googleapis');

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
  let people = await loginSchema.findById(token.id)
  return {exists: true, name: people.name, pc_info: !!people.pc_info, ID: token.id}
    }catch(e) {
      return {exists: false}
    }
  }
   return {exists: false}
}
let tableMaker = (json) => {
  let txt = ""
  if(Object.values(json).length != 0) {
   txt = "<table>"
txt += `<tr><th>Name</th><th>Type</th><th>Description</th><th>Body Type</th><th>Optional</th></tr>` 
  Object.values(json).forEach(e => txt += `<tr><td>${e.name}</td><td>${e.type}</td><td>${e.description}</td><td>${e.body_type}</td><td>${!!e.optional}</td></tr>`)
  txt += "</table>"
  }
  return txt
}

// docs
app.get("/documentation/", async (req, res, next) => {
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
 res.render("../documentation/homepage.ejs", {loggedIn, editing, editable})
})

app.get("/documentation/api", async (req, res, next) => {
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
 res.render("../documentation/api/homepage.ejs", {documentation, loggedIn, editing, editable})
})

app.get("/documentation/api/:type", (req, res, next) => {
  try {
    fs.readdir(`./documentation/api/${req.params.type}`, {}, async (err, data) => {
      if(err) return next()
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
      if(req.params.type == "v1") {
        return res.render(`../documentation/api/v1/homepage.ejs`, {documentation: documentation[req.params.type], tableMaker, type: req.params.type, loggedIn, editing, editable})
      }
      return res.render(`../documentation/api/summary.ejs`, {documentation: documentation[req.params.type], tableMaker, type: req.params.type, dir: "./", loggedIn, editing, editable})
    })
  } catch(_) {
    next()
  }
})

app.get("/documentation/api/:version/:type", (req, res, next) => {
  try {
    fs.readdir(`./documentation/api/${req.params.version}/${req.params.type}`, {}, async (err, data) => {
      if(err) return next()
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
      return res.render(`../documentation/api/summary.ejs`, {documentation: documentation[req.params.version][req.params.type], tableMaker, type: req.params.type, dir: "./v1/", editing, editable, loggedIn})
    })
  } catch(_) {
    next()
  }
})

// user settings

app.get("/user_settings", async (req, res) => {
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
  if(!loggedIn.exists) {
    return res.status(401).render("404.ejs")
  }
  let user = await loginSchema.findOne({name: loggedIn.name})
  if(user.discord) { 
    try {
      let leaderboardProfile = await leaderboardSchema.findOne({"socials.discordid": {$eq: user.discord, $ne: undefined}})
      if(leaderboardProfile) {
        return res.render("../misc/user_settings.ejs", {user, loggedIn: loggedIn.exists, editing, editable, name: leaderboardProfile.name})
      }
    } catch(_) {
      
    }
  }
  if(user.youtube_channels?.length) { 
    try {
      for(const item of user.youtube_channels) {
      let leaderboardProfile = await leaderboardSchema.findOne({"socials.youtube": {$regex: item}})
      if(leaderboardProfile) {
        return res.render("../misc/user_settings.ejs", {user, loggedIn: loggedIn.exists, editing, editable, name: leaderboardProfile.name})
      }
      }
    } catch(_) {
      
    }
  }
  
      return res.render("../misc/user_settings.ejs", {user, loggedIn: loggedIn.exists, editing, editable})
})

app.get("/google_signin", async (req, res) => {
  const {code} = req.query 

  const oauth2Client = new google.auth.OAuth2(
  process.env.google_id,
  process.env.google_secret,
  "https://gdlrrlist.com/google_signin"
);
const scopes = [
  'openid',
  "https://www.googleapis.com/auth/youtube.readonly"
];
const authorizationUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  include_granted_scopes: true,
});
   let loggedIn = await findToken(req)
  if(code) {
    try {
      
      let { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      let info = google.oauth2("v2")
info.userinfo.get({
  auth: oauth2Client
}, async (err, response) => {
  if(err) return res.redirect("/")
  
  let userExists = await loginSchema.findOne({google: {$eq: response.data.id, $ne: undefined}})
      if(!userExists) {
        if(loggedIn.exists) {
          userExists = await loginSchema.findOne({name: loggedIn.name})
          userExists.google = response.data.id
          await userExists.save()
        }
      }
      if(userExists) {
        let youtube = google.youtube("v3")
        let {data} = await youtube.channels.list({
          auth: oauth2Client,
          mine: true,
          part: "id",
          maxResults: 50
        })
        if(data?.items?.length) {
          userExists.youtube_channels = data.items.map(e => e = e.id)
          await userExists.save()
        }
        let token = jwt.sign({id: userExists._id.toString()}, process.env.WEB_TOKEN, {noTimestamp: true})
        res.cookie("token", token)
      }
      return res.redirect("/")
})
    } catch(_) {
      
    }
  } else {
    res.redirect(authorizationUrl)
  }
})

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
  const {client_id, client_secret} = process.env
  const {code} = req.query
  if (code) {
		try {
			const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
				method: 'POST',
				body: new URLSearchParams({
					client_id,
					client_secret,
					code,
					grant_type: 'authorization_code',
					redirect_uri: `https://gdlrrlist.com`,
					scope: 'identify', 
				}),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			const oauthData = await oauthResult.json();
     
const userResult = await request('https://discord.com/api/users/@me', {
	headers: {
		authorization: `${oauthData.token_type} ${oauthData.access_token}`,
	},
});
const json = await userResult.body.json()
      let userExists = await loginSchema.findOne({discord: {$eq: json.id, $ne: undefined}})
      if(!userExists) {
        if(loggedIn.exists) {
          userExists = await loginSchema.findOne({name: loggedIn.name})
          userExists.discord = json.id
          await userExists.save()
        }
      }
      if(userExists) {
        let token = jwt.sign({id: userExists._id.toString()}, process.env.WEB_TOKEN, {noTimestamp: true})
        res.cookie("token", token)
      }
      return res.redirect("/")
		} catch (err) {
      console.error(err)
     // console.error(err)
			// NOTE: An unauthorized token will not throw an error;
			// it will return a 401 Unauthorized response in the try block above
			//console.error(error);
		}
  }
  res.render("homepage.ejs", {editable, editing, loggedIn: loggedIn.exists, profile: loggedIn.name})
})

app.get("/404.ejs", (req, res) => {
  res.render("404.ejs")
})

app.get("/added.ejs", (req, res) => {
  res.render("added.ejs")
})

app.get("/MLroulette", async (req, res) => {
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
  res.render("MLroulette.ejs", {loggedIn, editing, editable})
})

app.get("/roulette", async (req, res) => {
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
  if(!loggedIn.exists) return res.render("404.ejs", {error: config["401"][0], message: "In order to use the LRR roulette, you must make an LRR account / log in to the website!"})
  let exists = await rouletteSchema.findOne({site_user: loggedIn.ID})
  let users = []

 
  
  if(exists?.redirect) {
    let userDiscord = exists.user
    exists = await rouletteSchema.findById(exists.redirect)
    exists.user = userDiscord
    let user = await loginSchema.findById(exists.site_user)
    users.push(user.name)

    let all_redirects = await rouletteSchema.find({redirect: exists._id.toString()})
  for(const item of all_redirects) {
    let user = await loginSchema.findById(item.site_user)
    users.push(user.name)
  }
    
    return res.render("roulette.ejs", {data: exists, loggedIn, editing, editable, active: "roulette", redirect: true, users})
  } else {
    if(exists) {
      let user = await loginSchema.findById(exists.site_user)
      users.push(user.name)
    }
  }
  if(exists) {
   let all_redirects = await rouletteSchema.find({redirect: exists._id.toString()})
  for(const item of all_redirects) {
    let user = await loginSchema.findById(item.site_user)
    users.push(user.name)
  }
  }
  res.render("roulette.ejs", {data: exists, loggedIn, editing, editable, active: "roulette", redirect: false, users})
})

app.get("/61plus.html", async (req, res) => {
  let everything = await sixtyoneSchema.find().sort({position: 1})
  let obj = await request("https://gdlrrlist.com/api/v1/leaderboard/nationalities")
  let objOfNations = await obj.body.json()
   let obj2 = await request("https://gdlrrlist.com/api/v1/leaderboard/nations")
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
  let dat = await request("https://gdlrrlist.com/api/v1/leaderboard/nations")
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

  if(loggedIn.exists) {
    let user = await loginSchema.findOne({name: loggedIn.name})
  if(user.discord) { 
    try {
      let leaderboardProfile = await leaderboardSchema.findOne({"socials.discordid": {$eq: user.discord, $ne: undefined}})
      if(leaderboardProfile) {
        leaderboardProfile = array.find(e => e.name == leaderboardProfile.name)
         return res.render("leaderboard.ejs", {page: page, last: Math.floor(array.findIndex(e => e.points == 0)/50), active: "leaderboard", editable, editing, loggedIn: loggedIn.exists, profiles: array, flag_data: nationabbr, user: leaderboardProfile})
      }
    } catch(_) {
      
    }
  }
  if(user.youtube_channels?.length) { 
    try {
      for(const item of user.youtube_channels) {
      let leaderboardProfile = await leaderboardSchema.findOne({"socials.youtube": {$regex: item}})
      if(leaderboardProfile) {
        leaderboardProfile = array.find(e => e.name == leaderboardProfile.name)
        return res.render("leaderboard.ejs", {page: page, last: Math.floor(array.findIndex(e => e.points == 0)/50), active: "leaderboard", editable, editing, loggedIn: loggedIn.exists, profiles: array, flag_data: nationabbr, user: leaderboardProfile})
      }
      }
    } catch(_) {
      
    }
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
  let everything = await levelsSchema.find().sort({position: 1})
  everything = everything.reduce(function(acc, cur, i) {
            acc[everything[i].name] = cur;
            return acc;
          }, {});
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
  if(obj.position < 76) {
     obj.prog_points = levels_progs_calc(level.name, level.minimumPercent, everything)
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
  obj.comp_points = levels_point_calc(level.name, everything)
  obj.active = "lrr-levels"
  obj.everything = everything
  obj.pc_info = {}
  if(loggedIn.pc_info) {
  try {
   let all_pointer_demons = []
  let count = 0
  while(true) {
  let level_i = await request(`https://pointercrate.com/api/v2/demons/?limit=100&after=${count*100}`)  
  let levels = await level_i.body.json()
  all_pointer_demons.push(...levels)
  if(levels.length != 100) break
  count++
}
  obj.pc_info = all_pointer_demons.find(e => e.name == level.name) ?? {}

    if(obj.pc_info?.name) {
      let creators = await request(`https://pointercrate.com/api/v2/demons/${obj.pc_info.id}`)
      creators = await creators.body.json()
      obj.pc_info.creators = creators.data.creators
    }
  } catch(_) {
    obj.pc_info = {}
  }
  }
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


  let user = await loginSchema.findOne({discord: {$exists: true, $eq: profile.socials?.discordid}})
  if(user) { 
    obj["loginName"] = user.name
  } else {
    user = await loginSchema.findOne({youtube_channels: {$exists: true, $in: [profile.socials?.youtube?.split("/channel/")?.[1]]}})
    if(user) { 
      obj["loginName"] = user.name
    }
  }
  
  obj["loggedIn"] = loggedIn
  obj["editing"] = editing
  obj["editable"] = editable
  obj["active"] = "leaderboard-profile"
  res.render("info/leaderboard.ejs", obj)
})

app.get("/changelog.html", async (req, res) => {
  let everything = await logsSchema.find().sort({date: -1})
  let getDate = (date) => {
    let realDate;
    try {
      realDate = new Intl.DateTimeFormat(req.headers["accept-language"].split(",")[0]).format(date)
    } catch(_) {
      realDate = date
    }
    return dayjs(realDate).format("MMMM D, YYYY")
  }
  res.render("changelog.ejs", {everything, getDate})
})

module.exports = app