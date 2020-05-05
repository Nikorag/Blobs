angular.module('blobs').controller("nameChangeController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.myPlayer = {};
  $scope.gameUpdate = {};

  $rootScope.$on("gameUpdate", function(event, gameUpdate){
    $scope.gameObject = gameUpdate.gameObject;
    $scope.myPlayer = gameUpdate.myPlayer;
  });

  $scope.updateName = function(name){
    socket.emit("nameChange", name);
    $('#nameChangeModal').modal("hide");
  }
}]);
