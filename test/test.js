var assert = require('assert');
var card_service = require('../service/card_service');

describe('CardService', () => {
    describe('#dealCards()', () => {
        var numberOfPlayers = Math.floor(Math.random() * 5) + 3;
        var cardsEach = Math.floor(Math.random() * 6) + 1;  
        var dealtCards = card_service.dealCards(cardsEach, numberOfPlayers);
        it('Should deal to '+numberOfPlayers+ ' players', () => {
            assert.equal(dealtCards.playerHands.length, numberOfPlayers);
        });

        it('should deal '+cardsEach+' to each player', () => {
            dealtCards.playerHands.forEach(hand => {
                assert.equal(hand.length, cardsEach);
            });
        });

        it('should not deal more than one of each card, including trumps', () =>{
            //Combine all the cards
            var allDealt = [].concat.apply([], dealtCards.playerHands);
            allDealt.push(dealtCards.trumpCard);

            //Get duplicates
            var uniq = allDealt.map((card) => {
                //Map to an object which can count
                return {
                    count: 1,
                    id: card.label+card.suit.suffix //eg 2c or 11h
                };
            }).reduce((a, b) => {
                //Counts up how many of each we find
                a[b.id] = (a[b.id] || 0) + b.count;
                return a
            }, {});

            //Get the card objects of those with a count > 1
            var duplicates = Object.keys(uniq).filter((a) => uniq[a] > 1)

            assert.equal(duplicates.length, 0);
        })
    });
})