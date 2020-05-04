angular.module('blobs').controller("myHandController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
    $scope.gameStarted = false;
    $scope.myPlayer = {};

    $rootScope.$on("playerUpdate", function(event, playerUpdate){
        $scope.myPlayer = playerUpdate.myPlayer;
      });

    $rootScope.$on("startGame", function(){
        $scope.gameStarted = true;
      });
}]);