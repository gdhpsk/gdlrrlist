const express = require('express')
const app = express()
const {discord_token} = process.env
const path = require("path")
const dayjs = require("dayjs")
const cron = require("node-cron")
const bcrypt = require("bcrypt")
const allowedPeople = require("./schemas/allowedPeople.js")
const point_calc = require("./point_calc")
const cookieParser = require("cookie-parser")
const {REST} = require("@discordjs/rest")
const {Routes} = require("discord-api-types/v10")
const rest = new REST({version: '10'}).setToken(discord_token);
const fetchUser = async id => rest.get(Routes.user(id));
const {WebSocketServer} = require("ws");
const {request} = require("undici")

const http_server = require("http").createServer(app);

let server = new WebSocketServer({server: http_server});

let send_to_client = (msg, options) => {
  for(const ws of server.clients) {
    if(!ws.isAlive) continue;
    if(!options?.userResource && !ws.isAdmin) continue;
    if(options?.target) {
      if(ws.user != options.target) continue
    }
    ws.send(msg)
  }
}

const io = ""

const webhook = (...args) => require("./webhook")(send_to_client).then(async hook => await hook(...args))
const opinionSchema = require("./schemas/opinions.js")
const jwt = require("jsonwebtoken")
const submitSchema = require("./schemas/submissions.js")
const levelsSchema = require("./schemas/levels.js")
const loginSchema = require("./schemas/logins.js")
const sixtyoneSchema = require("./schemas/61hertz.js")
const rolePacksSchema = require("./schemas/role_packs.js")
const leaderboardSchema = require("./schemas/leaderboard.js")
const mailSchema = require("./schemas/mail.js") 
const {google} = require("googleapis")

server.on("connection", (socket) => {
  socket.on("message", async message => {
    try {
      let json_msg = JSON.parse(message)
      if(json_msg?.discord) {
        if(json_msg.secret != process.env.secret) return socket.send(JSON.stringify({
    error: "401 UNAUTHORIZED",
    message: "You are not allowed to authorize in this fasion."
  }))
        let user = await loginSchema.findOne({discord: json_msg.discord})
        if(!user) return socket.send(JSON.stringify({
    error: "404 NOT FOUND",
    message: "Could not find the discord ID provided!"
  }))
        socket.isAlive = true
      socket.user = user.name
        return
      }
      if(json_msg?.token) {
        if(json_msg.token === process.env.WEBSOCKET_TOKEN) {
          socket.isAlive = true
          socket.isAdmin = true
          socket.user = process.env.WEBSOCKET_TOKEN
          return socket.send(JSON.stringify({
            message: "So I see... you have found the admin WebSocket! You will now recieve all moderation events... :)"
          }))
        }
    try {
       let token = jwt.verify(json_msg.token, process.env.WEB_TOKEN)
  let people = await loginSchema.findById(token)
      
  if(!people) return socket.send(JSON.stringify({
    error: "404 NOT FOUND",
    message: "Could not find the token provided!"
  }))
      
 
      socket.isAlive = true
      socket.user = people.name
    }catch(e) {
      return socket.send(JSON.stringify({
    error: "404 NOT FOUND",
    message: "Could not find the token provided!"
  }))
    }
  } else {
  return socket.send(JSON.stringify({
    error: "404 NOT FOUND",
    message: "Could not find a token!"
  }))
      }
      
    } catch(_) {
      
    }
  })
})

async function hasCorrectAuth(req, res, authMethods) {
  let authLevel = {
    "user": 0,
    "spectator": 1,
    "helper": 2,
    "moderator": 3,
    "leader": 4
  }
  if(!req.headers?.authorization && typeof req.headers == 'object') {
    let makeAuthMethod = (method) => {
      let txt = method.split("")
      txt[0] = txt[0].toUpperCase()
      txt = txt.join("")
      return txt
    }
    let authPrefix = authMethods ? makeAuthMethod(authMethods[authMethods.length-1]) : "User"
    req.headers.authorization = `${authPrefix} ${req.cookies?.["token"]}`
  }
  if(req.headers?.authorization) {
      try {
      let jwt_token = req.headers.authorization.split(" ")
      let acceptable_tokens = ["Spectator", "Helper", "Moderator", "Leader", "User"]
        if(!authMethods) {
          authMethods = acceptable_tokens.map(e => e = e.toLowerCase())
        }
        let invalidAuth = !acceptable_tokens.find(e => e == jwt_token[0] && authMethods.includes(e.toLowerCase()))
      if(jwt_token.length != 2 || invalidAuth) return false
     let token = jwt.verify(jwt_token[1],  process.env.WEB_TOKEN)
      if(!token) return false
        let exists = await findToken(req, true)
      if(!exists) return false

    let person = await loginSchema.findById(token.id)
        if(authMethods.length != acceptable_tokens.length || jwt_token[0] != "User") {
    let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == person.name && authMethods.includes(e.tag) && authLevel[jwt_token[0].toLowerCase()] <= authLevel[e.tag])
       if(!allowed) return false
        }
       return true
      }catch(e) {
        console.log(e)
        return false
    }
  }
  return false
}

const cors = require("cors")
const mongoose = require("mongoose")
mongoose.connect(process.env.MONGODB_URI)
app.set('views', path.join(__dirname, 'htdocs'))
app.set('view engine', "ejs")
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())
app.use((req, res, next) => {
  if(req.method == "TRACE") { 
    return res.status(405).json({error: "405 METHOD NOT ALLOWED", message: "This method is not allowed."})
  }
  next()
})
app.use(cookieParser())
app.use("/", express.static("sounds"));
app.use("/api", require("./api/api.js")(hasCorrectAuth, webhook, send_to_client));

const dateToCron = (date) => {
  const seconds = date.getSeconds();
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const days = date.getDate();
    const months = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    return `${seconds} ${minutes} ${hours} ${days} ${months} ${dayOfWeek}`;
};
(async () => {
  let bannedPeople = await leaderboardSchema.find({ban: true})
  for(let i = 0; i < bannedPeople.length; i++) {
    let user = await leaderboardSchema.findOne({name: bannedPeople[i].name})
    if(user?.ban_time == "permanent") continue;
    let unixTime = Date.parse(bannedPeople[i].ban_time)
    if(unixTime <= Date.now()) {
      user.ban = undefined
      user.ban_time = undefined
      user.ban_reason = undefined
      await user.save()
      continue;
    } else {
      let actual_time = dateToCron(new Date(user.ban_time))
  let task = cron.schedule(actual_time, async () => {
    try {
		user.ban = undefined
    user.ban_time = undefined
    user.ban_reason = undefined
    await user.save()
    task.stop()
    } catch(_) {
      
    }
	});
      continue;
    }
  }
})();



function getCookie(cname, req) {
  return req.cookies[cname] ? req.cookies[cname] : "";
}
async function findToken(req, useHeaders) {
   let tok = useHeaders ? req.headers.authorization.split(" ")[1] : getCookie("token", req)
  if(tok) {
    try {
       let token = jwt.verify(tok, process.env.WEB_TOKEN)
  let people = await loginSchema.findById(token.id)
  if(!people) return false
  return true
    }catch(e) {
      return false
    }
  }
  return false
}

async function hasAccess(spectator, req, res, helpersIncluded, leadersOnly) {
  if(getCookie("token", req)) {
    if(spectator) {
      try {
     let token = jwt.verify(getCookie("token", req),  process.env.WEB_TOKEN)
      if(!token) return false
        let exists = await findToken(req)
      if(!exists) return false
        let person = await loginSchema.findById(token.id)
    let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == person.name)
       if(!allowed) return false
       return true
      }catch(e) {
        console.log(e)
        return false
      }
    } else {
      try {
      let token = jwt.verify(getCookie("token", req),  process.env.WEB_TOKEN)
      if(!token) return false
         let exists = await findToken(req)
      if(!exists) return false
        let person = await loginSchema.findById(token.id)
        let query2 = (e) => leadersOnly ? e.tag == "leader" : true
        let query = (e) => helpersIncluded ? ["helper", "moderator", "leader"].includes(e.tag) : ["moderator", "leader"].includes(e.tag)
    let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == person.name && query(e) && query2(e))
       if(!allowed) return false
       return true
      } catch(e) {
        console.log(e)
        return false
      }
    }
  }
  return false
}
async function getDetails(req) {
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(loggedIn) {
    let ok = await hasAccess(true, req)
    if(ok) {
      editable = true
      if(getCookie("editing", req) == "true") {
      editing = true
      }
  }
}
  return {loggedIn, editing, editable}
}



app.use("/", require("./ejsroutes"))

app.use("/", express.static("htdocs", {
  extensions: ["html", "css", "js", "png", "webp", "svg"],
  setHeaders: function(res, path) {
       res.set("Access-Control-Allow-Origin", "*");
  }
}))

app.route("/test")
  .get((req, res) => {
    res.render("../misc/test.ejs")
  })
.post((req, res) => {
  res.json(req.body)
})

// notifications

app.use("/notifications", require("./scripts/notifications.js")({ getDetails, getCookie, mailSchema, submitSchema }))

// settings

app.use("/settings", require("./scripts/settings.js")({allowedPeople, hasAccess, getDetails, getCookie}))

// sheets

app.use("/sheets", require("./scripts/sheets")({ hasAccess, getDetails, getCookie, opinionSchema, levelsSchema }))


// authentication
app.use("/", require("./scripts/auth.js")({ loginSchema, hasCorrectAuth }))

// searching for stuff
app.use("/search", require("./scripts/search.js")({ hasAccess, getDetails, levelsSchema, leaderboardSchema }))

// discord

app.use("/roles/packs", require("./scripts/role_packs")({hasAccess, rolePacksSchema }))

// socials

app.use("/socials", require("./scripts/socials")({ hasAccess, leaderboardSchema, getDetails, getCookie, fetchUser, webhook }))

// nationalities

app.use("/nationalities", require("./scripts/nationalities")({ hasAccess, leaderboardSchema, getDetails, webhook, getCookie }))

// regular levels

app.use("/", require("./scripts/levels")({ hasAccess, getDetails, levelsSchema, leaderboardSchema, webhook, getCookie }))

// 61hz+ levels

app.use("/", require("./scripts/61hertz")({ hasAccess, getDetails, sixtyoneSchema, webhook }))

// records

app.use("/", require("./scripts/records")({ hasAccess, getDetails, getCookie }))

// mod submissions manager
app.use("/submissions", require("./scripts/submissions")({ getDetails, getCookie }))

// bans
app.use("/", require("./scripts/bans")({ hasAccess, getDetails, getCookie, dateToCron, leaderboardSchema, webhook }))

// editing upcoming changes

app.route("/editupcoming")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res)
  if(!approved) return res.render("404.ejs")
   let upcoming = await rest.get(Routes.channelMessage("720157738658955321", "984981897794977792"))
  res.render("../adding/edit_upcoming.ejs", {content: upcoming.content})
})
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res)
  if(!approved) return res.render("404.ejs")
  rest.patch(Routes.channelMessage("720157738658955321", "984981897794977792"), {
    body: {
      content: req.body.content
    }
  })
  return res.redirect(req.headers.referer)
})

// change leaderboard profile name

app.route("/changename")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(loggedIn) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  return res.render("../adding/changename.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(loggedIn) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
 let profile = await leaderboardSchema.findOne({name: req.body.name})
  let new_profile = await leaderboardSchema.findOne({name: req.body.change})
  if(!profile || new_profile) return res.render("404.ejs", {error: "400 Bad Request", message: `${new_profile ? "The profile name you're trying to change this profile to already exists!" : "The profile that you're trying to change the name of doesn't exist!"}`})
  if(profile.levels[0]) {
    for(let i = 0; i < profile.levels.length; i++) {
      let level = await levelsSchema.findOne({name: profile.levels[i]})
      if(!level) continue;
     let index = level.list.findIndex(e => e.name == req.body.name)
      if(index == -1) {
        console.log(level.name)
        continue;
      }
      level.list[index].name = req.body.change
      level.list = level.list
      await level.save()
    }
  }
   if(profile.progs[0] != "none") {
    for(let i = 0; i < profile.progs.length; i++) {
      let level = await levelsSchema.findOne({name: profile.progs[i].name})
      if(!level) continue;
     let index = level.progresses.findIndex(e => e.name == req.body.name)
      if(index == -1) {
        console.log(level.name)
        continue;
      }
      let obj = level.progresses[index]
  obj.name = req.body.change
  level.progresses.splice(index, 1)
  level.progresses.splice(index, 0, obj)
     await level.save()
    }
  }
  
  profile.name = req.body.change
  await profile.save()
  webhook(`The leaderboard profile name of ${req.body.name} has been changed to ${req.body.change}`, {
    event: "PROFILE_NAME_CHANGE",
    data: {
      old: req.body.name,
      new: req.body.change
    }
  })
  return res.render("added.ejs", {text: "name", type: "changed", loggedIn, editing, editable})
})

// submit stuff

app.route("/submit")
.get(async (req, res) => {
  let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(loggedIn) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  return res.render("../submissions/submit.ejs", {active: "submit", editing, editable, loggedIn})
})
.post(async (req, res) => {
  let {loggedIn, editing, editable} = await getDetails(req)
  let submit = await request("https://gdlrrlist.com/api/v1/client/submissions", {
    method: "POST",
    headers: {
      'content-type': 'application/json',
      'authorization': `User ${getCookie("token", req)}`
    },
    body: JSON.stringify(req.body)
  })
  let body = await submit.body.json()
  if(submit.statusCode != 201) {
    if(submit.statusCode == 401) {
      return res.render("404.ejs", {error: "401 UNAUTHORIZED", message: "You must be logged in in order to submit a record! Press the \"More...\" button in the Navigation Bar in order to access the login form!"})
    }
    return res.render("404.ejs", body)
  }
  return res.render("../submissions/done.ejs", {loggedIn, editing, editable})
})

// everything link for mods
app.get("/everything", async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  return res.render("../misc/main.ejs")
})

app.all('*', (req, res) =>{
  return res.render("404.ejs")
})

http_server.listen(process.env.PORT)