angular.module('blobs').controller("nameChangeController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
    $scope.nameKeyDown = function(event, name){
        if (event.keyCode == 13){
            $scope.updateName(name);
        }
    }
    
    $scope.updateName = function(name){
        socket.emit("nameChange", name);
        $('#nameChangeModal').modal("hide");
    }

    $scope.randomizeName = function(){
        socket.emit("nameChange", faker.name.firstName() + " " + faker.name.lastName());
    };
}]);
