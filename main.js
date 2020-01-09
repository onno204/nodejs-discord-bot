const axios = require('axios')
const WebSocket = require('ws');
// https://github.com/websockets/ws

const discord_api = {
    info: {
        targetChannelId: "664167117817643018",
        userinfo: {},
    },
    api: {
        base: "https://discordapp.com/api/",
        login: "auth/login",
        message: "channels/%s1/messages",
    },
    auth: {
        // token: "_YOUR_TOKEN_",
        heartbeat_interval: undefined,
        heartbeat_s: undefined,
        proceed_running: false,
        email: "EMAIL",
        password: "PASSWORD",
    },
};
const discord_opts = {
    DISPATCH: 0,
    HEARTBEAT: 1,
    IDENTIFY: 2,
    INVALID_SESSION: 9,
    HELLO: 10,
    HEARTBEAT_RECEIVED: 11
}


function postRequest(url, data, callback, headers){
    if (headers == undefined){
        headers = {};
        if(discord_api.auth.token != undefined){
            headers = {
                'Content-Type': 'application/json',
                'Authorization': '' + discord_api.auth.token
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
        console.error("Error with Post["+error.response.status+"]("+url+"): ", error.response.data)
        if (error.response.data.success == undefined){
            error.response.data.success = false
            if (error.response.data == 200){
                error.response.data.success = true
            }
        }
        callback(error.response.data)
    })
}
String.prototype.format = function(){
    var final = String(this);
    for(let i=0; i<arguments.length;i++){
        final = final.replace(`%s${i+1}`, arguments[i])
    }
    return final || ''
}

function login(){
    if (discord_api.auth.token == undefined){
        postRequest(discord_api.api.base + discord_api.api.login, {email: discord_api.auth.email, password: discord_api.auth.password}, function(data){
            console.log("Post("+data.url+"): ", data.url)
            if (data.success == true){
                if (data.token != undefined){
                    discord_api.auth.token = data.token;
                    login_gateway();
                }
            }
        })
    }else{
        login_gateway();
    }
}
login()
function login_gateway(){
    const ws = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json", {
        perMessageDeflate: false
    });
    ws.on('open', function open() {
        // ws.send('something');
    });
    ws.on('ready', function incoming(data) {
        console.log("READY: ", data)
    });
    
    ws.on('message', function incoming(data) {
        data = JSON.parse(data);
        if (data.op == discord_opts.HELLO){
            if(data.d.heartbeat_interval != undefined){
                discord_api.auth.heartbeat_interval = data.d.heartbeat_interval;
                var identification = {
                    "op": discord_opts.IDENTIFY,
                    "d": {
                        "token": discord_api.auth.token,
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
                            "since": 1012827600,
                            "afk": false
                        }
                    }
                }
                console.log("sending: ", identification)
                ws.send(JSON.stringify(identification))
            }
        }else if (data.op == discord_opts.HEARTBEAT){
            login_gateway_send_heartbeat(ws);
        }else if (data.op == discord_opts.FAILED_OR_ZOMBIE){
            console.error("PROCCES CLOSING, FAILED / ZOMBIE");
            console.error("PROCCES CLOSING, FAILED / ZOMBIE");
            console.error("PROCCES CLOSING, FAILED / ZOMBIE");
            console.error("PROCCES CLOSING, FAILED / ZOMBIE");
            console.error("PROCCES CLOSING, FAILED / ZOMBIE");
            console.error("PROCCES CLOSING, FAILED / ZOMBIE");
            console.error("PROCCES CLOSING, FAILED / ZOMBIE");
            console.error("PROCCES CLOSING, FAILED / ZOMBIE");
            console.error("PROCCES CLOSING, FAILED / ZOMBIE");
            ws.close();
            process.exit();
        }else if (data.op == discord_opts.DISPATCH){
            discord_api.auth.heartbeat_s = data.s
            if(data.t == "READY"){
                discord_api.info.userinfo = data.d
                if (discord_api.auth.proceed_running === true){ return false; }
                discord_api.auth.proceed_running = true;
                login_gateway_send_heartbeat(ws);
                setInterval(function(){
                    login_gateway_send_heartbeat(ws);
                }, discord_api.auth.heartbeat_interval);
                proceed();
            }else if(data.t == "PRESENCE_UPDATE"){
                return true;
            }else if(data.t == "MESSAGE_CREATE"){
                message_received(data.d); 
            }else if(data.t == "PRESENCE_UPDATE"){
                return true;
            }else{
                console.error("Unkown event: ", data.t);
            }
        }else if (data.op == discord_opts.INVALID_SESSION){
            console.error("Invalid session");
            ws.close();
            process.exit();
        }else if (data.op == discord_opts.HEARTBEAT_RECEIVED){
            console.log("HEARTBEAT_RECEIVED");
        }else{
            console.error("Discord gateway unkown/handled: ", data);
            ws.close();
            process.exit()
            return false;
        }
    });
}
function login_gateway_send_heartbeat(ws){
    var heartbeat = {
        "op": discord_opts.HEARTBEAT,
        "d": (new Date()).getTime()
    }
    console.log("sending heartbeat: ", JSON.stringify(heartbeat))
    ws.send(JSON.stringify(heartbeat))
}

function message_received(data){
    var msg = data.content;
    console.log("Message received: ", msg);
    if(msg.includes("The police are here, and they're after you!")){
        var tmpStr  = msg.match("`(.*)`");
        var response = tmpStr[1];
        sendMessage(response);
    }else if(msg.includes("What type of meme do you want to po")){
        var tmpStr  = msg.match("`(.*)`");
        var response = tmpStr[1];
        sendMessage(response);
    }
}
function message_get_quoted_string(msg){
    var tmpStr  = msg.match("`(.*)`");
    return tmpStr[1];
}
function proceed(){
    run_farm()
    run_farm2();
    setInterval(function(){
        run_farm();
    }, 61*1000);
    setInterval(function(){
        run_farm2();
    }, 121*1000);
}
function run_farm2(){
    sendMessage("pls pm")
}
function run_farm(){
    sendMessage("pls beg");
    setTimeout(function(){ 
        sendMessage("pls search");
        setTimeout(function(){ 
            sendMessage("pls deposit all")
        }, 1000 * 10);
    }, 1000 * 10);
}
function sendMessage(message){
    postRequest(discord_api.api.base + discord_api.api.message.format(discord_api.info.targetChannelId), {content: message}, function(data){
        console.log("send message: ", message)
    })
}