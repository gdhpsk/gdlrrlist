const config = require("../config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const opinionSchema = require("../../schemas/opinions.js")
const levelsSchema = require("../../schemas/levels.js")
const dayjs = require("dayjs")
const submitSchema = require("../../schemas/submissions.js")
const loginSchema = require("../../schemas/logins.js")
const mailSchema = require("../../schemas/mail")
const bcrypt = require("bcrypt")
let routes = {}

module.exports = (authFunction, webhook, rate_lim, send) => {
  let authenticator = async (req, res, next) => {
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
.post(rate_lim(600000, 1), async (req, res) => {
  if(req.headers.authorization) return res.status(400).json({error: config["400"], message: "Please input an empty authorization header!"})
  if(!req.body.password || !req.body.name) return res.status(400).json({error: config["400"], message: "Please input a 'name' and 'password' field for your request!"})
  const user = await loginSchema.findOne({name: req.body.name})
  if(user) {
    let isSame = await bcrypt.compare(req.body.password, user.password)
    if(!isSame) {
      res.status(400).json({error: config["400"], message: "It seems like you did not input the correct password for this account! If you are the account holder, please contact us so that we can reset your password!"})
    } else {
      let token = jwt.sign({username: req.body.name, password: req.body.password}, process.env.WEB_TOKEN, {
        expiresIn: "7d"
      })
      return res.json({authCode: token})
    }
  } else {
     res.status(400).json({error: config["400"], message: "It seems like this account does not exist yet! Please sign up to make an account"})
  }
})
.patch(authenticator, rate_lim(60000, 1), async (req, res) => {
  if(req.body.discord) {
    if(req.body.secret != process.env.secret) res.status(400).json({error: config["401"][0], message: config["401"][1]})
    let user = await loginSchema.findOne({discord: req.body.discord})
    if(!user) return res.status(400).json({error: config["400"], message: "I could not find a discord ID linked to this account!"})
  }
  if(!req.body.password) return res.status(400).json({error: config["400"], message: "Please include the new password for your account in the form of a 'password' field!"})
  let {username, password} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  if(req.body.password == password) return res.status(400).json({error: config["400"], message: "Please actually include a new password silly!"}) 
   let token = jwt.sign({username, password: req.body.password}, process.env.WEB_TOKEN, {
        expiresIn: "7d"
      })
  let hashedPass = await bcrypt.hash(req.body.password, 10)
  let user = await loginSchema.findOne({name: username})
  user.password = hashedPass
  await user.save()
  res.json({authCode: token})
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

router.post("/discord_auth", authenticator, async (req, res) => {
  if(req.body.secret != process.env.secret) return res.status(401).json({error: config["401"][0], message: config["401"][1]})
  let auth = req.headers.authorization.split(" ")
  let {username} = jwt.verify(auth[1], process.env.WEB_TOKEN)
  await loginSchema.findOneAndUpdate({name: username}, {
    $set: {
      discord: req.body.id,
      message: req.body.message
    }
  })
  res.sendStatus(204)
})

router.post("/signup", async (req, res) => {
  if(!req.body.password) return res.status(400).json({error: config["400"], message: "Please input a 'password' field!"})
  if(req.body.password != req.body.password2) return res.status(400).json({error: config["400"], message: "Your passwords do not match! Please include a 'password2' variable if you haven't already!"})
  const user = await loginSchema.findOne({name: req.body.name})
  if(user) {
     res.status(400).json({status: config["400"], message: "This account already exists! Please log in instead."})
  } else {
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
await loginSchema.create({name: req.body.name, password: hashedPassword})
     let token = jwt.sign({username: req.body.name, password: req.body.password}, process.env.WEB_TOKEN, {expiresIn: "7d"})
return res.status(201).json({authCode: token})
  }
})



router.route("/submissions")
.get(authenticator, async (req, res) => {
  let auth = req.headers.authorization.split(" ")
  if(auth[0] == "User") {
    let {username} = jwt.verify(auth[1], process.env.WEB_TOKEN)
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
.post(authenticator, rate_lim(60000, 1), async (req, res) => {
  if(!req.body.demon || !req.body.username || !req.body.video || !req.body.hertz || !req.body.progress) return res.status(400).json({error: config["400"], message: `Please input all the following required values: a demon, username, video, hertz, and progress. Here is your current body: ${JSON.stringify(req.body)}`})
  delete req.body.edited
  for(const key in req.body) {
    req.body[key] = req.body[key].toString()
  }

  try {
    new URL(req.body.video)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Please input a valid video URL!"})
  }
  req.body.status = "pending"
  req.body.account = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN).username
  req.body.date = dayjs(Date.now()).format("MMMM D, YYYY h:mm:ss A")
  let dupe = await submitSchema.findOne({video: req.body.video.trim()})
  if(dupe) return res.status(400).json({error: config["400"], message: "The link you inputted is already in this database, so can you PLEASE be patient? Thanks :)"})
  let hasSubmitted = await submitSchema.findOne({demon: {$regex: new RegExp(`\\b${req.body.demon}\\b`, 'i')}, username: {$regex: new RegExp(`\\b${req.body.username}\\b`, 'i')}, progress: req.body.progress})
  if(hasSubmitted) return res.status(400).json({error: config["400"], message: "You have already submitted a record for this level! If you have any questions about your record, please contact the staff team."})
  let new_submission = await submitSchema.create(req.body)
  return res.status(201).json(new_submission)
})
.patch(authenticator, rate_lim(60000, 1), async (req, res) => {

  if(!req.body.id) return res.status(400).json({error: config["400"], message: `Please input a 'id' value in your body!`})

  try {
    let checkSub = await submitSchema.findById(req.body.id)
    let auth = req.headers.authorization.split(" ")
  let correct_user = jwt.verify(auth[1], process.env.WEB_TOKEN)
    if(checkSub.account != correct_user.username) return res.status(400).json({error: config["400"], message: `You may only be able to edit your own submissions!`})
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
  let dupe = await submitSchema.findOne({video: req.body.video?.trim()})
  if(dupe && hasSubmitted._id.toString() != req.body.id) return res.status(400).json({error: config["400"], message: "The link you inputted is already in this database, so can you PLEASE be patient? Thanks :)"})
  let hasSubmitted = await submitSchema.findOne({demon: {$regex: new RegExp(`\\b${req.body.demon}\\b`, 'i')}, username: {$regex: new RegExp(`\\b${req.body.username}\\b`, 'i')}, progress: req.body.progress})
  if(hasSubmitted && hasSubmitted._id.toString() != req.body.id) return res.status(400).json({error: config["400"], message: "You have already submitted a record for this level! If you have any questions about your record, please contact the staff team."})

    let submission = await submitSchema.findById(req.body.id)
    for(const key in req.body) {
      if(req.body[key]) {
        submission[key] = req.body[key]
      }
    }
    await submission.save()
    return res.json(submission)
})
.delete(authenticator, rate_lim(60000, 1), async (req, res) => {
  if(!req.body.id) return res.status(400).json({error: config["400"], message: `Please input a 'id' value in your body!`})
  
  try {
    let checkSub = await submitSchema.findById(req.body.id)
  let correct_user = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
    if(checkSub.account != correct_user.username) return res.status(400).json({error: config["400"], message: `You may only be able to delete your own submissions!`})
  } catch(_) {
     return res.status(400).json({error: config["400"], message: "Please input a valid submission ID!"})
  }

  let deleted = await submitSchema.findByIdAndDelete(req.body.id)
  res.json(deleted)
})

router.route("/notifications")
.post(authenticator, rate_lim(60000, 1), async (req, res) => {
  if(!req.body.to || !req.body.subject || !req.body.message) return res.status(400).json({error: config["400"], message: "Please input ALL of the following inputs: to, subject, and message."})
  if(req.body.message.toString().length > 2000) return res.status(400).json({error: config["400"], message: "Sorry, but as of right now, we will only allow messages up to 2000 characters."})
  let {username} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
  req.body.from = username
  req.body.date = new Date(Date.now()).toISOString()
  await mailSchema.create(req.body)
  send(JSON.stringify(req.body), {
    userResource: true,
    target: req.body.to
  })
  res.status(201).json(req.body)
})
.get(authenticator, async (req, res) => {
  let {username} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN) 
  let userMail = []
  let fromUser = await mailSchema.find({from: username})
  let toUser = await mailSchema.find({to: username})
  let getFromUser = true
  let gettoUser = true
  if(req.query.fromUser != "true" && req.query.fromUser) {
    getFromUser = false
  }
  if(req.query.toUser != "true" && req.query.toUser) {
    gettoUser = false
  }
if(getFromUser) {
  for(const mail of fromUser) {
    if(mail.from == mail.to && gettoUser) continue;
    userMail.push(mail)
  }
}
  
if(gettoUser) {
  for(const mail of toUser) {
    userMail.push(mail)
  }
}

  if(req.query.number) {
    let mail = userMail[req.query.number-1]
    if(!mail) return res.status(400).json({error: config["400"], message: "Please input a valid mail number!"})
    return res.json({username, mail})
  }
  
  return res.json({username, mail: userMail})
})
.patch(authenticator, rate_lim(60000, 1), async (req, res) => {
  if(!req.body.id) return res.status(400).json({error: config["400"], message: "Please input ALL of the following inputs: id."})
  try {
    await mailSchema.findById(req.body.id)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Please input a valid Object ID!"})
  }
  if(req.body?.message?.toString().length > 2000) return res.status(400).json({error: config["400"], message: "Sorry, but as of right now, we will only allow messages up to 2000 characters."})
  if(req.body.hide) {
    let {username} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
    let mail = await mailSchema.findById(req.body.id)
    if(mail.to == username) {
      mail.hide = true
      await mail.save()
      return res.json(mail)
    }
  }
  delete req.body.to
  delete req.body.from
  delete req.body.date
  return res.json(req.body)
})
.delete(authenticator, async (req, res) => {
  if(!req.body.id) return res.status(400).json({error: config["400"], message: "Please input ALL of the following inputs: id."})
  try {
    await mailSchema.findById(req.body.id)
  } catch(_) {
    return res.status(400).json({error: config["400"], message: "Please input a valid Object ID!"})
  }

    let {username} = jwt.verify(req.headers.authorization.split(" ")[1], process.env.WEB_TOKEN)
    let mail = await mailSchema.findById(req.body.id)
    if(mail.from == username) {
      await mailSchema.findByIdAndDelete(req.body.id)
      return res.json(mail)
    }
  return res.status(400).send({error: config["400"], message: "You may only delete your own emails!"})
})


  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}