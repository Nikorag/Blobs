angular.module('blobs').controller("nameChangeController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
    $scope.updateName = function(name){
        socket.emit("nameChange", name);
        $('#nameChangeModal').modal("hide");
    }
}]);
