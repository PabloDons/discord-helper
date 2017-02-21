/* jshint esversion:6 */
const cron = require('cron').CronJob;
const fs = require('fs');
var crons;
try{
	crons = require("./config.json");
} catch(e){ //no config file, use defaults
	crons = ["test"];
	fs.writeFile("./config.json", JSON.stringify(crons,null,4));
}


exports._prerun = function(bot) {
    for (var i in crons) {
        var channel = bot.channels.get(crons[i].channelId);
        if (channel) {
            new cron(crons[i].date, function() {
                channel.sendMessage(crons[i].text);
            }, null, true);
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
            console.log("command failed!");
            return;
        }
		var cron = {
			date:args.splice(0, 6).join(" "),
			channelId:msg.channel.id,
			text:args.join(" ")
		};
        new cron(cron.date, function() {
            msg.channel.sendMessage(cron.text);
        }, null, true);
		crons.push(cron);
		fs.writeFile("./config.json", JSON.stringify(crons,null,4));
    }
};

exports.commands = [
    "cron"
];
