const express = require("express")
const app = express.Router()
app.use(express.urlencoded({ extended: true }))

module.exports = (obj) => {
  let {hasAccess, rolePacksSchema } = obj
app.post("/add", async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let that = {
        "id": process.env.discordid,
        "type": 0,
        "content": ``,
        "channel_id": process.env.discordid,
        "author": {
            "bot": true,
            "id": process.env.discordid,
            "username": "database",
            "avatar": "76f63eb129f3c44321041be72c2fd8cc",
            "discriminator": "0000"
        }, 
        "file": null,
        "embeds": [],
        "mentions": [],
        "mention_roles": [],
        "pinned": false,
        "mention_everyone": false,
        "tts": false,
        "timestamp": Date.now(),
        "edited_timestamp": null,
        "flags": 0,
        "components": [],
        "webhook_id": process.env.discordid
    }
  let packs = await rolePacksSchema.findById("629f0d8cea10be1cf846e85d")
  let message = "982564758609887264"
  if(!["Legacy", "Basic", "Intermediate"].includes(req.body.category)) {
    message = "982565026961432577"
    packs["Level Packs"][req.body.category][req.body.id] = JSON.parse(req.body.levels)
for(const key in packs["Level Packs"]) {
  if(["Legacy", "Basic", "Intermediate"].includes(key)) continue;
  if(key == "Advanced") {
    that.content += ``
  } else if(key == "Hardest") {
    that.content += `THE HARDEST PACK\n`
  } else {
      that.content += `${key} Packs\n`
  }
	for(const key2 in packs["Level Packs"][key]) {
          that.content += `<@&${key2}> (Beat ${packs["Level Packs"][key][key2].join(", ")})\n`
      }
      that.content += "\n\n"
    }
  } else {
packs["Level Packs"][req.body.category][req.body.id] = JSON.parse(req.body.levels)
    that.content += `Packs are here! Request them in #request list-roles:\nPack Roles\n`
for(const key in packs["Level Packs"]) { 
  if(key == "Advanced") break;
      that.content += `${key} Packs\n`
	for(const key2 in packs["Level Packs"][key]) {
          that.content += `<@&${key2}> (Beat ${packs["Level Packs"][key][key2].join(", ")})\n`
      }
      that.content += "\n\n"
    }
    that.content += `Advanced Packs`
  }
  await rolePacksSchema.findById(packs._id.toString()).updateMany(null, packs)
  res.send("gg")
   await request(`${process.env['roles_webhook']}/messages/${message}`, {
        method: "PATCH",
        body: JSON.stringify(that),
        headers: {"Content-Type": "application/json"}
    })
})

app.post("/delete", async (req, res) => {
  let approved = await hasAccess(false, req, res);   if(!approved) return res.render("404.ejs")
  let that = {
        "id": process.env.discordid,
        "type": 0,
        "content": ``,
        "channel_id": process.env.discordid,
        "author": {
            "bot": true,
            "id": process.env.discordid,
            "username": "database",
            "avatar": "76f63eb129f3c44321041be72c2fd8cc",
            "discriminator": "0000"
        }, 
        "file": null,
        "embeds": [],
        "mentions": [],
        "mention_roles": [],
        "pinned": false,
        "mention_everyone": false,
        "tts": false,
        "timestamp": Date.now(),
        "edited_timestamp": null,
        "flags": 0,
        "components": [],
        "webhook_id": process.env.discordid
    }
  let packs = await rolePacksSchema.findById("629f0d8cea10be1cf846e85d")
  let L = undefined
  let message = "982564758609887264"
  for(const key in packs["Level Packs"]) {
    let pack = packs["Level Packs"][key]
     delete pack[req.body.id]
    if(pack[req.body.id]) {
     if(["Legacy", "Basic", "Intermediate"].includes(key)) {
       L = true
     }
      break;
    }
  }
  
   
if(!L) {
    message = "982565026961432577"
for(const key in packs["Level Packs"]) {
  if(["Legacy", "Basic", "Intermediate"].includes(key)) continue;
  if(key == "Advanced") {
    that.content += ``
  } else if(key == "Hardest") {
    that.content += `THE HARDEST PACK\n`
  } else {
      that.content += `${key} Packs\n`
  }
	for(const key2 in packs["Level Packs"][key]) {
          that.content += `<@&${key2}> (Beat ${packs["Level Packs"][key][key2].join(", ")})\n`
      }
      that.content += "\n\n"
    }
  } else {
    that.content += `Packs are here! Request them in #request list-roles:\nPack Roles\n`
for(const key in packs["Level Packs"]) {
  if(key == "Advanced") break;
      that.content += `${key} Packs\n`
	for(const key2 in packs["Level Packs"][key]) {
          that.content += `<@&${key2}> (Beat ${packs["Level Packs"][key][key2].join(", ")})\n`
      }
      that.content += "\n\n"
    }
    that.content += `Advanced Packs`
  }
 
   await request(`${process.env['roles_webhook']}/messages/${message}`, {
        method: "patch",
        body: JSON.stringify(that),
        headers: {"Content-Type": "application/json"}
    })
  await rolePacksSchema.findById(packs._id.toString()).updateMany(null, packs)
  res.send("gg")
})
  return app
}