exports.commands = [
    "startchess",
    "chess",
    "endchess",
    "acceptchess"
];

const spawn = require("child_process").spawn;
const boardgen = spawn('python', ['./boardimage/server.py']);
boardgen.stdout.on('data', (chunk)=>{
    msg.channel.stopTyping();
    boardgenqueue.shift().sendFile(chunk, "board.png");
});
var boardgenqueue = [];

const Chess = require('chess.js').Chess;
var runningGames = [];
var gameId = 0;
function game(ch, white, black, timeout) {
    this.id = (gameId+=1);

    this.channel = ch;
    this.pending = true;
    this.acceptTimeout = timeout;
    this.w = white;
    this.b = black;

    this.chess = new Chess();
}

exports.startchess = {
    usage: "<challenger>",
    describtion: "challenge a player to a new chess game",
    process: function(msg, suffix, bot, config) {
        var id;
        if (suffix.length>4) {
            id = suffix.substring(3,suffix.length-2);
        } else {
            throw new Error("invalid argument");
        }
        var challengee;
        if (!(challengee = bot.users.get(id))) {
            throw new Error("User not found");
        }

        var game = runningGames.find((el)=>(el.b == msg.author || el.w == challengee));
        if (typeof game == 'undefined') {
            msg.channel.sendMessage("You or your challengee is already in a game in "+game.channel+"! End or finish it first");
            return;
        }
        var challenger = challengee;
        msg.channel.sendMessage(challenger+" Accept with `"+config.commandPrefix+"acceptchess` within 1 minute")
        .then((chall)=>{
            var game = new game(msg.channel, challengee, msg.author, chessTimeout);
            runningGames.push();
            var chessTimeout = bot.setTimeout(()=>{
                chall.edit(challenger+" Challenge expired!");
                runningGames.splice(runningGames.findIndex((el)=>el.id==game.id), 1);
            }, 60000);
        });
    }
};

exports.acceptchess = {
    usage: "",
    describtion: "accept a challenge",
    process: function(msg, suffix, bot) {
        var game = runningGames.find((el)=>(el.w == msg.author));
        if (typeof game == 'undefined') {
            msg.channel.sendMessage("You have not been challenged to play any game!");
        } else if (!game.pending) {
            msg.channel.sendMessage("You are already in a game in "+game.channel+"! End or finish it first");
        } else {
            game.pending = false;
            bot.clearTimeout(game.timeout);
            msg.channel.sendMessage("Game started between "+game.w+" and "+game.b+"!");

            boardgen.stdin.write(JSON.stringify({
                type:"png",
                render:{
                    fen: game.fen().split(" ")[0]
                }
            })+"\n", undefined, ()=>{
                msg.channel.startTyping();
                boardgenqueue.append(msg.channel);
                msg.channel.sendMessage(game.w+" Your move!");
            });
        }
    }
};

exports.endchess = {
    usage: "",
    describtion: "give up a running game",
    process: function (msg, suffix, bot) {
        var gamei = runningGames.findIndex((el)=>(el.channel = msg.channel && (el.b == msg.author || el.w == msg.author)));
        if (gamei != -1) {
            var game = runningGames[gamei];
            msg.channel.sendMessage("Game between "+game.w+" and "+game.b+" has ended with a fold!");
            msg.channel.sendMessage("The winner is "+(game.b == msg.author ? game.w : game.b)+"!");
            runningGames.splice(gamei, 1);
        } else {
            msg.channel.sendMessage("You are not in a game!");
        }
    }
};

exports.chess = {
    usage: "<from> <to> [promotion]",
    describtion: "move a piece and, if necessary, promote it (initial of piece to promote to)",
    process: function (msg, suffix, bot, config) {
        var args = suffix.split(" ");
        if (args.length < 2) {
            msg.channel.sendMessage("insufficient arguments!\n**usage:** "+config.commandPrefix+"chess "+this.usage);
        }
        var gamei = runningGames.findIndex((el)=>(el.channel == msg.channel && (el.b == msg.author || el.w == msg.author)));
        if (gamei != -1) {
            var game = runningGames[gamei];
            var move = game.chess.move({from: args[0], to: args[1]});
            if (move === null) {
                msg.channel.sendMessage("Illegal move!");
            }
            boardgen.stdin.write(game.fen().split(" ")[0], undefined, ()=>{
                msg.channel.startTyping();
                boardgenqueue.append(msg.channel);
                msg.channel.sendMessage(game[game.chess.turn()]+" Your move!\n**usage:** "+config.commandPrefix+"chess "+this.usage);
            });
        } else {
            msg.channel.sendMessage("You are not in a game!");
        }
    }
};
