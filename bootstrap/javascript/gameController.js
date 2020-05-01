//The main controller for the game
angular.module('blobs').controller("gameController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.mySocket = "";

  socket.on("playerUpdate", function(playerUpdate){
    $scope.mySocket = playerUpdate.myPlayer.socketId;
    $rootScope.$emit("playerUpdate", playerUpdate);
  });

}]);
