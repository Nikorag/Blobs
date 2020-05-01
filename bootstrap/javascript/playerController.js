angular.module('blobs').controller("playerController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.players = [];
  $scope.myPlayer = {};

  $rootScope.$on("playerUpdate", function(event, playerUpdate){
    $scope.players = playerUpdate.allPlayers;
    $scope.myPlayer = playerUpdate.myPlayer;
  });
}]);
