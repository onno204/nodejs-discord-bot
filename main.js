const axios = require('axios')
const WebSocket = require('ws');
const dgram = require('dgram');
const jsdom = require("jsdom");
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');


// https://github.com/websockets/ws

const users = require('./userdata.js')
const youtube_church_songs = [
    "https://www.youtube.com/watch?v=lKfAoHnLstk",
    "https://www.youtube.com/watch?v=I_8-P4eZ1jA",
    "https://www.youtube.com/watch?v=PVjiKRfKpPI",
    "https://www.youtube.com/watch?v=YFQbKqbieC0",
    "https://www.youtube.com/watch?v=I5f3grxJPdk",
    "https://www.youtube.com/watch?v=8Tz4bbqgge8",
    "https://www.youtube.com/watch?v=8hWVSvzh9os",
    "https://www.youtube.com/watch?v=Tu1otiBLPko",
    "https://www.youtube.com/watch?v=BQXHnWkjYso",
    "https://www.youtube.com/watch?v=j8ZF_R_j0OY",
    "https://www.youtube.com/watch?v=lKM-8CZRplI",
    "https://www.youtube.com/watch?v=RsMAXhc0QTs",
    "https://www.youtube.com/watch?v=PP9BjKnDaFk",
    "https://www.youtube.com/watch?v=nzCIeNhw8oE",
    "https://www.youtube.com/watch?v=Sc6SSHuZvQE",
    "https://www.youtube.com/watch?v=XbGs_qK2PQA",
    "https://www.youtube.com/watch?v=GfVd5x9W1Xc",
    "https://www.youtube.com/watch?v=K44trVhtZX4",
    "https://www.youtube.com/watch?v=UqN5CAGvf8s",
    "https://www.youtube.com/watch?v=n4XWfwLHeLM",
    "https://www.youtube.com/watch?v=yOEviTLJOqo",
    "https://www.youtube.com/watch?v=lxRwEPvL-mQ",
    "https://www.youtube.com/watch?v=LRP8d7hhpoQ",
    "https://www.youtube.com/watch?v=YrLk4vdY28Q",
    "https://www.youtube.com/watch?v=IX1zicNRLmY",
    "https://www.youtube.com/watch?v=WyxXGdG3-Io",
    "https://www.youtube.com/watch?v=-ttlCawlluc",
    "https://www.youtube.com/watch?v=H3v9unphfi0",
    "https://www.youtube.com/watch?v=fRL447oDId4"
]
const global_config = {
    USER_HOSTING_CHURCH: undefined
}

const discord_opts = {
    DISPATCH: 0,
    HEARTBEAT: 1,
    IDENTIFY: 2,
    VOICE: 4,
    INVALID_SESSION: 9,
    HELLO: 10,
    HEARTBEAT_RECEIVED: 11
}
const discord_voice_opts = {
    IDENTIFY: 0,
    SELECT_PROTOCOL: 1,
    READY: 2,
    HEARTBEAT: 3,
    SESSION_DESCRIPTION: 4,
    SPEAKING: 5 ,
    HEARTBEAT_RECEIVED: 6,
    HELLO: 8,
    CONNECTED: 12,
    DISCONNECTED: 13,
}
const DiscordAPI = {
    BASE: "https://discordapp.com/api/",
    LOGIN: "auth/login",
    MESSAGE: "channels/%s1/messages",
    GUILD_ID: "665191411188236288",
    CHURCH_ID: "665670000916430859"
}

String.prototype.format = function(){
    var final = String(this);
    for(let i=0; i<arguments.length;i++){
        final = final.replace(`%s${i+1}`, arguments[i])
    }
    return final || ''
}
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
var timeout = 0;
function login(){
    // Create someone responsible to host the church meeting
    for (const user of users) {
        user.id = Math.random().toString(36).substr(2);
        if (global_config.USER_HOSTING_CHURCH === undefined){
            global_config.USER_HOSTING_CHURCH = user.id
        }else{
            if (Math.floor(Math.floor(Math.random()* 10 * (Object.size(users))) / 10) === 1){
                global_config.USER_HOSTING_CHURCH = user.id
            }
        }
    }
    for (const user of users) {
        setTimeout(function(){
            if(user.token == undefined){
                login_with_email(user.id, user.email, user.password, user.channelId)
            }else{
                new DiscordBot(user.id, "Bot " + user.token, user.channelId);
            }
        }, timeout);
        timeout = timeout + 2000
    }
}
function login_with_email(id, email, password, channelId){
    axios.post(DiscordAPI.BASE + DiscordAPI.LOGIN, {email: email, password: password}).then((data) => {
        if (data.data.token != undefined){
            new DiscordBot(id, data.data.token, channelId);
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
    /////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////                    setup                  /////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    constructor(id, token, targetChannel){
        this.id = id;
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
        this.voice = {
            active: false,
            data: undefined,
            connection_data: undefined,
            joined: false,
        }
        this.login_gateway();
    }
    login_gateway(){
        this.auth.heartbeat_interval = undefined;
        const ws = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json", { perMessageDeflate: false });
        var self = this;
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
                    ws.send(JSON.stringify(identification))
                }
            }else if (data.op == discord_opts.HEARTBEAT){
                self.login_gateway_send_heartbeat(ws);
            }else if (data.op == discord_opts.FAILED_OR_ZOMBIE){
                self.killSlave("FAILED OR ZOMBIE", ws)
            }else if (data.op == discord_opts.DISPATCH){
                self.auth.heartbeat_s = data.s
                switch (data.t) {
                    case "READY":
                        self.info.userinfo = data.d;
                        console.log("READY: ", self.info.userinfo.user.username)
                        if (self.auth.proceed_running === true){ return false; }
                        self.auth.proceed_running = true;
                        self.login_gateway_send_heartbeat(ws);
                        setInterval(function(){
                            self.login_gateway_send_heartbeat(ws);
                        }, self.auth.heartbeat_interval);
                        self.active = true;
                        self.handler(ws);
                        break;

                    case "PRESENCE_UPDATE":
                        break;

                    case "MESSAGE_UPDATE":
                        break;

                    case "GUILD_CREATE":
                        self.active = false
                        self.killSlave("Guild not found", ws)
                        break;

                    case "MESSAGE_CREATE":
                        if(data.d.channel_id === self.info.targetChannelId){
                            self.message_received(data.d); 
                        }
                        break;

                    case "PRESENCE_UPDATE":
                        break;

                    case "SESSIONS_REPLACE":
                        break;

                    case "VOICE_SERVER_UPDATE":
                        if(self.voice.data !== undefined){
                            self.voice_gateway(ws, data.d.token, data.d.guild_id, data.d.endpoint, self.voice.data.user_id, self.voice.data.session_id)
                            self.voice.data = undefined
                        }else{
                            self.voice.data = data.d
                        }
                        break;

                    case "VOICE_STATE_UPDATE":
                        if(self.voice.data !== undefined){
                            self.voice_gateway(ws, self.voice.data.token, self.voice.data.guild_id, self.voice.data.endpoint, data.d.user_id, data.d.session_id)
                            self.voice.data = undefined
                        }else{
                            self.voice.data = data.d
                        }
                        break;
                
                    default:
                        console.log("Unkown event: ", data.t)
                        break;
                }
            }else if (data.op == discord_opts.INVALID_SESSION){
                self.killSlave("Invalid Session", ws)
            }else if (data.op == discord_opts.HEARTBEAT_RECEIVED){
                // console.log("HEARTBEAT_RECEIVED");
            }else{
                console.error("Discord gateway unkown/handled: ", data);
                self.killSlave("Unkown opt! It is safer to kill", ws)
                return false;
            }
        });
    }
    login_gateway_send_heartbeat(ws){
        var heartbeat = {
            "op": discord_opts.HEARTBEAT,
            "d": (new Date()).getTime()
        }
        // console.log("sending heartbeat: ", JSON.stringify(heartbeat))
        ws.send(JSON.stringify(heartbeat))
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////                    MISC                   /////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    killSlave(reason, ws){
        console.log(reason);
        console.error("["+this.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+this.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+this.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+this.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+this.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+this.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+this.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+this.info.userinfo.user.email+"] Slave has been killed. " + reason)
        console.error("["+this.info.userinfo.user.email+"] Slave has been killed. " + reason)
        ws.close();
        this.active = false
        process.exit();
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

/////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////               TEXT CHANNELS               /////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////
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
    handler(ws){
        var self = this
        setInterval(function(){
            if ((new Date()).getUTCMinutes() === 0){
                self.joinVoiceChannel(ws, DiscordAPI.CHURCH_ID);
            }
        }, 500);
        this.sendMessage("pls daily")
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


    sendMessage(message){
        if(this.active !== true){ return false; }
        this.postRequest(DiscordAPI.BASE + DiscordAPI.MESSAGE.format(this.info.targetChannelId), {content: message}, function(data){
            // console.log("send message: ", message)
        })
    }
    message_get_quoted_string(msg){
        var tmpStr  = msg.match("`(.*)`");
        return tmpStr[1];
    }






/////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////              VOICE CHANNELS               /////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////
    joinVoiceChannel(ws, id){
        if (this.voice.joined !== true){
            var voiceData = {
                "op": discord_opts.VOICE,
                "d": {
                    "guild_id": DiscordAPI.GUILD_ID,
                    "channel_id": id,
                    "self_mute": false,
                    "self_deaf": false
                }
            }
            ws.send(JSON.stringify(voiceData))
        }
    }
    leaveVoiceChannel(ws){
        if (this.voice.joined === true){
            var voiceData = {
                "op": discord_opts.VOICE,
                "d": {
                    "guild_id": DiscordAPI.GUILD_ID,
                    "channel_id": id,
                    "self_mute": false,
                    "self_deaf": false
                }
            }
            ws.send(JSON.stringify(voiceData))
        }
    }
    voice_gateway(ws, token, guild_id, endpoint, user_id, session_id){
        this.voice.joined = true
        if (endpoint !== undefined){
            this.voice.active = false
            this.voice.heartbeat_interval = undefined;
            var self = this;
            setTimeout(()=>{
                self.leaveVoiceChannel(ws)
            }, 1000 * 60 * 7) // Leave after 7min
            const wsv = this.wsv = new WebSocket("wss://"+endpoint.split(':')[0]+"/?v=4&encoding=json", { perMessageDeflate: false });
            wsv.on('open', function open() {
                // wsv.send('something');
            });
            wsv.on('error', function incoming(data) {
                console.log("Voice server Error: ", data)
                self.killSlave("Voice server error", ws)
            });
            wsv.on('ready', function incoming(data) {
                // console.log("READY: ", data)
            });
            wsv.on('message', function incoming(data) {
                data = JSON.parse(data);
                if (data.op == discord_voice_opts.HELLO){
                    if(data.d.heartbeat_interval != undefined){
                        self.voice.heartbeat_interval = data.d.heartbeat_interval;
                        var identification = {
                            "op": discord_voice_opts.IDENTIFY,
                            "d": {
                                "server_id": DiscordAPI.GUILD_ID,
                                "user_id": user_id,
                                "session_id": session_id,
                                "token": token,
                            }
                        }
                        wsv.send(JSON.stringify(identification))
                    }
                }else if (data.op == discord_voice_opts.HEARTBEAT){
                    self.voice_gateway_send_heartbeat();
                }else if (data.op == discord_voice_opts.READY){
                    self.voice.active = true
                    self.voice.connection_data = data.d
                    self.voice_gateway_send_heartbeat();
                    setInterval(function(){
                        self.voice_gateway_send_heartbeat();
                    }, self.voice.heartbeat_interval);
                    self.voice_connect()
                }else if (data.op == discord_voice_opts.DISCONNECTED){
                    // User disconnected
                    // self.voice.active = false
                    // wsv.close()
                }else if (data.op == discord_voice_opts.CONNECTED){

                }else if (data.op == discord_voice_opts.SESSION_DESCRIPTION){
                    self.voice_security_data = data.d
                    if (global_config.USER_HOSTING_CHURCH === self.id){
                        self.voice_send_test()
                    }
                    console.log("[VOICE] Connected: ", self.info.userinfo.user.username)
                }else if (data.op == discord_voice_opts.HEARTBEAT_RECEIVED){
                    // console.log("HEARTBEAT_RECEIVED");
                }else if (data.op == discord_voice_opts.SPEAKING){
                    // console.log("speaking")
                    return true
                }else{
                    console.error("[VOICE] Discord gateway unkown/handled: ", data);
                    self.killSlave("[VOICE] Unkown opt! It is safer to kill", ws)
                    return false;
                }
            });
        }
    }
    voice_gateway_send_heartbeat(){
        this.voice_nonce = (new Date()).getTime()- 1578860524514
        if (this.voice_nonce > ((2 ** 32) - 1)) { this.voice_nonce = 0; }
        if (this.voice_nonceBuffer === undefined){ this.voice_nonceBuffer = Buffer.alloc(24); }
        this.voice_nonceBuffer.writeUInt32BE(this.voice_nonce, 0);
        var heartbeat = {
            "op": discord_voice_opts.HEARTBEAT,
            "d": this.voice_nonce
        }
        this.wsv.send(JSON.stringify(heartbeat))
    }
    voice_connect(){
        this.voice_start_udp()
        var self = this;
        axios.get('https://api.ipify.org/?format=json').then(function (response) {
            var externalIp = response.ip
            var serverdata = self.voice.connection_data
            var voiceData = {
                "op": discord_voice_opts.SELECT_PROTOCOL,
                "d": {
                    "protocol": "udp",
                    "data": {
                        "address": externalIp,
                        "port": 4024,
                        "mode": "xsalsa20_poly1305_suffix"
                    }
                }
            }
            self.wsv.send(JSON.stringify(voiceData))
        })
    }
    voice_set_speaking(status){
        var bitStatus = 0;
        if (status){ bitStatus = 1 << 0; }
        var voiceData = {
            "op": discord_voice_opts.SPEAKING,
            "d": {
                "speaking": bitStatus,
                "delay": 0,
                "ssrc": this.voice.connection_data.ssrc
            }
        }
        this.wsv.send(JSON.stringify(voiceData))
    }
    voice_send_test(){
        this.voice_set_speaking(true)
        const worker = new Worker("./StreamDispatcher.js", {
            workerData: {
                obj: {
                    voice_security_data: this.voice_security_data,
                    voice: this.voice
                },
                discord_voice_opts: discord_voice_opts,
                url: this.voice_get_church_song()
            }
        });
        worker.on('message', (e) => console.log("Message: ", e));
        worker.on('error', (e) => console.log("Error: ", e));
        worker.on('exit', (e) => {
            this.voice_set_speaking(false)
            if (e !== 0)
                console.log("Error-code: ", e)
        });
    }
    voice_get_church_song(){
        var rtn = youtube_church_songs[Math.floor(Math.floor(Math.random()* 10 * (youtube_church_songs.length)) / 10)];
        if(rtn !== undefined){ return rtn; }
        return youtube_church_songs[0]
    }
    voice_start_udp(){
        var self = this;
        const server = this.voiceServer = dgram.createSocket('udp4');
        server.on('error', (err) => {
            console.log(`server error:\n${err.stack}`);
            server.close();
        });
        server.on('message', (msg, rinfo) => {
            // var decoded = this.opusEncoder.decode( msg  , this.opusFrame_size );
            // console.log(`[VOICE] server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
            // console.log(`[VOICE] server got message from ${rinfo.address}`);
        });
        server.on('listening', function() {
            const address = server.address();
            console.log(`[VOICE] server listening ${address.address}:${address.port}`);
        });

        // server.bind(4024);
        const discoveryMessage = Buffer.alloc(70);
        discoveryMessage.writeUIntBE(this.voice.connection_data.ssrc, 0, 4);
        this.voice_send_packet(discoveryMessage);
    }
    voice_send_packet(packet){
        var self = this
        var serverdata = this.voice.connection_data;
        const client = dgram.createSocket('udp4');
        client.send(packet, 0, packet.length, serverdata.port, serverdata.ip, (e) => {
            if (e) {
                console.error("[VOICE] Failed to send a packet: ", e);
            }
        });
    }

}
login()