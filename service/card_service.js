var suits = [{name:"clubs", suffix:"c"},{name:"hearts", suffix:"h"},{name:"diamonds", suffix:"d"},{name:"spades", suffix:"s"}];
var values = [{label: "2", value: 2},{label: "3", value: 3},{label: "4", value: 4},{label: "5", value: 5},{label: "6", value: 6},{label: "7", value: 7},{label: "8", value: 8},
{label: "9", value: 9},{label: "10", value: 10},{label: "jack", value: 11},{label: "queen", value: 12},{label: "king", value: 13},{label: "ace", value: 14}];

var cards =[];

//Create the cards
for (var s in suits){
  var suit = suits[s];
  for (var v in values){
    var card = Object.assign({},values[v]);
    card.suit = Object.assign({},suit);
    cards.push(card);
  }
}

module.exports = {
    dealCards: function(cardsEach, numberOfPlayers){
        //Create an empty return object
        var retObj = {
            playerHands: [],
            trumpCard: {}
        };

        //Add empty hands for each player
        for (var p=0; p<numberOfPlayers; p++){
            retObj.playerHands.push([]);
        };

        //Use this to store the indexes of all the cards we've already dealt
        var dealtIndexes = [];

        //For each round
        for (var r=0; r<cardsEach; r++){
            //For each player
            for (var p=0; p<numberOfPlayers; p++){
                var selectedCard = getUniqueCard(dealtIndexes);
                //Add this card to the players hand
                retObj.playerHands[p].push(selectedCard);
            }
        }

        //Set the trump card
        retObj.trumpCard = getUniqueCard(dealtIndexes);
        return retObj;
    }
}

function getUniqueCard(dealtIndexes){
    //Start with an index higher than the number of cards
    var index = 100;
    //Shuffle until we get a card that hasn't been dealt
    while (index == 100 || dealtIndexes.includes(index)){
        index = Math.floor(Math.random() * 52);
    }
    var selectedCard = Object.assign({}, cards[index]);
    //Log that we've dealt this card
    dealtIndexes.push(index);
    //Return the card;
    return selectedCard;
}