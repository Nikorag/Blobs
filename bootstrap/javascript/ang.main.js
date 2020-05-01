angular.module('blobs', ['ysilvela.socket-io']);

angular.module('blobs').factory('socket', ['socketFactory', function (socketFactory) {
  return socketFactory();
}]);

//The main controller for the game
angular.module('blobs').controller("gameController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.mySocket = "";

  socket.on("playerUpdate", function(playerUpdate){
    $scope.mySocket = playerUpdate.myPlayer.socketId;
    $rootScope.$emit("playerUpdate", playerUpdate);
  });

}]);

angular.module('blobs').controller("playerController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.players = [];
  $scope.myPlayer = {};

  $rootScope.$on("playerUpdate", function(event, playerUpdate){
    $scope.players = playerUpdate.allPlayers;
    $scope.myPlayer = playerUpdate.myPlayer;
  });
}]);
