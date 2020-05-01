//The main controller for the game
angular.module('blobs').controller("gameController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.mySocket = "";

  socket.on("playerUpdate", function(playerUpdate){
    $scope.mySocket = playerUpdate.myPlayer.socketId;
    $rootScope.$emit("playerUpdate", playerUpdate);
  });

  socket.on("whatIsYourName", function(){
    $('#nameChangeModal').modal();
    $('#nameChangeModal').on('shown.bs.modal', function () {
      $('#newNameInput').trigger('focus')
    })
    $rootScope.$emit("whatIsYourName", {});
  });

}]);