angular.module('blobs').controller("actionController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
    $scope.canICall = function(call){
        //Is it even my turn?
        if (!$rootScope.isMyTurn()){
            return false;
        }
        //Am i the last one?
        if ($rootScope.gameObject.calls.length == ($rootScope.players.length - 1)){
            //Get the total called
            var totalCalled = $rootScope.gameObject.calls.map(function(playerCall){ return playerCall.value; }).reduce(function(a,b){ return a+b;},0);
            console.log("totalCalled "+totalCalled);
            return !(totalCalled + call == $rootScope.gameObject.cardsThisRound);
        }
        return true;
    }

    $scope.makeCall = function(call){
        //Is it even my turn?
        if (!$rootScope.isMyTurn()){
            return;
        }
        //Make the call
        socket.emit("makeCall", call);
    }
}]);
