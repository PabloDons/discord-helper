const Omegle = require('omegle-node');
const om = new Omegle();
var channel;

om.on('omerror',function(err){
    console.log('Omegle: error: ' + err);
    if (om.connected()) {
        om.disconnect();
    }
});

om.on('gotID',function(id){
    console.log('Omegle: connected to the server as: ' + id);
});

om.on('recaptchaRequired', function() {
    om.once('disconnected', function() {
        om.connect();
    });
    om.disconnect();
});

om.on('connected',function(){
    channel.send('**Omegle:** connected to stranger');
    om.send("You are connected to a public chat, say hi!");
});

om.on('gotMessage',function(msg){
    channel.send("**stranger:** "+msg);
});

om.on('strangerDisconnected', function() {
    channel.send("stranger disconnected");
});
exports._prerun = function (bot) {
    bot.on("message", (msg)=>{
        if (channel == msg.channel && om.connected()) {
            om.send(msg.member.displayName+": "+msg.content);
        }
    });
};
exports.commands = [
    "omconnect",
    "omdisconnect"
];
exports.omconnect = {
    usage: "",
    describtion: "",
    process: function(bot, msg, suffix, config) {
        if (!om.connected()) {
            channel = msg.channel;
            om.connect();
        } else {
            msg.channel.send("already connected to a chat! use `"+config.commandPrefix+"omdisconnect` to disconnect");
        }
    }
};

exports.omdisconnect = {
    usage: "",
    describtion: "",
    process: function(bot, msg, suffix) {
        if (om.connected()) {
            om.disconnect();
        } else {

        }
    }
};
