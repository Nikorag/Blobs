var players = [];

var playerTemplate = {
  "hand" : [],
  "call" : undefined,
  "scores" : [],
  "tricks" : 0
};

module.exports = {

  createPlayer: function(id){
    var player = Object.assign({}, playerTemplate);
    player.socketId = id;
    player.name = "New Player"
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
  }
};
