var playerService = require("./player_service");

module.exports = {
  sendPlayerUpdate : function(io){
    playerService.getPlayers().forEach((player) => {
      var msg = {
        myPlayer: player,
        allPlayers: playerService.getPlayers()
      }
      io.to(player.socketId).emit("playerUpdate", msg);
    });
  }
}
