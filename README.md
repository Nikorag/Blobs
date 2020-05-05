
# Blobs
Recreation of the card-game Blobs to be played multiplayer in a browser.

# Build Status
![Node.js CI](https://github.com/Nikorag/Blobs/workflows/Node.js%20CI/badge.svg)

## Technologies Used

 - NodeJS & Express
 - Sockets.io
 - AngularJS
 - Less
 - Grunt
 - Ecmascript (sort of)
 - Mocha Test Framework

## Getting Started
After cloning/downloading the project install it using

    npm install
Then run the project using

    npm start
Your game server will be available on port 3000

## Testing
Tests are written in Mocha. Once the project is cloned and installed run:

    npm test

## Message Channels

| Channel | source | Payload | Purpose |
|--|--|--|--|
| gameUpdate | server | gameUpdate | Inform the clients of the current status of the game |
| whatIsYourName | server | EMPTY | Inform the client to open the change name modal |
| nameChange | client | String | Informs the server to change the players name |
| triggerStartGame | client | NULL | Informs the server that the client wishes to start the game |
| initiateCountDown | server | Integer | Triggers the client to show a countdown timer |
| startGame | server | NULL | Informs the clients that the game has started |

## Payloads

**Game Update**
allPlayers - Every player object in the game
myPlayer - The clients player object
gameObject - The Game Object

**Game Object**
cardsThisRound - Number of cards each player will receive in this round
trumpCard - The current trump card
