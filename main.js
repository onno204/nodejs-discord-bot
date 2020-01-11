const axios = require('axios')
const WebSocket = require('ws');
const jsdom = require("jsdom");
// https://github.com/websockets/ws


const discord_opts = {
    DISPATCH: 0,
    HEARTBEAT: 1,
    IDENTIFY: 2,
    INVALID_SESSION: 9,
    HELLO: 10,
    HEARTBEAT_RECEIVED: 11
}
const DiscordAPI = {
    BASE: "https://discordapp.com/api/",
    LOGIN: "auth/login",
    MESSAGE: "channels/%s1/messages",
}

String.prototype.format = function(){
    var final = String(this);
    for(let i=0; i<arguments.length;i++){
        final = final.replace(`%s${i+1}`, arguments[i])
    }
    return final || ''
}
var timeout = 0;
function login(){
    const users = require('./userdata.js')
    for (const user of users) {
        setTimeout(function(){
            if(user.token == undefined){
                login_with_email(user.email, user.password, user.channelId)
            }else{
                new DiscordBot("Bot " + user.token, user.channelId);
            }
        }, timeout);
        timeout = timeout + 2000
    }
}
function login_with_email(email, password, channelId){
    axios.post(DiscordAPI.BASE + DiscordAPI.LOGIN, {email: email, password: password}).then((data) => {
        console.error("Login", data.data)
        if (data.data.token != undefined){
            new DiscordBot(data.data.token, channelId);
        }else if(data.data.mfa === true){
            console.error("2FA required for user: " + email)
            console.error("2FA required for user: " + email)
            console.error("2FA required for user: " + email)
            console.error("2FA required for user: " + email)
            console.error("2FA required for user: " + email)
            console.error("2FA required for user: " + email)
            console.error("2FA required for user: " + email)
            console.error("2FA required for user: " + email)
            console.error("2FA required for user: " + email)
            console.error("2FA required for user: " + email)
        }
    }).catch((error) => {
        console.error("Login error for "+email+" ["+error.response.status+"]: ", error.response.data)
    })
}

class DiscordBot{
    constructor(token, targetChannel){
        this.info = {
            targetChannelId: targetChannel,
            userinfo: {},
        }
        this.auth = {
            token: token,
            heartbeat_interval: undefined,
            heartbeat_s: undefined,
            proceed_running: false,
        }
        this.active = false
        this.login_gateway();
    }

    message_get_quoted_string(msg){
        var tmpStr  = msg.match("`(.*)`");
        return tmpStr[1];
    }
    
    login_gateway(){
        var self = this;
        this.auth.heartbeat_interval = undefined;
        const ws = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json", { perMessageDeflate: false });
        ws.on('open', function open() {
            // ws.send('something');
        });
        ws.on('ready', function incoming(data) {
            // console.log("READY: ", data)
        });
        ws.on('message', function incoming(data) {
            data = JSON.parse(data);
            if (data.op == discord_opts.HELLO){
                if(data.d.heartbeat_interval != undefined){
                    self.auth.heartbeat_interval = data.d.heartbeat_interval;
                    var identification = {
                        "op": discord_opts.IDENTIFY,
                        "d": {
                            "token": self.auth.token,
                            "properties": {
                                "$os": "linux",
                                "$browser": "disco",
                                "$device": "disco"
                            },
                            "presence": {
                                "game": {
                                    "name": "MONEYZ FARMEN <3",
                                    "type": 0
                                },
                                "status": "dnd",
                                "since": 91879201,
                                "afk": false
                            }
                        }
                    }
                    console.log("sending: ", identification)
                    ws.send(JSON.stringify(identification))
                }
            }else if (data.op == discord_opts.HEARTBEAT){
                self.login_gateway_send_heartbeat(ws);
            }else if (data.op == discord_opts.FAILED_OR_ZOMBIE){
                killSlave("FAILED OR ZOMBIE", ws)
            }else if (data.op == discord_opts.DISPATCH){
                self.auth.heartbeat_s = data.s
                if(data.t == "READY"){
                    self.info.userinfo = data.d;
                    console.log("READY: ", self.info.userinfo.user.username)
                    if (self.auth.proceed_running === true){ return false; }
                    self.auth.proceed_running = true;
                    self.login_gateway_send_heartbeat(ws);
                    setInterval(function(){
                        self.login_gateway_send_heartbeat(ws);
                    }, self.auth.heartbeat_interval);
                    self.active = true;
                    self.handler();
                }else if(data.t == "PRESENCE_UPDATE"){
                    return true;
                }else if(data.t == "MESSAGE_UPDATE"){
                    return true;
                }else if (data.t == "GUILD_CREATE"){
                    self.active = false
                }else if(data.t == "MESSAGE_CREATE"){
                    if(data.d.channel_id === self.info.targetChannelId){
                        self.message_received(data.d); 
                    }
                }else if(data.t == "PRESENCE_UPDATE"){
                    return true;
                }else{
                    console.error("Unkown event: ", data.t);
                }
            }else if (data.op == discord_opts.INVALID_SESSION){
                killSlave("Invalid Session", ws)
            }else if (data.op == discord_opts.HEARTBEAT_RECEIVED){
                // console.log("HEARTBEAT_RECEIVED");
            }else{
                console.error("Discord gateway unkown/handled: ", data);
                killSlave("Unkown opt! It is safer to kill", ws)
                return false;
            }
        });
    }
    killSlave(reason, ws){
        console.error("["+self.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+self.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+self.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+self.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+self.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+self.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+self.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+self.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+self.info.userinfo.user.email+"] Slave has been killed. " + reason)
        ws.close();
        process.exit();
    }

    login_gateway_send_heartbeat(ws){
        var heartbeat = {
            "op": discord_opts.HEARTBEAT,
            "d": (new Date()).getTime()
        }
        // console.log("sending heartbeat: ", JSON.stringify(heartbeat))
        ws.send(JSON.stringify(heartbeat))
    }

    
    getDomFromHTMLString(html){
        const {JSDOM} = jsdom;
        const dom = new JSDOM(html);
        const $ = (require('jquery'))(dom.window);
        return $;
    }
    postRequest(url, data, callback, headers){
        var self = this;
        if (headers == undefined){
            headers = {};
            if(this.auth.token != undefined){
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': '' + this.auth.token
                };
            }
        }
        axios.post(url, data, {
            headers: headers
        })
        .then((res) => {
            if (res.data.success == undefined){
                res.data.success = false
                if (res.status == 200){
                    res.data.success = true
                }
            }
            if (res.data.url == undefined){
                res.data.url = url;
            }
            callback(res.data)
        })
        .catch((error) => {
            console.error("["+self.info.userinfo.user.email+"]Error with Post["+error.response.status+"]("+url+"): ", error.response.data)
            if (error.response.data.success == undefined){
                error.response.data.success = false
                if (error.response.data == 200){
                    error.response.data.success = true
                }
            }
            callback(error.response.data)
        })
    }
    sendMessage(message){
        if(this.active !== true){ return false; }
        this.postRequest(DiscordAPI.BASE + DiscordAPI.MESSAGE.format(this.info.targetChannelId), {content: message}, function(data){
            // console.log("send message: ", message)
        })
    }


    message_received(data){
        if (data.embeds.length >= 1){
            var embeds = data.embeds[0];
            if(embeds.title == undefined){ embeds.title = ""; }
            if(embeds.description == undefined){ embeds.description = ""; }
            if(embeds.footer == undefined){ embeds.footer = ""; }
            if(embeds.author == undefined){ embeds.author = {}; }
            if(embeds.author.name == undefined){ embeds.author.name = ""; }
            if(!embeds.title.includes("Slow it down")){
                // console.log("embeds: ", embeds)
                var embeds_header = embeds.author.name;
                var embeds_description = embeds.description;
                if(embeds_header.includes("trivia question")){
                    var questionFinderStr  = embeds_description.match(/\*{2}(.*?)\*{2}/g);
                    var question = questionFinderStr[0].replace("*", "").replace("*", "").replace("*", "").replace("*", "");
                    var awnsersSplit = embeds_description.split(")");
                    var awnsers = []
                    for(var y=1; y < awnsersSplit.length; y+=1){
                        var curAwnser = awnsersSplit[y];
                        var regexmatch = curAwnser.match(/\*(.*?)\*/g);
                        if((regexmatch != undefined) && (regexmatch != null)){
                            if (regexmatch.length >= 1){
                                awnsers[awnsers.length] = regexmatch[0].replace("*", "").replace("*", "");
                            }
                        }
                    }
                    // console.log("question: ", question)
                    // console.log("awnsers: ", awnsers)
                    this.sendMessage("1");
                    // axios.get('https://www.googleapis.com/customsearch/v1', {params: {q: question, cx: '002356836092859882685:3jog9tt85tj', key: "AIzaSyBleP7_InH4AElrDzhjiNHqPK2DaNlOIl8"}}).then(function (response) {
                    //     var data = response.data;
                        
                    //     for(var y=1; y < awnsers.length; y+=1){
                    //         var curAwnser = awnsers[y];
                    //         var awnserWords = curAwnser.split(" ");
                    //         for (var z = 0; z < awnserWords.length; z += 1) {
                    //             for (var i = 0; i < data.items.length; i += 1) {
                    //                 var item = data.items[i]
                    //                 var snippet = item.snippet;
                    //                 var awnserWord = awnserWords[z];
                    //                 if (snippet.toLowerCase().includes(awnserWord.toLowerCase())){
                    //                     sendMessage(y+1)
                    //                     return true;
                    //                 }
                    //             }

                    //         }
                    //     }
                    //     // If not found
                    //     sendMessage("1");
                    // })
                }
            }
        }
        var msg = data.content;
        // console.log("Message received: ", msg);
        if(msg.includes("The police are here, and they're after you!")){
            this.sendMessage( this.message_get_quoted_string(msg) );
        }else if(msg.includes(" need to buy a laptop in the shop to post memes")){
            this.sendMessage("pls withdraw 1000");
            var self = this
            setTimeout(function(){ 
                self.sendMessage("pls buy laptop");
            }, 1000 * 5);
        }else if(msg.includes("You can only share")){
            this.sendMessage( "pls share onno204 "+(msg.replace("You can only share ", '').replace(" with this user right now.", '')) );
        }else if(msg.includes("What type of meme do you want to po")){
            this.sendMessage( this.message_get_quoted_string(msg) );
        }else if(msg.includes("What type of meme do you want to po")){
            this.sendMessage( this.message_get_quoted_string(msg) );
        }
    }

    handler(){
        this.sendMessage("pls daily")
        var self = this
        setTimeout(function(){
            self.sendMessage("pls with all")
        }, 4*1000);
        setTimeout(function(){
            self.run_farm()
            setInterval(function(){
                self.run_farm();
            }, 61*1000);

            setTimeout(function(){ 
                self.run_farm3();
                setInterval(function(){
                    self.run_farm3();
                }, 26*1000);
            }, 1000 * 3);

            setTimeout(function(){ 
                self.run_farm2();
                setInterval(function(){
                    self.run_farm2();
                }, 121*1000);
            }, 1000 * 15);
        }, 10*1000);
    }
    run_farm3(){
        this.sendMessage("pls trivia")
    }
    run_farm2(){
        this.sendMessage("pls pm")
    }
    run_farm(){
        var self = this
        this.sendMessage("pls beg");
        setTimeout(function(){ 
            self.sendMessage("pls search");
            setTimeout(function(){
                self.sendMessage("pls dep all")
                // self.sendMessage("pls share onno204 500")
            }, 1000 * 10);
        }, 1000 * 10);
    }
}
login()