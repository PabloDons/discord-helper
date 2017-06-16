String.prototype.cleanup = function() {
   return this.replace(/[^a-zA-Z0-9]+/g, "-");
}

var https = require('https');
var fs = require('fs');
var path = require('path');
var users = require("./users.json");

const EventEmitter = require('events');

var logTarget = new EventEmitter();
exports.logTarget = logTarget;
function _log(level, message) {
    logTarget.emit('logMessage', message, level);
    // console.log(new Date()+" "+level.toUpperCase()+" "+message);
}
var log = {
    emergency : (msg)=>_log( "emergency" , msg),
    alert     : (msg)=>_log( "alert"     , msg),
    critical  : (msg)=>_log( "critical"  , msg),
    error     : (msg)=>_log( "error"     , msg),
    warning   : (msg)=>_log( "warning"   , msg),
    notice    : (msg)=>_log( "notice"    , msg),
    info      : (msg)=>_log( "info"      , msg),
    debug     : (msg)=>_log( "debug"     , msg)
};

exports.shutdown = function(bot) {
    bot.removeListener("message", onMessage);
};
exports._prerun = function(bot) {
    bot.on("message", onMessage);
};
exports.commands = [];

function onMessage(msg) {
    var images = msg.attachments.filterArray((at)=>Boolean(at.width));
    if (images.length>0){
        log.debug("Image was sent in "+msg.guild.name+"by ");
        // log.debug(JSON.stringify(users.users.global)+" : '"+msg.author.id+"'");
        // log.debug(typeof users.users.guilds[msg.guild]);
        // if (typeof users.users.guilds[msg.guild.id] != "undefined"){
        //     log.debug(users.users.guilds[msg.guild.id]+" : '"+msg.author.id+"'");
        // }
        if (
            (
                users.users.global.indexOf(msg.author.id)!=-1
            ) || (
                typeof users.users.guilds[msg.guild.id] != "undefined" &&
                users.users.guilds[msg.guild.id].indexOf(msg.author.id)!==-1
            ) || (
                users.channels.global.indexOf(msg.channel.id)!==-1
            ) || (
                users.guilds.global.indexOf(msg.guild.id)!==-1
            )
        ) {
            log.info("saving "+images.length+" image"+(images.length>1?"s":"")+" by "+msg.author.username);
            for (var i = 0; i < images.length; i++) {
                var fileType = images[i].url.substr(images[i].url.lastIndexOf("."));
                var filePath = "images/"+msg.guild.name.cleanup()+"/"+msg.channel.name.cleanup()+"/"+msg.author.username.cleanup()+"/"+images[i].id+fileType;
                ensureDirectoryExistence(filePath);
                var fileStream = fs.createWriteStream(filePath);
                https.get(images[i].url, (response)=>{
                    // log.debug("status code: "+response.statusCode);
                    log.debug("piping image to "+fileStream.path);
                    response.pipe(fileStream);
                });
            }
        }
    }
}

function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}
