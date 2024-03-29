const config = require("../config.json")
const { default: mongoose } = require("mongoose")
const webpush = require('web-push')
const {validFields, docMaker} = require("../functions")
const allowedPeople = require("../../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const opinionSchema = require("../../schemas/opinions.js")
const levelsSchema = require("../../schemas/levels.js")
const dayjs = require("dayjs")
const submitSchema = require("../../schemas/submissions.js")
const loginSchema = require("../../schemas/logins.js")
const messagesSchema = require("../../schemas/direct_messages.js")
const bcrypt = require("bcrypt")
const path = require("path")
let routes = {}
const {REST} = require("@discordjs/rest")
const {Routes} = require("discord-api-types/v10")
const rest = new REST({version: '10'}).setToken(process.env.discord_token);

webpush.setVapidDetails(
  'https://gdlrrlist.com',
  process.env.vapid_public,
  process.env.vapid_private
)

module.exports = (authFunction, webhook, rate_lim, send) => {
  async function authenticator(req, res, next) {
      let path = req.url.split("?")[0]
    if(Object.keys(req.params).length) {
      for(const key in req.params) {
        path = path.replace(req.params[key], ":"+key)
      }
    }
  if(!routes[path]) return next()
  if(!routes[path][req.method.toLowerCase()]) return res.status(405).json({error: config["405"][0], message: config["405"][1]})
    let correct_auth = await authFunction(req, res)
  if(!correct_auth) {
    return res.status(401).json({error: config["401"][0], message: config["401"][1]})
  }
  next()
}
  const express = require("express")
const router = express.Router()
router.use(express.urlencoded({ extended: true }))


router.route("/login")
.post(rate_lim(600000, 1), validFields({name: "password", type: String, description: ""}, {name: "name", type: String, description: ""}), async (req, res) => {
  if(req.headers.authorization) return res.status(400).json({error: config["400"], message: "Please input an empty authorization header!"})
  // if(!req.body.password || !req.body.name) return res.status(400).json({error: config["400"], message: "Please input a 'name' and 'password' field for your request!"})
  const user = await loginSchema.findOne({name: req.body.name})
  if(user) {
    let isSame = await bcrypt.compare(req.body.password, user.password)
    if(!isSame) {
      res.status(400).json({error: config["400"], message: "It seems like you did not input the correct password for this account! If you are the account holder, please contact us so that we can reset your password!"})
    } else {
      let token = jwt.sign({id: user._id.toString()}, process.env.WEB_TOKEN, {noTimestamp: true})
      return res.json({authCode: token})
    }
  } else {
     res.status(400).json({error: config["400"], message: "It seems like this account does not exist yet! Please sign up to make an account"})
  }
})
.patch(authenticator, rate_lim(60000, 1), async (req, res) => {
let token = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let curUser = await loginSchema.findById(token.id)
  if(['discord', 'google'].includes(req.body.remove)) {
    curUser[req.body.remove] = undefined
    await curUser.save()
    return res.sendStatus(204)
  }
  if(req.body.discord) {
    if(req.body.secret != process.env.secret) res.status(400).json({error: config["401"][0], message: config["401"][1]})
    let user = await loginSchema.findOne({discord: req.body.discord})
    if(!user) return res.status(400).json({error: config["400"], message: "I could not find a discord ID linked to this account!"})
  }
  
  let {name, password} = await loginSchema.findById(token.id)
  if(['true', 'false'].includes(req.body.full_page_lead?.toString())) {
    let user = await loginSchema.findById(token.id)
    user.full_page_lead = req.body.full_page_lead
    await user.save()
    return res.sendStatus(204)
  }
  if(['true', 'false'].includes(req.body.pc_info?.toString())) {
    let user = await loginSchema.findById(token.id)
    user.pc_info = req.body.pc_info
    await user.save()
    return res.sendStatus(204)
  }
  if(['true', 'false'].includes(req.body.mail_notifs?.toString())) {
    let user = await loginSchema.findById(token.id)
try {
    let {id} = await rest.post("/users/@me/channels", {
          body: {
            recipient_id: user.discord
          }
        })
       let response_rest = await rest.post(Routes.channelMessages(id), {
          body: {
            content: `Test`
          }
        })
    if(!response_rest.errors) {
      user.dm_channel = id
    }
    user.mail_notifs = req.body.mail_notifs
    await user.save()
    return res.sendStatus(204)
} catch(_) {
  return res.status(400).json({error: config["400"], message: "I cannot send a message to your discord account!"})
}
  }
  if(req.body.password){
  let compare = await bcrypt.compare(req.body.password, password)
  if(compare) return res.status(400).json({error: config["400"], message: "Please actually include a new password silly!"}) 
    token = jwt.sign({id: token.id}, process.env.WEB_TOKEN, {noTimestamp: true})
  let hashedPass = await bcrypt.hash(req.body.password, 10)
  let user = await loginSchema.findById(token.id)
  user.password = hashedPass
  await user.save()
  return res.json({authCode: token})
}
       return res.status(400).json({error: config["400"], message: "Please input a property value to change for your lrr profile!"})
})
.delete(authenticator, async (req, res) => {
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  await loginSchema.findByIdAndDelete(id)
  return res.sendStatus(204)
})
.get(authenticator, async (req, res) => {
  let everyone = await loginSchema.find()
  let mods = await allowedPeople.findById("6270b923564c64eb5ed912a4")
  let allowed = (person) => !!mods.allowed.find(e => e.name == person && e.tag != "spectator") 
  let array = everyone.map(e => e = {
    name: e.name,
    mod: allowed(e.name)
  })
  res.json(array)
})

router.post("/signup", validFields({name: "password", type: String, description: ""}, {name: "password2", type: String, description: ""}, {name: "name", type: String, description: ""}), async (req, res) => {
  if(req.body.password != req.body.password2) return res.status(400).json({error: config["400"], message: "Your passwords do not match!"})
  const user = await loginSchema.findOne({name: {$eq: req.body.name, $ne: ""}})
  if(user) {
     res.status(400).json({status: config["400"], message: "This account already exists! Please log in instead."})
  } else {
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
user = await loginSchema.create({name: req.body.name, password: hashedPassword})
     let token = jwt.sign({id: user._id.toString()}, process.env.WEB_TOKEN, {noTimestamp: true})
return res.status(201).json({authCode: token})
  }
})



router.route("/submissions")
.get(authenticator, async (req, res) => {
  let auth = req.headers.authorization.split(" ")
  if(auth[0] == "User") {
    let {id} = jwt.verify(auth[1], process.env.WEB_TOKEN)
    let {name: username} = await loginSchema.findById(id)
    let everything = await submitSchema.find({account: username})
    if(req.query.num) {
      if(!everything[req.query.num-1]) return res.status(400).send({error: config["400"], message: "Submission number out of range."})
      everything = everything[req.query.num-1]
    }
    return res.json(everything)
  } else if(auth[0] == "Spectator") {
    let everything = await submitSchema.find({status: "pending"})
    if(req.query.num) {
      if(!everything[req.query.num-1]) return res.status(400).send({error: config["400"], message: "Submission number out of range."})
      everything = everything[req.query.num-1]
    }
    return res.json(everything)
  } else {
    let everything = await submitSchema.find()
    if(req.query.num) {
      if(!everything[req.query.num-1]) return res.status(400).send({error: config["400"], message: "Submission number out of range."})
      everything = everything[req.query.num-1]
    }
    return res.json(everything)
  }
})
.post(authenticator, rate_lim(60000,1), validFields({name: "demon", type: String, description: "The name of the demon you want to submit."}, {name: "username", type: String, description: "The player who wants to submit this record."}, {name: "video", type: "URL", description: "The URL of the progress / completion video"}, {name: "comments", type: String, description: "Additional comments the user can add.", optional: true}, {name: "hertz", type: String, description: "The refresh rate the person got this record on."}, {name: "progress", type: Number, description: "The progress this person got on this level."}, {name: "raw", type: "URL", description: "The raw footage of the player playing the level.", optional: true}), async (req, res) => {
  req.body.status = "pending"
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let current_user = await loginSchema.findById(id)
  req.body.account = current_user.name
  req.body.date = dayjs(Date.now()).format("MMMM D, YYYY h:mm:ss A")
  let dupe = await submitSchema.findOne({video: req.body.video.trim()})
  if(dupe) return res.status(400).json({error: config["400"], message: "The link you inputted is already in this database, so can you PLEASE be patient? Thanks :)"})
  let hasSubmitted = await submitSchema.findOne({demon: {$regex: new RegExp(`\\b${req.body.demon}\\b`, 'i')}, username: {$regex: new RegExp(`\\b${req.body.username}\\b`, 'i')}, progress: req.body.progress})
  if(hasSubmitted) return res.status(400).json({error: config["400"], message: "You have already submitted a record for this level! If you have any questions about your record, please contact the staff team."})
  let new_submission = await submitSchema.create(req.body)
  return res.status(201).json(new_submission)
})
.patch(authenticator, rate_lim(86400000, 1), validFields({name: "id", type: String, description: ""}, {name: "demon", type: String, description: "", optional: true}, {name: "username", type: String, description: "", optional: true}, {name: "video", type: "URL", description: "", optional: true}, {name: "comments", type: String, description: "", optional: true}, {name: "hertz", type: String, description: "", optional: true}, {name: "progress", type: Number, description: "", optional: true}, {name: "raw", type: "URL", description: "", optional: true}) ,async (req, res) => {
req.body.status = "pending"
  try {
    let checkSub = await submitSchema.findById(req.body.id)
    if(checkSub.status == "accepted") return res.status(400).json({error: config["400"], message: `You cannot edit this submission!`})
    let auth = req.headers.authorization.split(" ")
  let {id} = jwt.verify(auth[1], process.env.WEB_TOKEN)
    let correct_user = await loginSchema.findById(id)
    if(checkSub.account != correct_user.name) return res.status(400).json({error: config["400"], message: `You may only be able to edit your own submissions!`})
  } catch(_) {
     return res.status(400).json({error: config["400"], message: "Please input a valid submission ID!"})
  }

  for(const key in req.body) {
    req.body[key] = req.body[key].toString()
  }

if(req.body.video) {
  try {
    new URL(req.body.video)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Please input a valid video URL!"})
  }
}
  req.body.edited = dayjs(Date.now()).format("MMMM D, YYYY h:mm:ss A")
  let dupe = await submitSchema.findOne({video: req.body.video?.trim(), _id: {$nin: [new mongoose.Types.ObjectId(req.body.id)]}})
  if(dupe) return res.status(400).json({error: config["400"], message: "The link you inputted is already in this database, so can you PLEASE be patient? Thanks :)"})
  let hasSubmitted = await submitSchema.findOne({demon: {$regex: new RegExp(`\\b${req.body.demon}\\b`, 'i')}, username: {$regex: new RegExp(`\\b${req.body.username}\\b`, 'i')}, progress: req.body.progress, _id: {$nin: [new mongoose.Types.ObjectId(req.body.id)]}})
  if(hasSubmitted) return res.status(400).json({error: config["400"], message: "You have already submitted a record for this level! If you have any questions about your record, please contact the staff team."})

    let submission = await submitSchema.findById(req.body.id)
    for(const key in req.body) {
        submission[key] = req.body[key]
    }
    await submission.save()
    return res.json(submission)
})
.delete(authenticator, rate_lim(60000, 1), validFields({name: "id", type: String, description: ""}), async (req, res) => {
  
  try {
    let checkSub = await submitSchema.findById(req.body.id)
    if(checkSub.status != "pending") return res.status(400).json({error: config["400"], message: `You cannot delete this submission!`})
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
    let correct_account = await loginSchema.findById(id)
    if(checkSub.account != correct_account.name) return res.status(400).json({error: config["400"], message: `You may only be able to delete your own submissions!`})
  } catch(_) {
     return res.status(400).json({error: config["400"], message: "Please input a valid submission ID!"})
  }

  let deleted = await submitSchema.findByIdAndDelete(req.body.id)
  res.json(deleted)
})

router.route("/unread")
  .get(authenticator, async (req, res) => {
    try {
    let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN) 
  let {name} = await loginSchema.findById(id)
    let data = await messagesSchema.find({users: {$elemMatch: {$eq: name}}})
      let unread = []
      for(const item of data) {
        item.messages = item.messages.filter(e => e.from != name)
        let alr = item.messages.filter(e => e.read.includes(name))
        item.messages.splice(0, item.messages.findIndex(e => e == alr[alr.length-1])+1)
        for(const k of item.messages) {
          k.dmID = item._id.toString()
        }
        unread.push(...item.messages)
      }
      return res.json(unread)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Something bad happened folks..."})
  }
  })

router.route("/dm")
.post(authenticator, validFields({name: "name", type: String, description: "", optional: true}, {name: "users", type: Array, description: ""}), async (req, res) => {
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN) 
  let {name} = await loginSchema.findById(id)
  req.body.users = req.body.users?.filter(e => e != name)
  if(!req.body.users.length) return res.status(400).json({error: config["400"], message: "Please input at least one user to send this DM to!"})
  req.body.users = Array.from(new Set(req.body.users))
  for(const item of req.body.users) {
    try {
      let exists = await loginSchema.findOne({name: item})
      if(!exists) {
        return res.status(400).json({error: config["400"], message: "Please make sure all of your site users are valid users!"})
      }
    } catch(_) {
      return res.status(400).json({error: config["400"], message: "Please make sure all of your site users are valid users!"})
    }
  }
  req.body.users.push(name)
  if(!req.body.name) {
    req.body.name = req.body.users.join(", ")
  }
  
  let create = await messagesSchema.create(req.body)
  return res.status(201).json(create)
})
.patch(authenticator, validFields({name: "name", type: String, description: "", optional: true}, {name: "users", type: Array, description: "", optional: true}, {name: "id", type: String, description: ""}), async (req, res) => {
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN) 
  let nameUsers = ""
  let {name} = await loginSchema.findById(id)
  if(req.body.users) {
  req.body.users = Array.from(new Set(req.body.users))
  if(!req.body.users?.length) return res.status(400).json({error: config["400"], message: "Please input at least one user to send this DM to!"})
  for(const item of req.body.users) {
    try {
      let exists = await loginSchema.findOne({name: item})
      if(!exists) {
        return res.status(400).json({error: config["400"], message: "Please make sure all of your site users are valid users!"})
      }
    } catch(_) {
      return res.status(400).json({error: config["400"], message: "Please make sure all of your site users are valid users!"})
    }
  }
   nameUsers = req.body.users.join(", ")
  }
  try {
    let alreadyCreated = await messagesSchema.findOne({_id: new mongoose.Types.ObjectId(req.body.id), users: {$elemMatch: {$eq: name}}})
    if(!alreadyCreated) return res.status(400).json({error: config["400"], message: "This user DM does not exists!"})
    alreadyCreated.name = req.body.name || nameUsers || alreadyCreated.name
    alreadyCreated.users = req.body.users ?? alreadyCreated.users
    await alreadyCreated.save()
    if(alreadyCreated.users.length < 2) {
      await messagesSchema.findByIdAndDelete(req.body.id)
    }
  return res.sendStatus(204)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "This user DM does not exists!"})
  }
})
  .delete(authenticator, validFields({name: "id", type: String, description: ""}), async (req, res) => {
  try {
    let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN) 
  let {name} = await loginSchema.findById(id)
    let DM = await messagesSchema.findById(req.body.id)
    if(DM.users.length <= 2) {
      await messagesSchema.findByIdAndDelete(req.body.id)
    } else {
      DM.users = DM.users.filter(e => e != name)
      await DM.save()
    }
    return res.sendStatus(204)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Could not find the ID of the message to delete."})
  }
})
.get(authenticator, async (req, res) => {
  try {
    let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN) 
  let {name} = await loginSchema.findById(id)
    let msg = await messagesSchema.find({users: {$elemMatch: {$eq: name}}})
    msg.sort((a, b) => Date.parse(b.messages[b.messages.length-1]?.date ?? 0) - Date.parse(a.messages[a.messages.length-1]?.date ?? 0))
    return res.json(msg)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Could not find the ID of the DM."})
  }
})
  

router.route("/messages")
.post(authenticator, validFields({name: "id", type: String, description: ""}, {name: "message", type: String, description: ""}), rate_lim(5000, 1), async (req, res) => {
  if(req.body.message.toString().length > 2000) return res.status(400).json({error: config["400"], message: "Sorry, but as of right now, we will only allow messages up to 2000 characters."})
  if(req.body.message.toString().length == 0) return res.status(400).json({error: config["400"], message: "Your message must be at least 1 character long!"})
  let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  let {name} = await loginSchema.findById(id)
  try {
  let userDM = await messagesSchema.findOne({users: {$elemMatch: {$eq: name}}, _id: new mongoose.Types.ObjectId(req.body.id)})
  if(!userDM) return res.status(400).json({error: config["400"], message: "I could not find this DM that is associated with you!"})
  req.body.from = name
    req.body.to = userDM.users.filter(e => e != name)
  req.body.date =  dayjs(Date.now()).format("MMMM D, YYYY h:mm:ss A")
    req.body.subject = userDM.name
  userDM.messages.push(req.body)
  let msg = await userDM.save()
    for(const item of req.body.to) {
    send(JSON.stringify(req.body), {
    userResource: true,
    target: item,
    type: "mail"
  })
    }
  res.status(201).json(msg)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "I could not find this DM that is associated with you!"})
  }
})
.delete(authenticator, validFields({name: "id", type: String, description: ""}), async (req, res) => {
  try {
    let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN) 
  let {name} = await loginSchema.findById(id)
    await messagesSchema.findOneAndUpdate({"messages._id": new mongoose.Types.ObjectId(req.body.id), "messages.from": name}, {
      $pull: {
        messages: {
          _id: new mongoose.Types.ObjectId(req.body.id),
          from: name
        }
      }
    })
    return res.sendStatus(204)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Could not find the ID of the message to delete."})
  }
})
  .get(authenticator, validFields({name: "id", type: String, description: ""}), async (req, res) => {
  try {
     let {id} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN) 
  let {name} = await loginSchema.findById(id)
    let msg = await messagesSchema.findOne({_id: new mongoose.Types.ObjectId(req.query.id), users: {$elemMatch: {$eq: name}}})
    if(!msg) return res.status(400).json({error: config["400"], message: "Could not find the ID of the DM."})
    let otherPeople = msg.messages.filter(e => e.from != name)
    let findLast = msg.messages.findIndex(e => e == otherPeople[otherPeople.length-1])
    let readUsers = msg.messages[findLast]?.read
    if(!readUsers?.includes(name)) {
      msg.messages[findLast]?.read.push(name)
    }
    await msg.save()
    return res.json(msg)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Could not find the ID of the DM."})
  }
})



  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    let layers = stack?.stack.filter(layers => layers.handle.name == validFields({}).name)
     if(stack?.stack) {
      for(const layer of stack.stack) {
          config.documentation.v1.client[`${layer.method.toUpperCase()} ${stack.path}`] = {}
        }
    }
      if(layers?.length) {
        for(const layer of layers) {
          config.documentation.v1.client[`${layer.method.toUpperCase()} ${stack.path}`] = Object.fromEntries(layer.handle.functionArgs)
        }
      } 
    layers = stack?.stack.filter(layers => layers.handle.name == "authenticator")
    if(layers?.length) {
        for(const layer of layers) {
          config.documentation.v1.client[`${layer.method.toUpperCase()} ${stack.path}`].require_perm = true
        }
      } 
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  return router
}