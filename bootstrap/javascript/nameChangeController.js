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
        var newName = faker.name.firstName() + " " + faker.name.lastName();
        $('#newNameInput').val(newName);
        socket.emit("nameChange", newName);
    };
}]);
