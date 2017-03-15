const cron = require('node-cron');
const fs = require('fs');
var crons;
try{
	crons = require("../../crons.json");
} catch(e){ //no config file, use defaults
	crons = [];
	fs.writeFile("./crons.json", JSON.stringify(crons,null,4));
}


exports._prerun = function(bot) {
    for (var i in crons) {
        var channel = bot.channels.get(crons[i].channelId);
        if (channel) {
            cron.schedule(crons[i].date, () => channel.sendMessage(crons[i].text));
        } else {
            console.log("cron "+i+" failed: no such channel!");
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
        cron.schedule(thisCron.date, () => msg.channel.sendMessage(thisCron.text));
		crons.push(thisCron);
		fs.writeFile("./crons.json", JSON.stringify(crons,null,4));
    }
};

exports.commands = [
    "cron"
];
