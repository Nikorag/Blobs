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

//Create the game_object
var gameObject = {};

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
    io.emit("initiateCountDown", WAIT_TIME);
    setTimeout(()=>{
      //Tell the clients the game has started
      io.emit("startGame");

      //Create the game
      gameObject.cardsThisRound = STARTING_CARDS;

      dealCards(gameObject, playerService.getPlayers());
      messageService.sendGameUpdate(io, gameObject);
    }, WAIT_TIME * 1000);
  });

});

function dealCards(gameObject, players){
  var cardsDealt = cardService.dealCards(gameObject.cardsThisRound, players.length);

  gameObject.trumpCard = cardsDealt.trumpCard;
  players.forEach((player, i) => {
    player.hand = cardsDealt.playerHands[i];
  });
}