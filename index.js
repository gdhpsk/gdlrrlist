const express = require('express')
const app = express()
const {APIKey, discord_token} = process.env
const path = require("path")
const dayjs = require("dayjs")
const cron = require("node-cron")
const bcrypt = require("bcrypt")
const api = require("./api.js")
const allowedPeople = require("./schemas/allowedPeople.js")
const point_calc = require("./point_calc")
const cookieParser = require("cookie-parser")
const {REST} = require("@discordjs/rest")
const {Routes} = require("discord-api-types/v10")
const rest = new REST({version: '10'}).setToken(discord_token);
const fetchUser = async id => rest.get(Routes.user(id));
const {WebSocketServer} = require("ws")

const {request} = require("undici")

const http_server = require("http").createServer(app)

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

server.on("connection", (socket) => {
  socket.on("message", async message => {
    try {
      let json_msg = JSON.parse(message)
      
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
  let people = await loginSchema.findOne({name: token?.username})
      
  if(!people) return socket.send(JSON.stringify({
    error: "404 NOT FOUND",
    message: "Could not find the token provided!"
  }))
      
  let isSame = await bcrypt.compare(token.password, people.password)
      
  if(!isSame) return socket.send(JSON.stringify({
    error: "404 NOT FOUND",
    message: "Could not find the token provided!"
  }))
      socket.isAlive = true
      socket.user = token.username
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
        if(authMethods.length != acceptable_tokens.length || jwt_token[0] != "User") {
    let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == token.username && authMethods.includes(e.tag) && authLevel[jwt_token[0].toLowerCase()] <= authLevel[e.tag])
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
app.use(cookieParser(process.env.parse_cookie))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())
app.use((req, res, next) => {
  if(req.method == "TRACE") { 
    return res.status(405).json({error: "405 METHOD NOT ALLOWED", message: "This method is not allowed."})
  }
  next()
})
app.use("/api", api);
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
  let people = await loginSchema.findOne({name: token.username})
  if(!people) return false
  let isSame = await bcrypt.compare(token.password, people.password)
  if(!isSame) return false
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
    let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == token.username)
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
        let query2 = (e) => leadersOnly ? e.tag == "leader" : true
        let query = (e) => helpersIncluded ? ["helper", "moderator", "leader"].includes(e.tag) : ["moderator", "leader"].includes(e.tag)
    let allowed = (await allowedPeople.findById("6270b923564c64eb5ed912a4")).allowed.find(e => e.name == token.username && query(e) && query2(e))
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

// notifications

app.use("/notifications", require("./scripts/notifications.js")({ getDetails, getCookie, mailSchema, submitSchema }))

///

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

app.post("/editrecordcomp/:level/:id", async (req, res) => {
  let data = {}
  let approved = await hasAccess(false, req, res, true)
  if(!approved) return res.render("404.ejs")
  let level = await levelsSchema.findOne({name: req.params.level})
  req.params.id = parseInt(req.params.id)
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Plese input a valid level name!"})
  let record = level.list[req.params.id]
  if(!record) return res.render("404.ejs", {error: "400 Bad Request", message: "Record number out of range."})
  data.old = record
  let message = `The following record by the name ${record.name} on the level ${level.name} has been updated:\n`
  for(const key in req.body) {
    if(key != "pos") {
    record[key] = req.body[key]
      message += `${key}: ${req.body[key]}\n`
    }
  }
  data.new = record
  level.list.splice(req.params.id, 1)
  level.list.splice(req.params.id, 0, record)
  if(req.params.id != req.body.pos-1) {
    if(req.params.id > req.body.pos-1) {
    level.list.splice(req.body.pos-1, 0, record)
    level.list.splice(req.params.id+1, 1)
  } else {
    level.list.splice(req.body.pos, 0, record)
   level.list.splice(req.params.id, 1) 
  }
    message += `pos: ${req.body.pos}`
  }
  await level.save()
  webhook(message, null, {
    event: "RECORD_EDIT",
    data
  })
  res.redirect(req.headers.referer)
})

app.post("/editrecordprog/:level/:id", async (req, res) => {
  let data = {}
   let approved = await hasAccess(false, req, res, true)
  if(!approved) return res.render("404.ejs")
  let level = await levelsSchema.findOne({name: req.params.level})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Plese input a valid level name!"})
  let record = level.progresses[req.params.id]
  if(!record) return res.render("404.ejs", {error: "400 Bad Request", message: "Record number out of range."})
  data.old = record
  let message = `The following record by the name ${record.name} on the level ${level.name} has been updated:\n`
  for(const key in req.body) {
    if(key != "pos") {
    record[key] = req.body[key]
      message += `${key}: ${req.body[key]}`
    }
  }
  data.new = record
  level.progresses.splice(req.params.id, 1)
  level.progresses.splice(req.params.id, 0, record)
  webhook(message, null, {
    event: "RECORD_DELETE",
    data
  })
  await level.save()
  res.redirect(req.headers.referer)
})

///

// settings

app.use("/settings", require("./scripts/settings.js")({allowedPeople, hasAccess, getDetails, getCookie}))

// sheets

app.use("/sheets", require("./scripts/sheets")({ hasAccess, getDetails, getCookie, opinionSchema, levelsSchema }))

///

app.post("/edit61hzlevel/:name", async(req, res) => {
  let data = {}
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let level = await sixtyoneSchema.findOne({name: req.params.name})
  data.old = level
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
   let message = `The following info on the 61hz+ level ${level.name} has been changed:\n`
   for(const key in req.body) {
     level[key] = req.body[key]
     message += `${key}: ${req.body[key]}\n`
   }
  await level.save()
  data.new = level
  if(req.body.placement != level.position) {
  var everything = await sixtyoneSchema.find().sort({position: 1})
  var index = everything.findIndex(e => e._id == level._id.toString())
    if(req.body.placement == 0 || req.body.placement > everything.length) return res.render("404.ejs", {error: "400 Bad Request", message: `Please input a valid placement between 1 and ${everything.length+1}!`})
    everything[index].position = req.body.placement
   await everything[index].save()
    message += `placement: #${index+1} to #${req.body.placement}`
    let start = index+1 > req.body.placement ? req.body.placement-1 : index
    let end = index+1 < req.body.placement ? index+1 : req.body.placement
  for(let i = start; i < end; i++) {
   await sixtyoneSchema.findOneAndUpdate({name: everything[i].name}, {
     $set: {
       position: i+1
     }
   })
  }
}
  webhook(message, null, {
    event: "61_HERTZ_LEVEL_CHANGE",
    data
  })
  res.redirect(req.headers.referer)
})

app.post("/editlevel/:name", async(req, res) => {
  let data = {}
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let level = await levelsSchema.findOne({name: req.params.name})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  data.old = level
  let message = `The following info on the level ${level.name} has been changed:\n`
   for(const key in req.body) {
     level[key] = req.body[key]
     if(key != "position") {
     message += `${key}: ${req.body[key]}\n`
     }
   }
  await level.save()
  data.new = level
  if(req.body.placement != level.position) {
    
    req.body.placement = parseInt(req.body.placement)
  var everything = await levelsSchema.find().sort({position: 1})
  var index = everything.findIndex(e => e._id == level._id.toString())
    if(req.body.placement == 0 || req.body.placement > everything.length) return res.render("404.ejs", {error: "400 Bad Request", message: `Please input a valid placement between 1 and ${everything.length+1}!`})
    everything[index].position = req.body.placement
    await everything[index].save()
    message += `placement: #${index+1} to #${req.body.placement}`
    let start = index+1 > req.body.placement ? req.body.placement-1 : index
    let end = index+1 < req.body.placement ? index+1 : req.body.placement
  for(let i = start; i < end; i++) {
   await levelsSchema.findOneAndUpdate({name: everything[i].name},   {
     $set: {
       position: i+2
     }
   })
  }
}
  webhook(message, null, {
    event: "LEVEL_EDIT",
    data
  })
  res.redirect(req.headers.referer)
})

///

app.route("/login")
.post(async (req, res) => {
  const user = await loginSchema.findOne({name: req.body.name})
  if(user) {
    let isSame = await bcrypt.compare(req.body.password, user.password)
    if(!isSame) {
      res.json({status: 404, message: "It seems like you did not input the correct password for this account! If you are the account holder, please contact us so that we can reset your password!"})
    } else {
      let token = jwt.sign({username: req.body.name, password: req.body.password}, process.env.WEB_TOKEN, {
        expiresIn: "7d"
      })
      return res.json({status: 200, authCode: token})
    }
  } else {
     res.json({status: 404, message: "It seems like this account does not exist yet! Please sign up to make an account"})
  }
})

app.route("/signup")
.post(async (req, res) => {
  if(req.body.password != req.body.password2) return res.json({status: 404, message: "Your passwords do not match!"})
  const user = await loginSchema.findOne({name: req.body.name})
  if(user) {
     res.json({status: 404, message: "This account already exists! Please log in instead."})
  } else {
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
await loginSchema.create({name: req.body.name, password: hashedPassword})
     let token = jwt.sign({username: req.body.name, password: req.body.password}, process.env.WEB_TOKEN, {expiresIn: "7d"})
return res.json({status: 200, authCode: token})
  }
})

app.get("/everything", async (req, res) => {
  let approved = await hasAccess(true, req, res);   if(!approved) return res.render("404.ejs")
  return res.render("../misc/main.ejs", {APIKEY: APIKey})
})

// searching for stuff

app.use("/search", require("./scripts/search.js")({ hasAccess, getDetails, levelsSchema, leaderboardSchema }))

// discord

app.use("/roles/packs", require("./scripts/role_packs")({hasAccess, rolePacksSchema }))

// socials

app.use("/socials", require("./scripts/socials")({ hasAccess, leaderboardSchema, getDetails, getCookie, fetchUser, webhook }))

// nationalities

app.route("/nationalities/add")
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
  return res.render("../nationalities/add.ejs", {key: APIKey, loggedIn, editing, editable})
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
  var player = await leaderboardSchema.findOne({name: req.body.name.trim()})
  if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
  const message = `The nationality of ${player.name} has been changed from ${!player.nationality ? "nothing" : player.nationality.trim()} to ${req.body.nationality.trim()}`
  webhook(message, null, {
    event: "PROFILE_NATIONALITY_ADD",
    data: {
      name: player.name,
      nationality: {
        previously: !player.nationality ? "nothing" : player.nationality.trim(),
        now: req.body.nationality.trim()
      }
    }
  })
  player.nationality = req.body.nationality.trim()
  await player.save()
  return res.render("added.ejs", {text: "nationality", type: "added", loggedIn, editing, editable})
})

app.route("/nationalities/delete")
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
  return res.render("../nationalities/delete.ejs", {key: APIKey, loggedIn, editing, editable})
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
  var player = await leaderboardSchema.findOne({name: req.body.name.trim()})
  if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
  const message = `The nationality of ${player.name} has been deleted. (nationality: ${player.nationality.trim()})`
  console.log(player.nationality.trim())
  player.nationality = undefined
  await player.save()
  webhook(message, null, {
    event: "PROFILE_NATIONALITY_DELETE",
    data: {
      name: player.name,
      nationality: "nothing"
    }
  })
  return res.render("added.ejs", {text: "nationality", type: "deleted", loggedIn, editing, editable})
})

// regular levels

app.route("/addlevel")
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
  return res.render("../adding/addlevel.ejs", {key: APIKey, loggedIn, editing, editable})
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
  var obj = {
    name: req.body.username.trim(),
    link: req.body.link.trim(),
    hertz: req.body.hertz.trim()
  }
  req.body.list = [obj]
  req.body.progresses = ["none"]
  if(!req.body.minimumPercent) {
    delete req.body.minimumPercent
  }
  if(req.body.placement < 76 && !req.body.minimumPercent) return res.render("404.ejs", {error: "400 Bad Request", message: "This placement requires a minimum percent to be included!"})
  req.body.name = req.body.name.trim()
  req.body.ytcode = req.body.ytcode.trim()
  req.body.publisher = req.body.publisher.trim()
  req.body.position = req.body.placement-1
  var newlev = new levelsSchema(req.body)
  var player = await leaderboardSchema.findOne({name: obj.name})
    if(!player) {
      await leaderboardSchema.create({name: obj.name, levels: [newlev.name], progs: ["none"]})
    } else {
      player.levels.push(newlev.name)
    await  player.save()
    }
 await levelsSchema.insertMany([newlev])
  let everything = await levelsSchema.find().sort({position: 1})
  for(let i = 0; i < everything.length; i++) {
    await levelsSchema.findOneAndUpdate({name: everything[i].name},   {
     $set: {
       position: i+1
     }
   })
  }
  webhook(`A new level by the name of ${newlev.name} has been added at #${req.body.placement}. (completion: [${obj.name} on ${obj.hertz}${isNaN(obj.hertz) ? "" : "hz"}](${obj.link}))`, null, {
    event: "LEVEL_ADD",
    data: {
      name: newlev.name,
      placement: req.body.placement,
      completion: {
        name: obj.name,
        link: obj.link,
        hertz: obj.hertz
      }
    }
  })
  return res.render("added.ejs", {text: "level", type: "added", loggedIn, editing, editable})
})

app.route("/editposition")
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  var level = await levelsSchema.findOne({name: req.body.name.trim()})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  var everything = await levelsSchema.find().sort({position: 1})
  var index = everything.findIndex(e => e._id == level._id.toString())
  if(index+1 > req.body.new) {
everything.splice(req.body.new-1, 0, everything[index])
    everything.splice(index+1, 1)
  } else {
    everything.splice(req.body.new, 0, everything[index])
    everything.splice(index, 1)
  }
  for(let i = 0; i < everything.length; i++) {
    everything[i]._id = i+1
  }
  await levelsSchema.deleteMany()
  await levelsSchema.insertMany(everything)
  webhook(`The level **${req.body.name.trim()}** has been moved from #${index+1} to #${req.body.new}`, null)
  return res.render("added.ejs", {text: "Level", type: "moved"})
})

app.route("/deletelevel/:name") 
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  req.body.name = req.params.name
  var level = await levelsSchema.findOne({name: req.body.name.trim()})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  for(let i = 0; i < level.list.length; i++) {
    var player = await leaderboardSchema.findOne({name: level.list[i].name})
    if(player) {
      player.levels = player.levels.filter(e => e != level.name)
      await player.save()
      if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
    } else {
      console.log(level.list[i].name)
    }
  }
  if(level.progresses) {
    if(level.progresses[0] != "none") {
      for(let i = 0; i < level.progresses.length; i++) {
    var player = await leaderboardSchema.findOne({name: level.progresses[i].name})
    if(player) {
      player.progs = player.progs.filter(e => e.name != level.name)
      if(player.progs.length == 0) {
        player.progs[0] = "none"
      }
      await player.save()
      if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
    } else {
      console.log(level.progresses[i].name)
    }
  }
    }
  }
  if(req.body.reason != "") {
    var everything = await levelsSchema.find().sort({position: 1})
    let obj4 = {
      position: everything.length+1,
      name: level.name,
      ytcode: level.ytcode,
      removalDate: dayjs(Date.now()).format("MMMM D, YYYY"),
      formerRank: level.position,
      publisher: level.publisher,
      list: [
      {
          "name": "Removed",
          "link": ` ${req.body.reason.trim()}`,
          "hertz": "60"
      }
    ]
  }
     await levelsSchema.create(obj4)
    await levelsSchema.findByIdAndDelete(level._id.toString())
  } else {
    await levelsSchema.findOneAndDelete({name: req.body.name.trim()})
  }
  var everything = await levelsSchema.find().sort({position: 1})
  for(let i = level.position-1; i < everything.length; i++) {
    await levelsSchema.findOneAndUpdate({name: everything[i].name},   {
     $set: {
       position: i+1
     }
   })
  }
  webhook(`A level by the name of ${req.body.name.trim()} has been deleted. (reason: ${req.body.reason ? req.body.reason.trim() : "not provided"})`, {
    event: "LEVEL_DELETE",
    data: {
      name: req.body.name.trim(),
      reason: req.body.reason ? req.body.reason.trim() : "not provided"
    }
  })
  res.redirect(req.headers.referer)
})

// 61hz+ levels

app.route("/edit61hzrecord/:name/:id")
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let level = await sixtyoneSchema.findOne({name: req.params.name})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  let index = level.list.findIndex(e => e._id == req.params.id) 
  if(index == -1) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid Object ID!"})
  for(const key in req.body) {
  level.list[index][key] = req.body[key]
  }
  await level.save()
  res.redirect(req.headers.referer)
})

app.route("/add61hertzlevel")
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
  return res.render("../adding/add61hz+level.ejs", {key: APIKey, loggedIn, editing, editable})
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
  var obj = {
    name: req.body.username.trim(),
    link: req.body.link.trim(),
    hertz: req.body.hertz.trim()
  }
  let everything = await sixtyoneSchema.find().sort({position: 1})
  let above = everything.findIndex(e => e.name == req.body.above)
  var newlev = new sixtyoneSchema({name: req.body.name.trim(), ytcode: req.body.ytcode.trim(), ranking: req.body.ranking.trim(), minimumPercent: 57, publisher: req.body.publisher.trim(), list: [obj], progresses: ["none"], position: above})
  if(above == -1) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level 61hz for it to be above!"})
  await sixtyoneSchema.insertMany([newlev])
  everything = await sixtyoneSchema.find().sort({position: 1})
  for(let i = 0; i < everything.length; i++) {
    await sixtyoneSchema.findOneAndUpdate({name: everything[i].name},   {
     $set: {
       position: i+1
     }
   })
  }
  webhook(`A 61hz+ level by the name of ${newlev.name} has been added, and has a difficulty of ${newlev.ranking}. (completion: [${obj.name} on ${obj.hertz}${isNaN(obj.hertz) ? "" : "hz"}](${obj.link}))`, {
    event: "61_HERTZ_LEVEL_ADD",
    data: {
      name: newlev.name,
      ranking: newlev.ranking,
      completion: obj
    }
  })
  return res.render("added.ejs", {text: "61hertz+ level", type: "added", loggedIn, editing, editable})
})

app.route("/delete61hertz/:name")
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  req.body.name = req.params.name
  var level = await sixtyoneSchema.findOne({name: req.body.name.trim()})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  await sixtyoneSchema.findOneAndDelete({name: req.body.name.trim()})
  let everything = await sixtyoneSchema.find().sort({position: 1})
  for(let i = level.position-1; i < everything.length; i++) {
    await sixtyoneSchema.findOneAndUpdate({name: everything[i].name},   {
     $set: {
       position: i+1
     }
   })
  }
  webhook(`A 61hz+ level by the name of ${req.body.name.trim()} has been deleted.`, null, {
    event: "61_HERTZ_LEVEL_DELETE",
    data: {
      name: req.body.name.trim()
    }
  })
  res.redirect(req.headers.referer)
}) 

app.route("/move61hzlevel/:name")
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
  return res.render("../deleting/move61hzlevel.ejs", {key: APIKey, editing, loggedIn, editable})
}) 
.post(async (req, res) => {
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
  let level = await sixtyoneSchema.findOne({name: req.body.name})
  if(!level) return res.render("404.ejs")
  await request("https://gdlrrlist.com/addlevel", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
       name: req.body.name,
      ytcode: level.ytcode,
      minimumPercent: req.body.minimumPercent,
      publisher: level.publisher,
      placement: req.body.placement,
      username: level.list[0].name,
      link: level.list[0].link,
      hertz: level.list[0].hertz
    })
  })
  await request(`https://gdlrrlist.com/delete61hertz/${level.name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  })
  res.redirect(req.headers.referer)
})

// records

app.route("/deletesub")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res, true);   if(!approved) return res.render("404.ejs")
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(loggedIn) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  return res.render("../deleting/deletesub.ejs", {key: APIKey, editing, loggedIn, editable})
})
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res, true);   if(!approved) return res.render("404.ejs")
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(loggedIn) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  let message;
  let level = await levelsSchema.findOne({name: req.body.demon.trim()})
  if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  if(req.body.progress < 100) {
    let record = level.progresses.findIndex(e => e.name == req.body.username.trim() && e.percent == req.body.progress)
    var player = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(record == -1) return res.render("404.ejs", {message: "This record does not exist!"})
    message = `A progess of the level ${level.name} by [${player.name}](${level.progresses[record].link}) has been deleted. (Progress: ${level.progresses[record].percent}%)`
    level.progresses = level.progresses.filter(e => e.name != req.body.username.trim() || e.percent != req.body.progress)
    if(level.progresses.length == 0) {
      level.progresses = ["none"]
    }
    if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
    player.progs = player.progs.filter(e => e.name != level.name || e.percent != req.body.progress)
    if(player.progs.length == 0) {
      player.progs = ["none"]
    }
    await level.save()
    await player.save()
    if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
  } else if(req.body.progress == 100) {
    let record = level.list.findIndex(e => e.name == req.body.username.trim())
    if(record == -1) return res.render("404.ejs", {message: "This record doesn't exist!"})
    var player = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(!player) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid player name!"})
    message = `A completion of the level ${level.name} by [${player.name}](${level.list[record].link}) has been deleted. `
    level.list = level.list.filter(e => e.name != req.body.username.trim())
    if(level.list.length == 0) {
      level.list = ["none"]
    }
    player.levels = player.levels.filter(e => e != level.name)
    await level.save()
    await player.save()
    if(player.levels.length + player.progs.length == 0 || !player.levels[0] && player.progs[0] == "none") {
      await leaderboardSchema.findByIdAndDelete(player._id.toString())
    }
  }
  webhook(message, null, {
    event: "RECORD_DELETE",
    data: {
      name: req.body.username.trim(),
      level: req.body.demon.trim(),
      progress: req.body.progress,
      link: req.body.video.trim(),
      hertz: req.body.hertz.trim()
    }
  })
  return res.render("added.ejs", {text: "submission", type: "deleted", editing, loggedIn, editable})
})

app.route("/add")
.get(async (req, res) => {
  let approved = await hasAccess(true, req, res, true);   if(!approved) return res.render("404.ejs")
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(loggedIn) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  if(req.query.record) {
    try {
      let info = await submitSchema.findById(req.query.record)
      if(info) {
        return res.render("../adding/addsub.ejs", {key: APIKey, loggedIn, editing, editable, info})
      }
    } catch(_) {
      
    }
  }
  return res.render("../adding/addsub.ejs", {key: APIKey, loggedIn, editing, editable})
})
.post(async (req, res) => {
  let approved = await hasAccess(false, req, res, true);   if(!approved) return res.render("404.ejs")
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(loggedIn) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  var level = await levelsSchema.findOne({name: req.body.demon})
  var user = await leaderboardSchema.findOne({name: req.body.username.trim()})
    if(!level) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid level name!"})
  if(!user) {
   user = await leaderboardSchema.create({name: req.body.username.trim(), levels: [], progs: ["none"]})
  }


    var obj = {
      name: req.body.username.trim(),
      link: req.body.video.trim(),
      hertz: req.body.hertz.trim()
    }
  if(obj.hertz.toLowerCase() == "mobile") return res.render("404.ejs", {error: "400 Bad Request", message: "Did you mean to input 'M'? lol!"}) 
  if(req.body.progress < 100) {
    var everything = await levelsSchema.find().sort({position: 1})
    if(everything.findIndex(e => e.name == level.name) > 74) return res.render("404.ejs", {error: "400 Bad Request", message: "This level does not have a listpercent!"})
    obj.percent = req.body.progress
    level.progresses = level.progresses.filter(e => e.name != obj.name)
    if(level.progresses[0] != "none") {
      await level.progresses.push(obj)
    } else {
      level.progresses[0] = obj
    }
    await level.save()
    user.progs = user.progs.filter(e => e.name != level.name)
    if(user.progs[0]) {
      if(user.progs[0] != "none") {
        user.progs.push({name: level.name, percent: obj.percent})
      } else {
        user.progs[0] = {name: level.name, percent: obj.percent}
      }
    } else {
        user.progs.push({name: level.name, percent: obj.percent})
    }
    await user.save()
  } else if(req.body.progress == 100) {
    if(level.list[0] != "none") {
       level.list.push(obj)
    } else {
      level.list[0] = obj
    }
    level.progresses = level.progresses.filter(e => e?.name != obj.name)
    if(!level.progresses[0]) {
      level.progresses[0] == "none"
    }
    await level.save()
    if(user.levels[0]) {
      if(user.levels[0] != "none") {
        user.levels.push(level.name)
      } else {
        user.levels[0] = level.name
      }
    } else {
        user.levels.push(level.name)
    }
    user.progs = user.progs.filter(e => e.name != level.name)
    if(!user.progs[0]) {
      user.progs[0] == "none"
    }
    await user.save()
  } else {
    return res.render("404.ejs", {error: "400 Bad Request", message: "Percentage out of range."})
  }
  webhook(`A completion / progress has been added on the level ${level.name}. (submission: [${req.body.progress}% by ${obj.name} on ${obj.hertz}](${obj.link}))`, null, {
    event: "RECORD_ADD",
    data: {
      name: obj.name,
      level: req.body.demon.trim(),
      progress: req.body.progress,
      link: obj.link,
      hertz: obj.hertz
    }
  })
  if(req.query.record) {
    try {
      let something = await submitSchema.findById(req.query.record)
  if(something) {
  webhook("A submission has been archived!", [{description: `A submission by ${something.username} has been archived. (submission: [${something.demon} ${something.progress}% on ${something.hertz}](${something.video}), comments: ${something.comments || "none"})`}], {
    event: "SUBMISSION_ARCHIVE",
    data: something
  })
  something.status = "accepted"
    await something.save()

      await request("https://gdlrrlist.com/api/v1/client/notifications", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          'authorization': `User ${getCookie("token", req)}`
        },
        body: JSON.stringify({
          subject: `Information about your ${something.demon} ${something.progress}% submission`,
          message: `Your submission has been accepted by the LRR List Moderators! Submission: ${something.demon} ${something.progress}%`,
          to: something.account
        })
      })
  }
    } catch(_) {
      
    }
  }
  let addedRecord = true
  return res.render("added.ejs", {text: "submission", type: "added", loggedIn, editing, editable, addedRecord})
})

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
  return res.render("../adding/changename.ejs", {key: APIKey, loggedIn, editing, editable})
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

app.get("/submissions/archive", async (req, res) => {
  const submissions = await request(`https://gdlrrlist.com/api/v1/client/submissions`, {
    headers: {
      authorization: `Helper ${getCookie("token", req)}`
    }
  })
  let json = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", json)
  }
  let {loggedIn, editing, editable} = await getDetails(req)
  json = json.filter(e => e.status != "pending")
  return res.render("../submissions/submissions.ejs", {amount: json.length, text: json.map(e => e = e.username), APIKey: APIKey, loggedIn, editing, editable })
})

app.get("/submissions/archive/:num", async (req, res) => {
   const submissions = await request(`https://gdlrrlist.com/api/v1/client/submissions`, {
    headers: {
      authorization: `Helper ${getCookie("token", req)}`
    }
  })
  let json = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", json)
  }
  let {loggedIn, editing, editable} = await getDetails(req)
  let obj = json.filter(e => e.status != "pending")[req.params.num-1]
  if(!obj) return res.render("404.ejs", {error: "400 BAD REQUEST", message: "Submission number out of range."})

  obj.number = req.params.num
  obj.loggedIn = loggedIn
  obj.editable = editable
  obj.editing = editing
  let reg  = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/
  obj.embed = obj.video.trim().match(reg) ? `https://www.youtube.com/embed/${reg.exec(obj.video.trim())[1]}`: obj.video
  return res.render("../submissions/each.ejs", obj)
})

app.post("/delete/:id", async (req, res) => {
  let approved = await hasAccess(false, req, res, true);     if(!approved) return res.render("404.ejs")
  let loggedIn = await findToken(req)
  let editing = false
  let editable = false
  if(loggedIn) {
    editable = true
    if(getCookie("editing", req) == "true") {
    editing = true
  }
  }
  var something = await submitSchema.findById(req.params.id)
  if(!something) return res.render("404.ejs", {error: "400 Bad Request", message: "Please input a valid Object ID!"})
  webhook("A submission has been archived!", [{description: `A submission by ${something.username} has been archived. (submission: [${something.demon} ${something.progress}% on ${something.hertz}](${something.video}), comments: ${something.comments || "none"})`}], {
    event: "SUBMISSION_ARCHIVE",
    data: something
  })
  something.status = "denied"
  await something.save()
  try {
    await request("https://gdlrrlist.com/api/v1/client/notifications", {
        method: "POST",
        headers: {
          'content-type': 'application/json',
          'authorization': `User ${getCookie("token", req)}`
        },
        body: JSON.stringify({
          subject: `Information about your ${something.demon} ${something.progress}% submission`,
          message: `Your submission has been rejected by the LRR List Moderators. If you have questions about why your record was denied, please email me.`,
          to: something.account
        })
      })
    } catch(_) {
    
  }
  return res.redirect("/submissions")
})

app.get("/submissions/:num", async (req, res) => {
  const submissions = await request(`https://gdlrrlist.com/api/v1/client/submissions?num=${req.params.num}`, {
    headers: {
      authorization: `Spectator ${getCookie("token", req)}`
    }
  })
  let obj = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", obj)
  }
   let {loggedIn, editing, editable} = await getDetails(req)
  obj.number = req.params.num
  obj.loggedIn = loggedIn
  obj.editable = editable
  obj.editing = editing
  let reg  = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/
  obj.embed = obj.video.trim().match(reg) ? `https://www.youtube.com/embed/${reg.exec(obj.video.trim())[1]}`: obj.video
  return res.render("../submissions/each.ejs", obj)
})

app.get("/submissions", async (req, res) => {
 // let approved = await hasAccess(true, req, res, true);   if(!approved) return res.render("404.ejs")
  const submissions = await request('https://gdlrrlist.com/api/v1/client/submissions', {
    headers: {
      authorization: `Spectator ${getCookie("token", req)}`
    }
  })
  let json = await submissions.body.json()
  if(submissions.statusCode != 200) {
    return res.render("404.ejs", json)
  }
   let {loggedIn, editing, editable} = await getDetails(req)
  return res.render("../submissions/submissions.ejs", {amount: json.length, text: json.map(e => e = e.username), APIKey: APIKey, loggedIn, editing, editable, active: "submissions" })
})

app.route("/ban")
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
  return res.render("../bans/addban.ejs", {loggedIn, editing, editable})
})
.post(async (req, res) => {

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
  let ban_times = {
    "1": 7776000000,
    "2": 15552000000,
    "3": 31536000000,
    "4": "permanent"
  }
  let user = await leaderboardSchema.findOne({name: req.body.username})
  if(!user) return res.render("404.ejs", {error: "400f Bad Request", message: "Invalid user provided!"})
  req.body.ban_time = ban_times[req.body.ban_time]
  user.ban = true
  user.ban_reason = req.body.reason ?? "A reason was not provided"
  if(req.body.ban_time != "permanent") {
  user.ban_time = new Date(Date.now()+req.body.ban_time).toISOString()
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
  } else {
    user.ban_time = "permanent"
  }
  await user.save()
  webhook(`A leaderboard profile by the name of ${req.body.username} has been banned ${!isNaN(req.body.ban_time) ?  `for ${req.body.ban_time / 86400000} days` : "permanently"}`, null, {
    event: "PROFILE_BAN_ADD",
    data: {
      name: req.body.username,
      reason: req.body.reason ?? "A reason was not provided",
      time: !isNaN(req.body.ban_time) ?  `for ${req.body.ban_time / 86400000} days` : "permanently",
    }
  })
    return res.render("added.ejs", {text: "user", type: "banned", loggedIn, editing, editable})
})

app.route("/ban/:id")
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
  let everything = await leaderboardSchema.find({ban: true})
  if(isNaN(req.params.id)) return res.render("404.ejs", {error: "400 Bad Request", message: "Please include a valid ban number!"})
  if(!everything[parseInt(req.params.id)-1]) return res.render("404.ejs", {error: "400 Bad Request", message: "Ban number out of range!"})
  return res.render("../bans/viewban.ejs", everything[parseInt(req.params.id)-1])
})

app.get("/bans", async (req, res) => {
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
  let everything = await leaderboardSchema.find({ban: true})
  let obj = []
  for(let i = 0; i < everything.length; i++) {
    obj.push(everything[i].name)
  }
   return res.render("../bans/viewbans.ejs", {amount: everything.length, text: obj, loggedIn, editing, editable, active: "bans" })
})

app.get("/bans/delete/:id", async (req, res) => {
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
  try {
    let person = await leaderboardSchema.findById(req.params.id)
    if(!person) return res.render("404.ejs", {error: "400 Bad Request", message: "Invalid Object ID provided!"})
    person.ban = undefined
    person.ban_time = undefined
    person.ban_reason = undefined
    await person.save()
    webhook(`A leaderboard profile by the name of ${person.name} has been unbanned`, null, {
      event: "PROFILE_BAN_REMOVE",
      data: {
        name: person.name
      }
    })
  } catch(_) {
    return res.render("404.ejs", {error: "400 Bad Request", message: "Invalid Object ID provided!"})
  }
   return res.redirect("/bans")
})

app.post("/submissions/status",async (req, res) => {
  let submit = await request("https://gdlrrlist.com/api/helper/submissions/mod", {
    headers: {
      'content-type': "application/json",
      authorization: `Helper ${getCookie("token", req)}`
    },
    method: "PATCH",
    body: JSON.stringify(req.body),
  })
  let body = await submit.body.json()
  if(submit.statusCode != 200) {
    return res.render("404.ejs", body)
  }
  return res.redirect("/submissions")
})

app.all('*', (req, res) =>{
  return res.render("404.ejs")
})

http_server.listen(undefined)