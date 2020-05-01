angular.module('blobs').controller("nameChangeController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.myPlayer = {};

  $rootScope.$on("playerUpdate", function(event, playerUpdate){
    $scope.myPlayer = playerUpdate.myPlayer;
  });

  $scope.updateName = function(name){
    socket.emit("nameChange", name);
    $('#nameChangeModal').modal("hide");
  }
}]);
