/* jshint esversion:6*/
const Discord   = require('discord.js');
const fs        = require('fs');
const auth      = require('./auth.json');
const config    = require('./config.json');
const perms     = require('./permissions.json');

var commands = {
    "ping": {
        process:function(bot, msg, suffix) {
            msg.channel.sendMessage(suffix || "pong!");
        }
    },
    "eval": {
		usage: "<command>",
		description: 'Executes arbitrary javascript in the bot process. User must have "eval" permission',
		process: function(bot, msg, suffix) {
            console.log("evaluating "+suffix);
            eval(suffix, bot);
            // --eval msg.edit("",{embed:{author:{name:"Pablo"},thumbnail:{url:"https://i.imgur.com/RDzNF7D.png"},title:"plz ignore",description:"This is a spoopy post"}});
		}
	}
};

//// Loading plugins
function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
        return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
}

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
}

function onExit() {
    console.log("exiting...");
    bot.destroy().then(process.exit());
}
process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);


//// Discord bot
var bot = new Discord.Client();
bot.on('message', (msg) => {
    if (msg.content.substring(0, config.commandPrefix.length) == config.commandPrefix) {
        console.log("treating "+msg.content+" as command...");
        var command = msg.content.split(" ")[0].substring(config.commandPrefix.length);
        var suffix = msg.content.substr(config.commandPrefix.length+command.length+1);
        if ((!perms.global.hasOwnProperty(command) || perms.global[command]) || (perms.users[msg.author.id] && perms.users[msg.author.id][command])) {
                if (commands.hasOwnProperty(command)) {
                    try {
                        commands[command].process(bot, msg, suffix);
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

console.log('Authenticating with discord...');
bot.login(auth.token).then((s) => console.log("Authenticated!"));
