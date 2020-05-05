var playerService = require("./player_service");

module.exports = {
  sendGameUpdate : function(io, gameObject){
    playerService.getPlayers().forEach((player, index) => {
      var msg = {
        myPlayer: player,
        myPlayerIndex: index,
        allPlayers: playerService.getPlayers(),
        gameObject: gameObject
      }
      io.to(player.socketId).emit("gameUpdate", msg);
    });
  }
}
