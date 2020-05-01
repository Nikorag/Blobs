angular.module('blobs', ['ysilvela.socket-io']);

angular.module('blobs').factory('socket', ['socketFactory', function (socketFactory) {
  return socketFactory();
}]);

angular.module('blobs').controller("gameController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
  $scope.mySocket = "";

  //The main controller for the game
  socket.on("yourSocket", function(id){
    $rootScope.$emit("yourSocket", id);
    $scope.mySocket = id;
  });

}]);
