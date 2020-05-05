//The main controller for the game
angular.module('blobs').controller("gameController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $rootScope.mySocket = "";
  $rootScope.gameStarted = false;
  $rootScope.gameObject = {};
  $rootScope.players = [];
  $rootScope.myPlayer = {};
  $rootScope.myPlayerIndex = 0;

  //Useful functions
  $rootScope.createLoop = function(from,to){
    var ret = [];
    for (var i = from; i<=to; i++){
      ret.push(i);
    }
    return ret;
  }
  
  $rootScope.isMyTurn = function(){
    return $rootScope.myPlayerIndex == $rootScope.gameObject.playersTurn;
  }

  //Received Socket Events
    socket.on("gameUpdate", function(gameUpdate){
      $rootScope.mySocket = gameUpdate.myPlayer.socketId;
      $rootScope.gameObject = gameUpdate.gameObject;
      $rootScope.players = gameUpdate.allPlayers;
      $rootScope.myPlayer = gameUpdate.myPlayer;
      $rootScope.myPlayerIndex = gameUpdate.myPlayerIndex;
      $rootScope.$emit("gameUpdate", gameUpdate);
    });

    socket.on("whatIsYourName", function(){
      $('#nameChangeModal').modal();
      $('#nameChangeModal').on('shown.bs.modal', function () {
        $('#newNameInput').trigger('focus')
      })
      $rootScope.$emit("whatIsYourName", {});
    });

    socket.on("startGame", function(){
      $rootScope.$emit("startGame", {});
      $rootScope.gameStarted = true;
    });

    socket.on("initiateCountDown", function(seconds){
      startCountdown(seconds);
    });

}]);
