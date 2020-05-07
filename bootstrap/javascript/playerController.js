angular.module('blobs').controller("playerController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.startGame = function(){
    socket.emit("triggerStartGame", true);
  }

  $scope.readyButtonClass = function(){
    if ($rootScope.myPlayer.ready){
      return "btn-danger";
    } else {
      return "btn-primary";
    }
  }

  $scope.readyButtonText = function(){
    if ($rootScope.myPlayer.ready){
      return "UnReady";
    } else {
      return "Ready";
    }
  }

  $scope.everyoneReady = function(){
    return $rootScope.players.filter(function(p){
      return !p.ready;
    }).length == 0;
  }

  $scope.toggleReady = function(){
    socket.emit("playerReady", !$rootScope.myPlayer.ready);
  }

  $scope.showRename = function(){
    socket.emit("playerReady", false);
    $('#nameChangeModal').modal();
  }
}]);
