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
    "command"
];
exports.shutdown = function(bot) {

};
exports._prerun = function(bot) {

};

exports.command = {
    usage: "<argument> <argument2> [optional]",
    description: "a plugin skeleton",
    process: function(bot, msg, suffix, config) {

    }
};
