

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

exports.commands = [
    "purge",
    "tristana"
];
exports.shutdown = function() {

};
exports._prerun = function(bot) {

};

exports.purge = {
    usage: "<channel>",
    description: "spams a channel without mercy",
    process: function(bot, msg, suffix, config) {
        
    }
};

exports.tristana = {
    usage: "<words>",
    description: "send one message per letter to the channel",
    process: function(bot, msg, suffix, config) {
        var victimChannel = msg.channel;
        msg.delete();
        var anreg = /[a-zA-Z0-9]/;
        for (var i = 0; i < suffix.length; i++) {
            if (anreg.test(suffix[i])) {
                victimChannel.send(suffix[i]);
            }
        }
    }
};
