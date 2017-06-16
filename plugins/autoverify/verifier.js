var DB;
var processingCode = [];
var command = "?verify";
var cp = require('./copypastas.json');
var redditauth = require('./redditauth.json');
redditauth.userAgent = randomString(16, "#aA");

const snoowrap = require('snoowrap');
const rr = new snoowrap(redditauth);

exports.commands = [
    "howto",
    "verifyreddit"
];
exports.shutdown = function(bot) {
    bot.removeListener("message", listener);
};
exports._prerun = function(bot) {
    DB = bot;
    bot.on("message", autoVerify);

    for (var cpk in cp) {
        for (var i = 0, len=cp[cpk].length; i < len-1; i++) {
            if (cp[cpk].substr(i,2) == "<#") {
                var endi = cp[cpk].substr(i).indexOf(">");
                var channelId = cp[cpk].substr(i+2, endi-2);
                var cmm = bot.channels.get(channelId).toString();
                cp[cpk] = cp[cpk].slice(0, i)+cmm+cp[cpk].substr(i+endi+1);
                len = cp[cpk].length;
                i+=cmm.length-1;
            }
        }
    }
};

exports.verifyreddit = {
    usage:"<username>",
    description:"verify a user through reddit",
    process:function(bot, msg, suffix, config) {
        var code = randomString(6, "#");
        rr.composeMessage({
            to:suffix,
            subject:"verification code",
            text: "the code is "+code+"\nPlease send it back in discord",
        }).then(()=>{
            msg.edit("code sent! check your inbox");
            processingCode.push(code);
        }).catch((err)=>{
            throw Error(err);
        });
    }
};

exports.howto = {
    usage: "",
    description: "post the howto for new users to follow",
    process: function(bot, msg, suffix, config) {
        msg.channel.send(cp.howto);
    }
};

function autoVerify(msg){
    if (msg.content.slice(0, command.length+1) == command+" " && msg.author.id == DB.user.id) {
        var welcoming = DB.users.get(Array.prototype.filter.call(msg.content.slice(command.length+1), char=>"0123456789".includes(char)).join(""));
        var wChannel = DB.channels.get("237973577633103884");
        DB.setTimeout(()=>{
            wChannel.send("Welcome to BetaBase "+welcoming+"!");
            wChannel.send(cp.welcome);
            msg.channel.send(cp.howto);
        }, 2500);
    }
    for (var i = 0; i < processingCode.length; i++) {
        var index = msg.content.indexOf(processingCode[i]);
        if (index!=-1) {
            processingCode.splice(index, 1);
            msg.channel.startTyping();
            DB.setTimeout(()=>msg.channel.sendMessage("correct!"), 1000);
            DB.setTimeout(()=>{
                msg.channel.sendMessage(command+" "+msg.author);
                msg.channel.stopTyping(true);
            }, 2000);
        }
    }
}

function randomString(length, chars) {
    var mask = '';
    if (chars.indexOf('a') != -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') != -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') != -1) mask += '0123456789';
    if (chars.indexOf('!') != -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
    return result;
}
