/* jshint esversion:6 */
const cron = require('cron').CronJob;
var crons;
try{
	crons = require("./crons.json");
} catch(e){ //no config file, use defaults
	crons = [];
	try{
		if(fs.lstatSync("./crons.json").isFile()){
			console.log("WARNING: crons.json found but we couldn't read it!\n" + e.stack);
		}
	} catch(e2){
		fs.writeFile("./crons.json", JSON.stringify(crons,null,4));
	}
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
        new cron(args.splice(0, 6).join(" "), function() {
            msg.channel.sendMessage(args.join(" "));
        }, null, true);
    }
};

exports.commands = [
    "cron"
];
