exports.commands = [
    "startchess",
    "chess",
    "endchess",
    "acceptchess"
];

const spawn = require("child_process").spawn;
const boardgen = spawn('python3', ['plugins/chess/boardgen/server.py']);
boardgen.stdout.on('data', (chunk)=>{
    var boardgenItem = boardgenqueue.shift();
    boardgenItem.ch.stopTyping();
    boardgenItem.ch.sendFile(chunk, "board.png", boardgenItem.msg);
});
boardgen.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

exports.shutdown = function() {
    boardgen.kill();
};
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
            if (id[0] == "!") {
                id = id.substring(1);
            }
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
            msg.channel.send("You or your challengee is already in a game in "+game.channel+"! End or finish it first");
            throw Error("Already in game");
        }
        msg.channel.send(challengee+" Accept with `"+config.commandPrefix+"acceptchess` within 1 minute")
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
            msg.channel.send("You have not been challenged to play any game!");
        } else if (!game.pending) {
            msg.channel.send("You are already in a game in "+game.channel+"! End or finish it first");
        } else {
            game.pending = false;
            bot.clearTimeout(game.acceptTimeout);
            msg.channel.send("Game started between "+game.w+" and "+game.b+"!");

            boardgen.stdin.write(JSON.stringify({
                type:"png",
                render:{
                    fen: game.chess.fen().split(" ")[0]
                }
            })+"\n", undefined, ()=>{
                msg.channel.startTyping();
                boardgenqueue.push({
                    ch:msg.channel,
                    msg:game[game.chess.turn()]+" Your move!\n**usage:** "+config.commandPrefix+"chess "+"<from> <to>"
                });
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
            msg.channel.send("Game between "+game.w+" and "+game.b+" has ended with a fold!");
            msg.channel.send("The winner is "+(game.b == msg.author ? game.w : game.b)+"!");
            runningGames.splice(gamei, 1);
        } else {
            msg.channel.send("You are not in a game!");
        }
    }
};

exports.chess = {
    usage: "<from> <to> [promotion]",
    describtion: "move a piece and, if necessary, promote it (initial of piece to promote to)",
    process: function (bot, msg, suffix, config) {
        var args = suffix.split(" ");
        if (args.length < 2) {
            msg.channel.send("insufficient arguments!\n**usage:** "+config.commandPrefix+"chess "+this.usage);
            throw new Error("argument error");
        }
        var gamei = runningGames.findIndex((el)=>(el.channel == msg.channel && (el.b == msg.author || el.w == msg.author)));
        if (gamei != -1) {
            var game = runningGames[gamei];
            var move = game.chess.move({from: args[0], to: args[1]});
            var boardgenparams = {
                type:"png",
                render:{
                    fen: game.chess.fen().split(" ")[0]
                }
            };
            if (move === null) {
                msg.channel.send("Illegal move!");
                return;
            } else {
                boardgenparams.render.lastMove = args[0]+args[1];
            }
            if (game.chess.in_check()) {
                let le = "abcdefgh";
                let breaking = false;
                let king;
                for (let q=0;q<64;q++) {
                    let i=Math.floor(q/8)+1;
                    let j=q%8;
                    let square = le[j]+i.toString();
                    let piece;
                    piece = game.chess.get(square);
                    if (piece === null) {
                        continue;
                    }
                    if (piece.type == game.chess.KING && piece.color == game.chess.turn()) {
                        king = square;
                        break;
                    }
                }
                boardgenparams.render.check = king;
            }
            if (game.chess.game_over()) {
                message = "The winner is "+game[game.chess.turn()=="w" ? "b" : "w"] + "!";
                runningGames.splice(gamei, 1);
            } else {
                message = game[game.chess.turn()]+" Your move!";
                message+= "\n**usage:** "+config.commandPrefix+"chess "+this.usage;
            }
            boardgenqueue.push({ch: msg.channel, msg: message});
            msg.channel.startTyping();
            boardgen.stdin.write(JSON.stringify(boardgenparams)+"\n");
        } else {
            msg.channel.send("You are not in a game!");
        }
    }
};
