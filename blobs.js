var express = require('express');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
//Services
var playerService = require("./service/player_service");
var messageService = require("./service/message_service");
var cardService = require("./service/card_service");

//Create some constants
const WAIT_TIME = 5;
const STARTING_CARDS = 7;

var gameObjectTemplate = {
  cardsThisRound : STARTING_CARDS,
  phase : "Call",
  calls : [],
  playersTurn : 0,
}

//Create the game_object
var gameObject = Object.assign({}, gameObjectTemplate);


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

  //If a player changes their name
  socket.on('nameChange', (newName) => {
    playerService.updatePlayerName(socket.id, newName);
    messageService.sendGameUpdate(io, gameObject);
  });
  
  socket.on('triggerStartGame', () =>{
    //Tell the clients the game has started
    io.emit("startGame");

    //Reset the game_object
    var gameObject = Object.assign({}, gameObjectTemplate);

    dealCards(gameObject, playerService.getPlayers());
    messageService.sendGameUpdate(io, gameObject);
  });

  socket.on('makeCall', (call) =>{
    var player = playerService.getPlayer(socket.id);
    var callObject = {
      value: call,
      player: player
    };
    gameObject.calls.push(callObject);
    console.log(gameObject.calls);
    gameObject.playersTurn++;

    if (gameObject.playersTurn == playerService.getPlayers().length){
      nextRound(gameObject, playerService.getPlayers());
    }

    messageService.sendGameUpdate(io, gameObject);
  });
});

function dealCards(gameObject, players){
  var cardsDealt = cardService.dealCards(gameObject.cardsThisRound, players.length);

  gameObject.trumpCard = cardsDealt.trumpCard;
  console.log("Trumps are "+gameObject.trumpCard.suit.suffix);
  players.forEach((player, i) => {
    player.hand = cardsDealt.playerHands[i];
  });
}

function nextRound(gameObject, players){
  gameObject.playersTurn = 0;
  if (gameObject.phase == 'Call'){
    gameObject.phase = 'Play';
  } else if (gameObject.phase == 'Play'){
    //TODO lower card count and re-deal
    gameObject.cardsThisRound--;
    dealCards(gameObject, players);
  }
}