const Discord   = require('discord.js');
const fs        = require('fs');
const auth      = require('./auth.json');
const path      = require('path');
const readline  = require('readline');
const Log       = require('log');

var stdinrl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

var config;
try{
    config = require("./config.json");
} catch(e) { //no file, use defaults
    config = {
        commandPrefix: "!",
        debug: false
    };
    fs.writeFile("./config.json", JSON.stringify(config,null,4));
}
const log = new Log(config.debug ? "debug" : "info");

var perms;
try{
    perms = require("./permissions.json");
} catch(e) { //no permissions file, use defaults
    perms = {
        "global": {
            "ping": true
        },
        "users": {},
        "nodes": {
            "shutdown": "MANAGE_MESSAGES"
        }
    };
    fs.writeFile("./permissions.json", JSON.stringify(perms,null,4));
}

var enabledPlugins;
try{
    enabledPlugins = require("./enabledplugins.json");
} catch(e) { //no file, use defaults
    enabledPlugins = require("./enabledplugins.example.json");
    fs.writeFile("./enabledplugins.json", JSON.stringify(enabledPlugins,null,4));
}

var pluginshutdowns = [];

var commands = {
    "ping": {
        usage:"",
        description:"check response time",
        process:function(bot, msg, suffix) {
            var start = new Date();
            msg.channel.send("pong!").then((m)=>{
                var end = new Date();
                m.edit("pong! | "+(end - start)+"ms");
            });
        }
    },
    "eval": {
        usage: "<command>",
        description: 'Executes arbitrary javascript in the bot process. User must have "eval" permission',
        process: function(bot, msg, suffix) {
            log.debug("evaluating "+suffix);
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
            msg.edit("", {embed:embed});
        }
    },
    "shutdown": {
        usage: "",
        describtion: "shuts down the bot",
        process: function (bot, msg, suffix) {
            msg.channel.send("Shutting down bot...").then(()=>{
                for (var i = 0; i < pluginshutdowns.length; i++) {
                    pluginshutdowns[i](bot);
                }

                bot.removeListener("message", onMessage);
                log.warning("shut down... restarting process once user starts talking");
                bot.on("message", (msg)=>{
                    if (msg.author.id == bot.user.id) {
                        log.info("restarting bot...");
                        bot.destroy().then(()=>process.exit);
                    }
                });
            });
        }
    }
};

stdinrl.on('line', function(line){
    commands.eval.process(bot, {
        edit: process.stdout.write
    }, line);
});

function onExit() {
    log.info("exiting...");
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
bot.on('message', onMessage);

/*bot.on('messageDelete', (msg)=>{
    var exceptions = [
        bot.user.id
    ];
    var servers = [
        "116914772766752769",
        "119839902186733569"
    ];
    var commandPrefixes = [
        "t!",
        "?",
        "+",
        "--"
    ];
    var now = new Date();
    var msgUser = msg.author;
    if (msg.createdAt - now > 10000 || exceptions.indexOf(msgUser.id) != -1 || servers.indexOf(msg.guild.id) == -1 || msgUser.bot || commandPrefixes.some((el)=>msg.content.indexOf(el)==0)) {
        return;
    }
    console.log("Sending deleted message by "+msgUser.username);
    msg.channel.sendEmbed({
        author: {
            name: msgUser.username+"#"+msg.author.discriminator,
            icon_url: msgUser.displayAvatarURL
        },
        description: "**Message sent by "+msgUser+" deleted in "+msg.channel+"**\n"+msg.content,
        timestamp: now,
        color: Number(msg.guild.members.get(msgUser.id).highestRole.color)

    }).catch((e)=>console.error(e));
});*/

log.info('Authenticating with discord...');
bot.login(auth.token).then((s) => {
    log.info("Authenticated!");
    log.info("Loading plugins...");

    //// loading plugins
    const plugin_directory = "./plugins/";
    const plugin_folders = getDirectories(plugin_directory);
    for (let i = 0; i < plugin_folders.length; i++) {
        let pluginIndex = enabledPlugins.indexOf(plugin_folders[i]);
        if (pluginIndex!==-1) {
            log.info("loading plugin "+plugin_folders[i]+"...");

            enabledPlugins.splice(pluginIndex, 1);
            let modpack = require(plugin_directory+plugin_folders[i]+'/package.json');
            let plugin = require(plugin_directory+plugin_folders[i]+'/'+modpack.main);
            if (!plugin.shutdown) {
                log.error("plugin '"+plugin_folders[i]+"' does not have shutdown function");
                throw new Error("could not load plugin '"+plugin_folders[i]+"'");
            } else {
                pluginshutdowns.push(plugin.shutdown);
            }
            for (let i = 0; i < plugin.commands.length; i++) {
                if (commands.hasOwnProperty(plugin.commands[i])) {
                    log.error('Error: Command conflict: '+plugin.commands[i] +
                        '\nCould not load plugin \''+plugin_folders[i]+'\'');
                }
                commands[plugin.commands[i]] = plugin[plugin.commands[i]];
            }
            if (plugin.logTarget) {
                plugin.logTarget.on('logMessage', logEvent);
            }
            if (plugin._prerun) {
                plugin._prerun(bot);
            }
        }
    }
    log.info("Done! use "+config.commandPrefix+"help for a list of commands");

    function logEvent(msg, level){
        log[level](msg);
    }
});

function onMessage(msg) {
    if (msg.content.substring(0, config.commandPrefix.length) == config.commandPrefix) {
        log.info(msg.author.username+" executed command "+msg.content);
        var command = msg.content.split(" ")[0].substring(config.commandPrefix.length);
        if ( ((perms.nodes.hasOwnProperty(command) && msg.member.hasPermission(perms.nodes[command])) || msg.author.id == bot.user.id || perms.global[command] || (perms.users.hasOwnProperty(msg.author.id) && perms.users[msg.author.id][command]))) {
            var suffix = msg.content.substr(config.commandPrefix.length+command.length+1);
            if (command == "help") {
                var help = [];
                for (var cmd in commands) {
                    help.push("**"+config.commandPrefix+cmd+" "+commands[cmd].usage+"**:\n    "+commands[cmd].description);
                }
                msg.author.send(help.join("\n"), {split:true});
            } else if (commands.hasOwnProperty(command)) {
                try {
                    commands[command].process(bot, msg, suffix, config);
                    log.info("command succeeded");
                } catch(e) {
                    log.info("command "+suffix+" failed");
                    log.debug(e.stack);
                }
            } else {
                log.info("no such command");
            }
        } else {
            log.info("permission denied");
        }
    }
}
