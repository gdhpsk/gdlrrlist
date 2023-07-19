const config = require("../config.json")
const { default: mongoose } = require("mongoose")
const allowedPeople = require("../../schemas/allowedPeople.js")
const jwt = require("jsonwebtoken")
const {request} = require("undici")
const { JSDOM } = require("jsdom");
const opinionSchema = require("../../schemas/opinions.js")
const levelsSchema = require("../../schemas/levels.js")
const dayjs = require("dayjs")
const {validFields} = require("../functions")
let reg  = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/

let routes = {}




module.exports = (authFunction, webhook, rate_lim) => {
  async function authenticator (req, res, next) {
      let path = req.url.split("?")[0]
    if(Object.keys(req.params).length) {
      for(const key in req.params) {
        path = path.replace(req.params[key], ":"+key)
      }
    }
  if(!routes[path]) return next()
  if(!routes[path][req.method.toLowerCase()]) return res.status(405).json({error: config["405"][0], message: config["405"][1]})
  next()
};
  
  const express = require("express")
const router = express.Router()
router.use(express.urlencoded({ extended: true }))
  router.use(authenticator)

  router.get("/ldms", async (req, res) => {
    try {
      let array = []
async function generate(page) {
    let request2 = await request(`https://gdbrowser.com/api/search/LRRlist?page=${page}&count=10&user`)
    let text = await request2.body.json()
      return text
}
    let count = 0
    while(true) {
        let ok = await generate(count)
        if(ok.length == 0) break;
      try {
        array.push(...ok)
      } catch(_) {
        break;
      }
        count++
    }
      return res.json(array)
    } catch(_) {
      return res.status(400).json([])
    }
  })

  router.get("/gd/levels", async (req, res) => {
    let data = await fetch("http://www.boomlings.com/database/getGJLevels21.php", {
    method: "post",
    headers: { 
      "User-Agent": "",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
        secret: "Wmfd2893gb7",
        ...req.query
    })
  })
  let text = await data.text()
  res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Cache-Control", "no-cache")
  if(data.status != 200) {
    return res.status(data.status).send(text);
  }
  let seperate = text.split("#")
  let levels = seperate[0].split("|")
  let creators = seperate[1].split("|").map(e => e.split(":"))
  let songs = seperate[2].split("~:~").map(e => e.split("~|~"))
  let pageInfo = seperate[3].split(":")
  let obj = {
    totalLevels: pageInfo[0],
    offset: pageInfo[1],
    amount: pageInfo[2],
    hash: seperate[4],
    levels: levels.map((e, ind) => {
        let array = e.split(":")
        function v(key) {
            return array[array.findIndex((e, i) => e == key.toString() && i%2 == 0)+1 || -1]
          }
          let author = creators.find(x => x.find(i => i == v(6)))
          let song = songs.find((x) => x.find((i) => i == v(35)))
          function songV(key) {
            return song[song.findIndex((e, i) => e == key.toString() && i%2 == 0)+1 || -1]
          }
          return {
            levelID: parseInt(v(1)),
            levelName: v(2),
            description: {
                raw:v(3),
                text: Buffer.from(v(3), "base64").toString()
            },
            version: parseInt(v(5)),
            player: {
                userID: parseInt(author[0]),
                username: author[1],
                accountID: parseInt(author[2])
            },
            difficultyDenominator: parseInt(v(8)),
            difficultyNumerator: parseInt(v(9)),
            downloads: parseInt(v(10)),
            setCompletes: parseInt(v(11)),
            gameVersion: parseInt(v(13)),
            likes: parseInt(v(14)),
            length: parseInt(v(15)),
            dislikes: parseInt(v(16)),
            demon: !!parseInt(v(17)),
            stars: parseInt(v(18)),
            featureScore: parseInt(v(19)),
            auto: !!parseInt(v(25)),
            recordString: v(26),
            copiedID: parseInt(v(30)),
            twoPlayer: !!parseInt(v(31)),
            extraString: v(36),
            coins: parseInt(v(37)),
            verifiedCoins: !!parseInt(v(38)),
            starsRequested: parseInt(v(39)),
            epic: parseInt(v(42)),
            demonDifficulty: parseInt(v(43)),
            isGauntlet: !!parseInt(v(44)),
            objects: parseInt(v(45)),
            editorTime: parseInt(v(46)),
            editorTimeCopies: parseInt(v(47)),
            settingsString: v(48),
            songInfo: song ? {
                ID: parseInt(songV(1)),
                officialSong: false,
                name: songV(2),
                artistID: parseInt(songV(3)),
                artistName: songV(4),
                size: parseFloat(songV(5)),
                videoID: songV(6),
                youtubeURL: songV(7),
                isVerified: !!parseInt(songV(8)),
                songPriority: parseInt(songV(9)),
                link: decodeURIComponent(songV(10))
            } : {
                ID: parseInt(v(12)),
                officialSong: true
            }
          }
      })
  }
     res.status(200).json(obj);
  })

router.get("/ML", validFields({name: "simplify", type: Number, description: "Simplifies the amount of data recieved.", optional: true}), async (req, res) => {
  try {
  let ok = await request("https://sites.google.com/view/gd-mobile-lists/top-100-demons-completed")
  let html = await ok.body.text()
  const dom = new JSDOM(html);
  let obj = []
let arr_of_yt_ids = []


  let all_pointer_demons = []
    let count = 0
  if(!req.query.simplify) {
while(true) {
  let level_i = await request(`https://pointercrate.com/api/v2/demons/listed?limit=100&after=${count*100}`)  
  let levels = await level_i.body.json()
  all_pointer_demons.push(...levels)
  if(levels.length != 100) break
  count++
}
  }
  for(let j = 2; j < dom.window.document.getElementsByClassName("oKdM2c Kzv0Me").length; j++) {
    let txt = ""
  let level = dom.window.document.getElementsByClassName("oKdM2c Kzv0Me")[j].getElementsByClassName("CDt4Ke zfr3Q").item(0)
  for(let i = 0; i < level.getElementsByTagName("span").length; i++) {
    let item = level.getElementsByTagName("span").item(i)
    txt += item.innerHTML
  }
 txt = JSDOM.fragment(txt).textContent.split("(~")[0]
let g = {}
console.log(txt.split(`"`))
try {
  g.name = txt.split(`"`)[1].trim()
} catch(_) {
  continue
}

if (!req.query.simplify) {
let level_id = all_pointer_demons.find(e => e.name == g.name)
if(level_id) {
  g.pointercrateID = level_id.id
}
}
    let len = txt.split("(")[0].split("by")
g.creators = len[len.length-1].trim()
let recordarr = []
let records = dom.window.document.getElementsByClassName("tyJCtd mGzaTb baZpAe")[(j*2)-1].getElementsByClassName("CDt4Ke zfr3Q")
for(let x = 0; x < records.length; x++) {
  let parts = JSDOM.fragment(records.item(x).innerHTML).textContent.trim().split(" ").filter(e => e != "")
  let name = parts.filter(e => !e.toLowerCase().startsWith("https://") && e != "-" && !e.toLowerCase().includes("hz)") && !e.toLowerCase().includes("youtu.be")).reduce(
    (previousValue, currentValue) => previousValue + " " + currentValue
  ).replace("-", "").trim()
  recordarr.push({
    name,
    link: parts.find(e => e.toLowerCase().includes("youtu") || e.toLowerCase().startsWith("https://"))
  })
  if(!req.query.simplify) {
    arr_of_yt_ids.push(reg.exec(recordarr[x].link)[1])
  }
  if(!recordarr[x].link.startsWith("https://")) {
    recordarr[x].link = `https://${recordarr[x].link}`
  }
  if(parts.find(e => e.toLowerCase().includes("hz)"))) {
    recordarr[x].hertz =  parseInt(parts.find(e => e.toLowerCase().includes("hz)")).replace("(", ""))
  } else {
    recordarr[x].hertz = 60
  }
}
g.records = recordarr
obj.push(g)
}

  let count2 = 0
  if(!req.query.simplify) {
  let arr_of_yt_results = []
  while(true) {
    let daafast = await request(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${arr_of_yt_ids.slice(count2, count2+50)}&key=${process.env.ytkey}`)
    let datafast = await daafast.body.json()
    arr_of_yt_results.push(...datafast.items)
    if(arr_of_yt_ids.slice(count2, count2+50).length != 50) break;
    count2 += 50
  }
  Object.values(obj).forEach(item => {
    item.records.forEach(e => {
      try {
      let data = arr_of_yt_results.find(o => o.id == reg.exec(e.link)[1])
      
      if(!data) {
    e.uploadDate = dayjs().format("M/D/YYYY")
  } else {
    e.uploadDate = dayjs(Date.parse(data.snippet.publishedAt)).format("M/D/YYYY")
  }
        } catch(_) {
        
      }
    })
  })
  }
  if(req.query.amp) {
    let points = (i) => (2250/((0.37*(i+1))+9)) - 40
    obj = Object.values(obj).map(e => e = {"fullname": `${e.name} by ${e.creators.host}`, shortname: e.name.toLowerCase(), points: points(Object.values(obj).indexOf(e)), position: Object.values(obj).indexOf(e)+1})
  }
  res.json(obj)
  } catch(e) {
    console.log(e)
    
  }
})

router.get("/random", async (req, res) => {
    var everything = await levelsSchema.find()
   everything.sort((a, b) => a._id - b._id)
  let excludedLevels = []
  if(req.query.exclude) {
    try {
      let exclusions = JSON.parse(req.query.exclude)
      excludedLevels.push(exclusions)
    }catch(_) {

}
  }
  if(req.query.filter) {
    try {
      let newarr = []
      let filters = JSON.parse(req.query.filter)
      if(filters.includes("main")) {
        for(let i = 0; i < 75; i++) {
          newarr.push(everything[i])
        }
      }
      if(filters.includes("extended")) {
        for(let i = 75; i < 150; i++) {
          newarr.push(everything[i])
        }
      }
      if(filters.includes("legacy")) {
        for(let i = 150; i < everything.findIndex(e => e.name == "Final Epilogue")+1; i++) {
          newarr.push(everything[i])
        }
      }
      newarr = newarr.filter(e => !excludedLevels[0].includes(e.name))
      let randomNum = Math.floor(Math.random() * (newarr.length-1))
      let randomLev = newarr[randomNum]
  if(req.query.appendTo) {
    try {
      let user = await rouletteSchema.findById(req.query.appendTo)
      let lev = user.config.levels[randomNum]
      user.config.levels = user.config.levels.filter(e => e.name != lev.name)
      console.log(lev)
      randomLev._id = lev.pos
      user.levels.push(randomLev)
      await user.save()
    }catch(e) {
      //console.log(e)
    }
  }
      return res.send(randomLev)
    } catch(e) {
      //console.log(e)
    }
  }
      everything = everything.filter(e => !excludedLevels[0].includes(e.name))
  let randomNum = Math.floor(Math.random() * (everything.length-1))
   let randomLev = everything[randomNum]
  if(req.query.appendTo) {
    try {
      let user = await rouletteSchema.findById(req.query.appendTo)
      randomNum = Math.floor(Math.random() * (user.config.levels.length-1))
      let lev = user.config.levels[randomNum]
      user.config.levels = user.config.levels.filter(e => e.name != lev.name)
      console.log(lev)
      randomLev._id = lev.pos
      user.levels.push(randomLev)
      await user.save()
    }catch(e) {
      //console.log(e)
    }
  }
    res.json(randomLev)
})

router.get("/MLL", async (req, res) => {
  let list = await request(`https://gdlrrlist.com/api/v1/demons/ML?simplify=true`)
  let array = await list.body.json()
  let obj = {}
  for(let item of array) {
      let x = array.findIndex(e => e == item)+1
    for(let record of item.records) {
      let index = Object.keys(obj).findIndex(e => e.toLowerCase() == record.name.toLowerCase())
      if(index != -1) {
        record.name = Object.keys(obj)[index]
      }
      if(!obj[record.name]) {
        obj[record.name] = {
          levels: [
            {
              name: item.name,
              hertz: record.hertz,
              link: record.link
            }
          ]
        }
        obj[record.name].points = 0
      } else {
        obj[record.name].levels.push({
              name: item.name,
              hertz: record.hertz,
              link: record.link
            })
      }
      obj[record.name].points += [2250/((0.37 * x) + 9)] - 40
    }
  }
  if(req.query.amp) {
    
  }
  res.json(obj)
})

router.get("/", validFields({name: "start", type: Number, description: "What placement do you want to start from?", optional: true}, {name: "end", type: Number, description: "What placement do you want to end the query at?", optional: true}), async (req, res) => {
  let config = {
    position: {
      $gt: (req.query.start ?? 1)-1,
      $lt: req.query.end
    }
  }
   if(config.position["$lt"] === undefined) {
     delete config.position["$lt"]
   }
  let everything = await levelsSchema.find(config).sort({position: 1})
  res.json(everything)
})

router.get("/:id", validFields({name: "id", type: Number, body_type: "params", description: "The placement of the level on the list"}), async (req, res) => {
  if(isNaN(req.params.id)) return res.status(400).json({error: config["400"], message: "Please input a valid level position!"})
  let level = await levelsSchema.findOne({position: req.params.id})
  if(!level) return res.status(400).json({error: config["400"], message: "Please input a valid level position!"})
  res.json(level)
})



  for(let i = 0; i < router.stack.length; i++) {
    let stack = router.stack[i].route
    let layers = stack?.stack.filter(layers => layers.handle.name == validFields({}).name)
     if(stack?.stack) {
      for(const layer of stack.stack) {
          config.documentation.v1.demons[`${layer.method.toUpperCase()} ${stack.path}`] = {}
        }
    }
      if(layers?.length) {
        for(const layer of layers) {
          config.documentation.v1.demons[`${layer.method.toUpperCase()} ${stack.path}`] = Object.fromEntries(layer.handle.functionArgs)
        }
      } 
    layers = stack?.stack.filter(layers => layers.handle.name == "authenticator")
    if(layers?.length) {
        for(const layer of layers) {
          config.documentation.v1.demons[`${layer.method.toUpperCase()} ${stack.path}`].require_perm = true
        }
      } 
    if(stack?.path) {
      routes[stack.path] = stack.methods
    }
  }
  
  return router
}