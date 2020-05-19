var copyService = require("./copy_service");

var suits = [   {name:"clubs", suffix:"c", symbol: "♣", color:"black",  order: 2},{name:"hearts", suffix:"h", symbol: "♥", color:"red", order: 1},
                {name:"diamonds", suffix:"d", symbol: "♦", color:"red", order:3},{name:"spades", suffix:"s", symbol: "♠", color:"black", order:4}];
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

        //Sort the players hands
        for  (var p=0; p<numberOfPlayers; p++){
            retObj.playerHands[p] = retObj.playerHands[p].sort((a, b) => {
               if (a.suit.suffix == b.suit.suffix){
                   if (a.value < b.value){
                       return 1;
                   } else {
                       return -1;
                   }
               } else if (a.suit.order < b.suit.order){
                   return -1;
               } else {
                   return 1;
               }    
            });
        }

        //Set the trump card
        retObj.trumpCard = getUniqueCard(dealtIndexes);
        return retObj;
    },

    getWinner: function(playedCards, trumpCard){
        //Get the suit in play
        var suit = playedCards[0].card.suit;
        var trumpSuit = trumpCard.suit;

        //filter out cards which aren't the correct suit or trumps
        var validCards = playedCards.filter((playedCard) => {
            var card = playedCard.card;
            return card.suit.suffix == suit.suffix || card.suit.suffix == trumpSuit.suffix;
        });

        var winningCard = validCards.sort((a,b)=>{
            if (a.card.suit.suffix == trumpSuit.suffix && b.card.suit.suffix != trumpSuit.suffix){
                return -1;
            } else if (b.card.suit.suffix == trumpSuit.suffix && a.card.suit.suffix != trumpSuit.suffix){
                return 1;
            }
            if (a.card.value > b.card.value){
                return -1;
            } else if (b.card.value > a.card.value){
                return 1;
            }
        })[0];
        return winningCard;
    }
}

function getUniqueCard(dealtIndexes){
    //Start with an index higher than the number of cards
    var index = 100;
    //Shuffle until we get a card that hasn't been dealt
    while (index == 100 || dealtIndexes.includes(index)){
        index = Math.floor(Math.random() * 52);
    }
    var selectedCard = copyService.copy(cards[index]);
    //Log that we've dealt this card
    dealtIndexes.push(index);
    //Return the card;
    return selectedCard;
}