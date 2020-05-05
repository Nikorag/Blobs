var playerService = require("./player_service");

module.exports = {
  sendGameUpdate : function(io, gameObject){
    playerService.getPlayers().forEach((player) => {
      var msg = {
        myPlayer: player,
        allPlayers: playerService.getPlayers(),
        gameObject: gameObject
      }
      io.to(player.socketId).emit("gameUpdate", msg);
    });
  }
}
