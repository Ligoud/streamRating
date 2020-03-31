const mongoose = require("mongoose");
const jsonwebtoken = require('jsonwebtoken');
var express = require("express");
var bodyParser = require('body-parser')
const https=require('https')
//
//
var app = express();
const uri="mongodb+srv://user:userIndeed@offsmngrbot-yfbnk.mongodb.net/test?retryWrites=true&w=majority"
const local_uri="mongodb://localhost:27017/StreamRating"
var conn=mongoose.connect(uri, {useNewUrlParser: true,useUnifiedTopology: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('db connected')
});
//
/* #region  CONST */
const bearerPrefix = 'Bearer ';
const port = 3000;
const sec = "WckwQfuPP4Jz6P+HsyyfuK07LsI4nDoY+Jg24EwV6Qc=";
const secret = Buffer.from(sec, 'base64');
const monthInSeconds=2592000000; //30 дней
var Rating=mongoose.model('Rates',{
    userID: String,
    userName: String,
    review: String,
    lastDate: Date
})
/* #endregion */

/* #region  USE */
app.use(bodyParser.json())
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    // Note that the origin of an extension iframe will be null
    // so the Access-Control-Allow-Origin has to be wildcard.
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});
/* #endregion */

/* #region  ROUTING */
app.post('/add',async (req,res)=>{
    console.log('received message '+req.body.review)
    const payload=verifyAndDecode(req.headers.authorization)
    const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
    let newRate=new Rating({
        userID: payload.opaque_user_id,
        userName:await getUserName(payload.opaque_user_id),
        review: req.body.review,
        lastDate: new Date()
    })
    newRate.save(function(err){
        if(err)
            console.log(err)      
    })
})

app.get('/get',(req,res)=>{
    Rating.find((err,ratinRes)=>{
        if(err){
            res.json(null)
            console.log(err)
        }
        res.json(ratinRes)
    })
})


/* #endregion */

//
app.listen(port, () => {
    console.log('Server started on port ' + port)
})


//All other stuff

function verifyAndDecode(header) {
    if (header.startsWith(bearerPrefix)) {
        try {
            const token = header.substring(bearerPrefix.length);
            return jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] });
        }
        catch (ex) {
            return console.log("Invalid JWT")
        }
    }
}

async function getUserName(userID){
    let URL='https://api.twitch.tv/kraken/users/'+userID
    
    let prom=new Promise((resolve,reject)=>{
        let result=''
        https.get(URL,(res)=>{
            res.setEncoding('utf8')
            let body=''
            res.on('data',data=>{
                body+=data
            })        
            res.on('end',()=>{
                result=JSON.parse(body)
                console.log('res?')
                resolve(result)
            })
        }).on('error',(err)=>{reject('')})
    })
    let answ=await prom
    if(!answ || answ.error)
        return 'Anon'
    return answ
}