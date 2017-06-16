const later = require('later');
const EventEmitter = require('events');

var logTarget = new EventEmitter();
exports.logTarget = logTarget;
function _log(level, message) {
    logTarget.emit('logMessage', message, level);
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

var tasks = [];

exports._prerun = function(bot) {
    var crons;
    try{
        crons = require("./crons.json");
    } catch(e){ //no config file, use defaults
        log.warning("No cronfile found. Remember to move the example file");
        crons = [];
    }

    for (var i in crons) {
        var channel = bot.channels.get(crons[i].channelId);
        if (channel) {
            var sched = later.parse.cron(crons[i].date);
            var t = later.setInterval(function() {
                channel.sendMessage(crons[i].text);
            }, sched);
            tasks.push(t);
        } else {
            log.warning("cron '"+i+"' failed: no such channel!");
        }
    }
};

exports.cron = {
    usage:"<s> <m> <h> <dom> <mon> <dow> <command>",
    process:function(bot, msg, suffix) {
        var args = suffix.split(" ");
        if (args.length<7) {
            throw new Error("Too few arguments");
        }
        var thisCron = {
            date:args.splice(0, 6).join(" "),
            channelId:msg.channel.id,
            text:args.join(" ")
        };
        var t = later.setInterval(()=>{
            msg.channel.sendMessage(thisCron.text);
        }, later.parse.cron(thisCron.date));

        tasks.push(t);
    }
};

exports.commands = [
    "cron"
];

exports.shutdown = ()=>{
    for (var i = 0; i < tasks.length; i++) {
        tasks[i].clear();
    }
};
