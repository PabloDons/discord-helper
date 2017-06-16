
const guilds = [
    "236590267791048706"
];

exports.commands = [];
exports._prerun = function(bot) {
    bot.on("guildMemberAdd", (member)=>{
        if (guilds.indexOf(member.guild.id)!==-1) {
            var verifier = member.guild.roles.find("name", "Verifier");
            if (verifier) {
                member.guild.defaultChannel.send(verifier+" do your job! the faggot "+member.displayName+" needs your help").then((msg)=>{
                    msg.edit(verifier+" do your job! the faggot "+member+" needs your help");
                });
            }
        }
    });
};
