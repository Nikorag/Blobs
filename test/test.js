var assert = require('assert');

describe('CardService', () => {
    describe('#dealCards()', () => {
        var card_service = require('../service/card_service');
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
    describe('#getWinner', () => {
        var card_service = require('../service/card_service');
        it ("With no trumps pick the winner", () => {
            //Create a specific data set
            var trumpCard = {
                suit: {
                    name: "hearts",
                    suffix: "h"
                }
            };
            var cards = [
                createCard(10, "c"),
                createCard(8, "c"),
                createCard(11, "c"),
                createCard(3, "c"),
                createCard(12, "d")
            ];
            var winner = card_service.getWinner(cards, trumpCard);
            assert.equal(winner.card.value, 11);
        });
        it ("With one trump pick the winner", () => {
            //Create a specific data set
            var trumpCard = {
                suit: {
                    name: "hearts",
                    suffix: "h"
                }
            };
            var cards = [
                createCard(10, "c"),
                createCard(8, "c"),
                createCard(11, "c"),
                createCard(3, "h"),
                createCard(12, "d")
            ];
            var winner = card_service.getWinner(cards, trumpCard);
            assert.equal(winner.card.value, 3);
        });
        it ("With multiple trumps pick the winner", () => {
            //Create a specific data set
            var trumpCard = {
                suit: {
                    name: "hearts",
                    suffix: "h"
                }
            };
            var cards = [
                createCard(10, "c"),
                createCard(8, "h"),
                createCard(11, "c"),
                createCard(3, "h"),
                createCard(12, "d")
            ];
            var winner = card_service.getWinner(cards, trumpCard);
            assert.equal(winner.card.value, 8);
        });
    });
});

function createCard(value, suit){
    var cardTemplate = {
        card : {
            label: "",
            value: 0,
            suit: {
                name: "",
                suffix: ""
            }
        }
    };
    var retObj = Object.assign({}, cardTemplate);
    retObj.card.value = value;
    retObj.card.suit.suffix=suit;
    return retObj;
}

var { v4: uuidv4 } = require('uuid');
describe('PlayerService', () => {
    describe('#createPlayer()', () => {
        var playerService = require('../service/player_service');
        it('Players should be empty to begin with', ()=> {
            assert.equal(playerService.getPlayers(), 0);
        });
        it('Should be able to create new players', () => {
            var playersToCreate = Math.floor(Math.random() * 10) + 1;
            for (var i = 1; i<= playersToCreate; i++){
                var id = uuidv4();
                playerService.createPlayer(id);
                assert.equal(playerService.getPlayers().slice(-1)[0].socketId, id);
            }
            assert.equal(playerService.getPlayers().length, playersToCreate);
        });
    });
    describe('#removePlayer', () => {
        var playerService = require('../service/player_service');
        it('Should remove players based on ID', ()=>{
            //Create 5 players
            for (var i=0;i<5;i++){
                var id = uuidv4();
                playerService.createPlayer(id);
            }
            //Get the number of players
            var numberOfPlayers = playerService.getPlayers().length;

            //Collect all the ids
            var allTheIDs = playerService.getPlayers().map((player) => {return player.socketId;});

            //Get a random item from the array
            var id = allTheIDs[Math.floor(Math.random()*allTheIDs.length)];

            //Remove it
            playerService.removePlayer(id);

            //Is there one less player
            assert.equal(playerService.getPlayers().length, numberOfPlayers - 1);

            //Have we removed the right one
            assert.equal(playerService.getPlayers().includes(id), false);

            //Get a list of the remaining IDs and check they are still there
            allTheIDs.filter((value) => {
                return value != id;
            }).forEach((value) => {
                assert.equal(playerService.getPlayers().filter((player) => {
                    return player.socketId == value;
                }).length, 1);
            })
        });
        
    })
    describe('#rotateToFirst', () => {
        it('Should should rotate a player to first', ()=>{
            var playerService = require('../service/player_service');
            var playerIndex = Math.floor(Math.random() * (playerService.getPlayers().length -1)) + 1;
            var playerToPop = playerService.getPlayers()[playerIndex];
            playerService.rotateToFirst(playerToPop);
            assert.equal(playerService.getPlayers()[0].socketId, playerToPop.socketId);
        });
    });
})