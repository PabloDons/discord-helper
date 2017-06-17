const Discord   = require('discord.js');
const fs        = require('fs');
const auth      = require('./auth.json');
const path      = require('path');
const readline  = require('readline');
const Log       = require('log');

var config = loadConfig("config");
var perms = loadConfig("permissions");
var enabledPlugins = loadConfig("enabledplugins");

const log = new Log(config.debug ? "debug" : "info");

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
            var result;
            var start = new Date();
            try {
                result = eval(suffix);
            } catch(e) {
                result = e.name + ": " + e.message;
            }
            var end = new Date();
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
                footer: {
                    icon_url: bot.user.avatarURL,
                    text: "Time: "+(end-start)+"ms"
                },
                timestamp: new Date()
            };
            msg.edit("", {embed:embed});
        }
    },
    "shutdown": {
        usage: "",
        describtion: "shuts down the bot",
        process: function (bot, msg) {
            config.wait = true;
            fs.writeFile("./config.json", JSON.stringify(config, null, 4));
            msg.channel.send("Shutting down bot...").then(onExit);
        }
    }
};

process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);

//// Discord bot
var bot = new Discord.Client();

log.info('Authenticating with discord...');
bot.login(auth.token).then(() => {
    log.info("Authenticated!");

    //// loading plugins
    if (config.wait) {
        log.info("waiting for user to active bot");
        bot.on("message", wait4self);
        config.wait = false;
        fs.writeFile("./config.json", JSON.stringify(config, null, 4));
    } else {
        loadBot();
    }

    function wait4self(msg) {
        if (msg.author.id == bot.user.id) {
            loadBot();
            bot.removeListener("message", wait4self);
        }
    }
});

function onMessage(msg) {
    if (msg.content.substring(0, config.commandPrefix.length) == config.commandPrefix) {
        log.info(msg.author.username+" executed command "+msg.content);
        var command = msg.content.split(" ")[0].substring(config.commandPrefix.length);
        if ( checkPermission(msg, command) ) {
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

function checkPermission(msg, command) {
    if (msg.author.id == bot.user.id) return true;
    if (perms.global.indexOf(command)!=-1) return true;
    if (perms.users.hasOwnProperty(msg.author.id)) {
        if (perms.users[msg.author.id].hasOwnProperty(command)) return true;
    }
    if (perms.nodes.hasOwnProperty(command)) {
        if (msg.channel.type == "text") {
            return msg.member.hasPermission(perms.nodes[command]);
        }
    }
    return false;
}

function loadBot() {
    bot.on('message', onMessage);
    log.info("Loading plugins...");
    var plugin_directory = "./plugins/";
    for (let i = 0; i < enabledPlugins.length; i++) {
        let pluginIndex = enabledPlugins.indexOf(enabledPlugins[i]);
        if (pluginIndex!==-1) {
            log.info("loading plugin "+enabledPlugins[i]+"...");

            enabledPlugins.splice(pluginIndex, 1);
            let modpack = require(plugin_directory+enabledPlugins[i]+'/package.json');
            let plugin = require(plugin_directory+enabledPlugins[i]+'/'+modpack.main);
            if (!plugin.shutdown) {
                log.error("plugin '"+enabledPlugins[i]+"' does not have shutdown function");
                throw new Error("could not load plugin '"+enabledPlugins[i]+"'");
            } else {
                pluginshutdowns.push(plugin.shutdown);
            }
            for (let i = 0; i < plugin.commands.length; i++) {
                if (commands.hasOwnProperty(plugin.commands[i])) {
                    log.error('Error: Command conflict: '+plugin.commands[i] +
                        '\nCould not load plugin \''+enabledPlugins[i]+'\'');
                }
                if (plugin.hasOwnProperty(plugin.commands[i])) {
                    commands[plugin.commands[i]] = plugin[plugin.commands[i]];
                } else {
                    log.warning("could not find command "+enabledPlugins[i]+"."+plugin.commands[i]);
                }
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
}

function onExit() {
    log.info("exiting...");
    bot.destroy().then(process.exit);
}

function loadConfig(name) {
    var data;
    try{
        data = require("./"+name+".json");
    } catch(e) { // ile doesn't exist, use defaults
        data = require("./"+name+".example.json");
        fs.writeFile("./"+name+".json", JSON.stringify(data,null,4));
    }
    return data;
}
