//The main controller for the game
angular.module('blobs').controller("gameController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.mySocket = "";
  $scope.gameStarted = false;
  $scope.gameObject = {};

  socket.on("gameUpdate", function(gameUpdate){
    $scope.mySocket = gameUpdate.myPlayer.socketId;
    $scope.gameObject = gameUpdate.gameObject;
    $rootScope.$emit("gameUpdate", gameUpdate);
  });

  socket.on("whatIsYourName", function(){
    $('#nameChangeModal').modal();
    $('#nameChangeModal').on('shown.bs.modal', function () {
      $('#newNameInput').trigger('focus')
    })
    $rootScope.$emit("whatIsYourName", {});
  });

  socket.on("startGame", function(){
    $rootScope.$emit("startGame", {});
    $scope.gameStarted = true;
  });

  socket.on("initiateCountDown", function(seconds){
    startCountdown(seconds);
  });

}]);
