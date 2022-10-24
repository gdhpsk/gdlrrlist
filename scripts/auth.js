const express = require("express")
const app = express.Router()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let { loginSchema, hasCorrectAuth: authFunction } = obj

  app.route("/login")
.get(async (req, res) => {
  let correct_auth = await authFunction(req, res)
  if(correct_auth) {
    return res.status(401).render("404.ejs")
  }
      return res.render("../misc/login.ejs")
})
.post(async (req, res) => {
  let correct_auth = await authFunction(req, res)
  if(correct_auth) {
    return res.status(401).json({status: 401, message: "You do not have permission to do this action."})
  }
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
  let correct_auth = await authFunction(req, res)
  if(correct_auth) {
    return res.status(401).json({status: 401, message: "You do not have permission to do this action."})
  }
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
  
  return app
}