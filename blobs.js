var express = require('express');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
//Services
var playerService = require("./service/player_service");
var messageService = require("./service/message_service");
var cardService = require("./service/card_service");
var copyService = require("./service/copy_service");

//Create some constants
const WAIT_TIME = 5;
const STARTING_CARDS = 7;

var gameObjectTemplate = {
  cardsThisRound : STARTING_CARDS,
  phase : "Call",
  calls : [],
  playersTurn : 0,
  cardsInPlay: [],
  dealer: {}
}

//Create the game_object
var gameObject = copyService.copy(gameObjectTemplate);


//Give static access to public directory
app.use(express.static('public'));

// Root directs to game.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/game.html');
});

http.listen(3000, () => {
  console.log("listening on 3000");
});

io.on('connection', (socket) => {

  //When a player connects, add that player and then emit a "playerUpdate" event to each player
  playerService.createPlayer(socket.id);
  messageService.sendGameUpdate(io, gameObject);

  //Send message to confirm they've connected - This will trigger the change name popup
  io.to(socket.id).emit('whatIsYourName', true);

  //If they subsequently disconnect, remove them and emit another "playerUpdate" event to each player
  socket.on('disconnect', () => {
    playerService.removePlayer(socket.id);
    messageService.sendGameUpdate(io, gameObject);
  });

  socket.on('resetGame', () => {
    //Reset the game_object
    gameObject = copyService.copy(gameObjectTemplate);
    //Reset all the players
    playerService.resetPlayers();
    io.emit('gameReset');
    messageService.sendGameUpdate(io, gameObject);
  });

  //If a player changes their name
  socket.on('nameChange', (newName) => {
    playerService.updatePlayerName(socket.id, newName);
    messageService.sendGameUpdate(io, gameObject);
  });
  
  socket.on('triggerStartGame', () =>{
    //Tell the clients the game has started
    io.emit("startGame");

    //Reset the game_object
    gameObject = copyService.copy(gameObjectTemplate);
    //Reset all the players
    playerService.resetPlayers();

    //Set the dealer to the last player
    gameObject.dealer = playerService.getPlayers()[playerService.getPlayers().length - 1];

    dealCards();
    messageService.sendGameUpdate(io, gameObject);
  });

  socket.on('makeCall', (call) =>{
    var player = playerService.getPlayer(socket.id);

    io.emit("showToast", {body: player.name+" called "+call, title: "Call"});

    player.scores.push(call);
    var callObject = {
      value: call,
      player: player
    };
    gameObject.calls.push(callObject);
    gameObject.playersTurn++;

    if (gameObject.playersTurn == playerService.getPlayers().length){
      nextRound();
    }

    messageService.sendGameUpdate(io, gameObject);
  });

  socket.on('playCard', (card) =>{
    playCard(card, playerService.getPlayer(socket.id));

    gameObject.playersTurn++;

    if (gameObject.cardsInPlay.length == playerService.getPlayers().length){
      setTimeout(()=>{
        var winner = cardService.getWinner(gameObject.cardsInPlay, gameObject.trumpCard);
        playerService.getPlayer(winner.player.socketId).tricks++;
        //Winner goes first
        playerService.rotateToFirst(winner.player);
        nextRound();
        messageService.sendGameUpdate(io, gameObject);
        io.emit("showToast", {body: winner.player.name+" won that trick!", title: "Winner"});
        io.emit("showToast", {body: "Its "+playerService.getPlayers()[gameObject.playersTurn].name+"s turn", title: "Next Turn"});
      },2000)
    } else {
      io.emit("showToast", {body: "Its "+playerService.getPlayers()[gameObject.playersTurn].name+"s turn", title: "Next Turn"});
    }

    messageService.sendGameUpdate(io, gameObject);
  });
});

function dealCards(){
  var cardsDealt = cardService.dealCards(gameObject.cardsThisRound, playerService.getPlayers().length);

  gameObject.trumpCard = cardsDealt.trumpCard;
  console.log("Trumps are "+gameObject.trumpCard.suit.name);
  playerService.getPlayers().forEach((player, i) => {
    player.hand = cardsDealt.playerHands[i];
  });
}

function playCard(card, player){
  //Create a cardPlayed item and push it to the gameObject
  var cardPlayed = {
    card: card,
    player: player
  };
  gameObject.cardsInPlay.push(cardPlayed);

  //Remove the card from the players hand
  player.hand = player.hand.filter((cardInHand) => {
    return !(cardInHand.value == card.value && cardInHand.suit.suffix == card.suit.suffix);
  })
}

function nextRound(){
  gameObject.playersTurn = 0;
  if (gameObject.phase == 'Call'){
    gameObject.phase = 'Play';
  } else if (gameObject.phase == 'Play'){
    gameObject.cardsInPlay = [];
    //have we played all the cards?!
    if (playerService.getPlayers()[0].hand.length ==  0){
        //Update Scores
        playerService.updateScores();
        //Reduce the number of cards
        gameObject.cardsThisRound--;
        if (gameObject.cardsThisRound > 0){
          //Rotate the players
          gameObject.dealer = playerService.rotateWithNewDealer(gameObject.dealer);
          //Set phase back to call
          gameObject.phase = 'Call';
          //Deal new cards
          dealCards();
        } else {
          //TODO game over
          gameObject.phase == 'End';
        }
    }
  }
}