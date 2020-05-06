var copyService = require("./copy_service");
var faker = require('faker');

var players = [];

var playerTemplate = {
  "hand" : [],
  "call" : undefined,
  "scores" : [],
  "tricks" : 0
};

module.exports = {

  createPlayer: function(id){
    var player = copyService.copy(playerTemplate);
    player.socketId = id;
    player.name = faker.name.firstName() + " " + faker.name.lastName();
    players.push(player);
  },

  removePlayer: function(id){
    players = players.filter(player => player.socketId != id);
  },

  getPlayers: function(){
    return players;
  },

  getPlayer: function(id){
    return players.filter(player => player.socketId == id)[0];
  },

  updatePlayerName: function(id, name){
    var player = module.exports.getPlayer(id);
    player.name = name;
  },

  rotateToFirst: function(player){
    while (players[0].socketId != player.socketId){
      players.unshift(players.pop()); //Pop the last player to the first
    }
  },

  rotateWithNewDealer: function(oldDealer){
    //Get index of dealer
    var index = players.map((player) => {return player.socketId;}).indexOf(oldDealer.socketId);
    //Add 2 to the index
    index += 2;
    var newPlayerOneIndex = index % players.length;
    var newPlayerOne = players[newPlayerOneIndex];
    module.exports.rotateToFirst(newPlayerOne);

    return players[players.length-1];
  },

  updateScores: function(){
    players.forEach((player) => {
      var call = player.scores[player.scores.length - 1];
      var tricks = player.tricks;
      if (tricks != call){
        player.scores[player.scores.length - 1] = "BLOB";
      }
      player.tricks = 0;
    });
  }
};
