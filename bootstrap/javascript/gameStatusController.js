angular.module('blobs').controller("gameStatusController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
    $scope.players = [];
    $scope.myPlayer = {};
    $scope.gameStarted = false;
    $scope.gameObject = {};

    $rootScope.$on("gameUpdate", function(event, gameUpdate){
        $scope.players = gameUpdate.allPlayers;
        $scope.myPlayer = gameUpdate.myPlayer;
        $scope.gameObject = gameUpdate.gameObject;
      });
    
      $rootScope.$on("startGame", function(){
        $scope.gameStarted = true;
      });
}]);