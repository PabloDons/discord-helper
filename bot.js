const Discord   = require('discord.js');
const fs        = require('fs');
const auth      = require('./auth.json');
const path      = require('path');
const readline = require('readline');
var stdinrl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

var perms;
try{
	perms = require("./permissions.json");
} catch(e) { //no permissions file, use defaults
	perms = {
        "global": {
            "ping": true
        }
    };
	fs.writeFile("./permissions.json", JSON.stringify(perms,null,4));
}

var config;
try{
	config = require("./config.json");
} catch(e) { //no permissions file, use defaults
	config = {
        commandPrefix: "!",
        debug: false
    };
	fs.writeFile("./config.json", JSON.stringify(config,null,4));
}

var commands = {
    "ping": {
		usage:"",
		description:"check response time",
        process:function(bot, msg, suffix) {
			var start = new Date();
            msg.channel.sendMessage("pong!").then((m)=>{
				var end = new Date();
				m.edit("pong! | "+(end - start)+"ms");
			});
        }
    },
    "eval": {
		usage: "<command>",
		description: 'Executes arbitrary javascript in the bot process. User must have "eval" permission',
		process: function(bot, msg, suffix) {
            console.log("evaluating "+suffix);
			var result, start, end;
			try {
				result = eval(suffix);
			} catch(e) {
				result = e.name + ": " + e.message;
			}
            var embed = {
                color:0x00ff00,
                fields:[
                    {
                        name:"Input code",
                        value:"```javascript\n"+suffix+"\n```"
                    },
                    {
                        name:"Output",
                        value:"```\n"+result+"\n```"
                    }
                ],
                timestamp: new Date()
            };
            msg.channel.sendEmbed(embed);
		}
	}
};

stdinrl.on('line', function(line){
	commands.eval.process(bot, {channel:{sendEmbed:function(embed){
        process.stdout.write(embed.fields[1].value.substring(4,embed.fields[1].value.length-3));
    }}}, line);
});

function onExit() {
    console.log("exiting...");
    bot.destroy().then(process.exit);
}
process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);



function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
        return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
}

//// Discord bot
var bot = new Discord.Client();

var chatlogger = {};
bot.on('message', (msg) => {
	if (msg.content.substring(0, config.commandPrefix.length) == config.commandPrefix) {
		console.log(msg.author.username+": treating "+msg.content+" as command...");
		var command = msg.content.split(" ")[0].substring(config.commandPrefix.length);
		if (msg.author.id == bot.user.id || perms.global[command] || (perms.users.hasOwnProperty(msg.author.id) && perms.users[msg.author.id][command])) {
			var suffix = msg.content.substr(config.commandPrefix.length+command.length+1);
			if (command == "help") {
				var help = [];
				for (var cmd in commands) {
					help.push("**"+config.commandPrefix+cmd+" "+commands[cmd].usage+"**:\n    "+commands[cmd].description);
				}
				msg.author.sendMessage(help.join("\n"), {split:true});
			} else if (commands.hasOwnProperty(command)) {
				try {
					commands[command].process(bot, msg, suffix, config);
					console.log("command succeeded");
				} catch(e) {
					console.log("command "+suffix+" failed");
					if(config.debug){
						console.log(e.stack);
					}
				}
			} else {
				console.log("no such command");
			}
		} else {
			console.log("permission denied");
		}
	}
});
// bot.on('message', (msg) => {
// 	if (msg.channel.id != chatlogger.channel) {
// 		chatlogger.channel = msg.channel.id;
// 		chatlogger.author = "";
// 		if (msg.channel.type == "dm") {
// 			console.log(msg.channel.recipient.username);
// 		} else if (msg.channel.type == "text") {
// 			console.log(msg.guild.name+"#"+msg.channel.name);
// 		} else if (msg.channel.type == "group") {
// 			console.log(msg.channel.name || msg.channel.recipients.array().toString())
// 		}
// 	}
// 	if (msg.author.id != chatlogger.author) {
// 		chatlogger.author = msg.author.id;
// 		console.log("    "+msg.author.username);
// 	}
// 	console.log("        "+msg.content);
// });

console.log('Authenticating with discord...');
bot.login(auth.token).then((s) => {
    console.log("Authenticated!");
    console.log("Loading plugins...");

    //// loading plugins
    const plugin_directory = "./plugins/";
    const plugin_folders = getDirectories(plugin_directory);
    for (let i = 0; i < plugin_folders.length; i++) {
        let modpack = require(plugin_directory+plugin_folders[i]+'/package.json');
        let plugin = require(plugin_directory+plugin_folders[i]+'/'+modpack.main);
        for (let i = 0; i < plugin.commands.length; i++) {
            if (commands.hasOwnProperty(plugin.commands[i])) {
                console.err('Error: Command conflict: '+plugin.commands[i] +
                    '\nCould not load plugin \''+plugin_folders[i]+'\'');
            }
            commands[plugin.commands[i]] = plugin[plugin.commands[i]];
        }
        if (plugin._prerun) {
            plugin._prerun(bot);
        }
    }
    console.log("Done! use "+config.commandPrefix+"help for a list of commands");
});
