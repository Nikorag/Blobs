angular.module('blobs').controller("playerController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.startGame = function(){
    socket.emit("triggerStartGame", true);
  }
}]);
