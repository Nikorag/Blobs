angular.module('blobs').controller("myHandController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
    $scope.gameStarted = false;
    $scope.myPlayer = {};
    $scope.gameObject = {};

    $rootScope.$on("gameUpdate", function(event, gameUpdate){
        $scope.gameObject = gameUpdate.gameObject;
        $scope.myPlayer = gameUpdate.myPlayer;
      });

    $rootScope.$on("startGame", function(){
        $scope.gameStarted = true;
      });
}]);