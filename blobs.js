var express = require('express');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
//Services
var playerService = require("./service/player_service");
var messageService = require("./service/message_service");

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
  messageService.sendPlayerUpdate(io);

  //Send message to confirm they've connected - This will trigger the change name popup
  io.to(socket.id).emit('whatIsYourName', true);

  //If they subsequently disconnect, remove them and emit another "playerUpdate" event to each player
  socket.on('disconnect', () => {
    playerService.removePlayer(socket.id);
    messageService.sendPlayerUpdate(io);
  });

  //If a player changes their name
  socket.on('nameChange', (newName) => {
    playerService.updatePlayerName(socket.id, newName);
    messageService.sendPlayerUpdate(io);
  });

});
