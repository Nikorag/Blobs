angular.module('blobs').controller("playerController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.players = [];
  $scope.myPlayer = {};
  $scope.gameStarted = false;

  $rootScope.$on("playerUpdate", function(event, playerUpdate){
    $scope.players = playerUpdate.allPlayers;
    $scope.myPlayer = playerUpdate.myPlayer;
  });

  $rootScope.$on("startGame", function(){
    $scope.gameStarted = true;
  });

  $scope.startGame = function(){
    socket.emit("triggerStartGame", true);
  }
}]);
