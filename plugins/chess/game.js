exports.commands = [
    "startchess",
    "chess",
    "endchess",
    "acceptchess"
];

const spawn = require("child_process").spawn;
const boardgen = spawn('python', ['plugins/chess/boardgen/server.py']);
boardgen.stdout.on('data', (chunk)=>{
    var ch = boardgenqueue.shift();
    ch.stopTyping();
    ch.sendFile(chunk, "board.png");
});
boardgen.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
var boardgenqueue = [];

const Chess = require('chess.js').Chess;
var runningGames = [];
var gameId = 0;

function Game(ch, white, black) {
    this.id = (gameId+=1);

    this.channel = ch;
    this.pending = true;
    this.w = white;
    this.b = black;

    this.chess = new Chess();
}

exports.startchess = {
    usage: "<challenger>",
    describtion: "challenge a player to a new chess game",
    process: function(bot, msg, suffix, config) {
        var id;
        if (suffix.length>4) {
            id = suffix.substring(2,suffix.length-1);
        } else {
            throw new Error("invalid argument");
        }
        var challengee;
        if (!(challengee = bot.users.get(id))) {
            throw new Error("User not found");
        }

        console.log(challengee.username);

        var game = runningGames.find((el)=>(el.b == msg.author || el.w == challengee));
        if (typeof game != 'undefined') {
            msg.channel.sendMessage("You or your challengee is already in a game in "+game.channel+"! End or finish it first");
            throw Error("Already in game");
        }
        msg.channel.sendMessage(challengee+" Accept with `"+config.commandPrefix+"acceptchess` within 1 minute")
        .then((chall)=>{
            var game = new Game(msg.channel, challengee, msg.author);
            game.acceptTimeout = bot.setTimeout(()=>{
                chall.edit(msg.author+" Challenge expired!");
                runningGames.splice(runningGames.findIndex((el)=>el.id==game.id), 1);
            }, 60000);
            runningGames.push(game);
        });
    }
};

exports.acceptchess = {
    usage: "",
    describtion: "accept a challenge",
    process: function(bot, msg, suffix, config) {
        var game = runningGames.find(function(el) {return (el.w.id == msg.author.id);});
        if (typeof game == 'undefined') {
            msg.channel.sendMessage("You have not been challenged to play any game!");
        } else if (!game.pending) {
            msg.channel.sendMessage("You are already in a game in "+game.channel+"! End or finish it first");
        } else {
            game.pending = false;
            bot.clearTimeout(game.acceptTimeout);
            msg.channel.sendMessage("Game started between "+game.w+" and "+game.b+"!");

            boardgen.stdin.write(JSON.stringify({
                type:"png",
                render:{
                    fen: game.chess.fen().split(" ")[0]
                }
            })+"\n", undefined, ()=>{
                msg.channel.startTyping();
                boardgenqueue.push(msg.channel);
                msg.channel.sendMessage(game.w+" Your move!\n"+game[game.chess.turn()]+" Your move!\n**usage:** "+config.commandPrefix+"chess "+this.usage);
            });
        }
    }
};

exports.endchess = {
    usage: "",
    describtion: "give up a running game",
    process: function (bot, msg, suffix) {
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
    process: function (bot, msg, suffix, config) {
        var args = suffix.split(" ");
        if (args.length < 2) {
            msg.channel.sendMessage("insufficient arguments!\n**usage:** "+config.commandPrefix+"chess "+this.usage);
            throw new Error("argument error");
        }
        var gamei = runningGames.findIndex((el)=>(el.channel == msg.channel && (el.b == msg.author || el.w == msg.author)));
        if (gamei != -1) {
            var game = runningGames[gamei];
            var move = game.chess.move({from: args[0], to: args[1]});
            if (move === null) {
                msg.channel.sendMessage("Illegal move!");
                return;
            }
            boardgen.stdin.write(JSON.stringify({
                type:"png",
                render:{
                    fen: game.chess.fen().split(" ")[0],
                    lastMove: move === null ? null : args[0]+args[1]
                }
            })+"\n", undefined, ()=>{
                msg.channel.startTyping();
                boardgenqueue.push(msg.channel);
                msg.channel.sendMessage(game[game.chess.turn()]+" Your move!\n**usage:** "+config.commandPrefix+"chess "+this.usage);
            });
        } else {
            msg.channel.sendMessage("You are not in a game!");
        }
    }
};
