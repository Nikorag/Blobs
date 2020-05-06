angular.module('blobs').controller("myHandController", ['$rootScope', '$scope', 'socket', function($rootScope, $scope, socket){
    
    $scope.canIPlay = function(card){
        //Are we in the play phase
        if ($rootScope.gameObject.phase != "Play"){
            return false;
        }
        //Is it my turn?
        if (!$rootScope.isMyTurn()){
            return false;
        }
        //Is there no cards there yet?
        if ($rootScope.gameObject.cardsInPlay.length == 0){
            return true;
        }
        //Get the correct suit
        var suitInPlay = $rootScope.gameObject.cardsInPlay[0].card.suit;
        //Is this card of that suit
        if (card.suit.suffix == suitInPlay.suffix){
            return true;
        }
        //Do I have _any_ cards of the correct suit
        var cardsOfCorrectSuit = $rootScope.myPlayer.hand.filter(function(cardInHand) {
            return cardInHand.suit.suffix == suitInPlay.suffix;
        })
        //If there aren't any, we can play anything
        return cardsOfCorrectSuit.length == 0;
    }

    $scope.playCard = function(card){
        if ($scope.canIPlay(card)){
            socket.emit("playCard", card);
        }
    }
}]);