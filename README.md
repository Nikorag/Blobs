
# Blobs
Recreation of the card-game Blobs to be played multiplayer in a browser.

## Technologies Used

 - NodeJS & Express
 - Sockets.io
 - AngularJS
 - Less
 - Grunt

## Getting Started
After cloning/downloading the project install it using

    npm install
Then run the project using

    npm start
Your game server will be available on port 3000

## Message Channels

| Channel | Payload | Purpose |
|--|--|--|
| playerUpdate |playerUpdate | Inform the clients of the current status of each player |

## Payloads

**Player Update**
allPlayers - Every player object in the game
myPlayer - The clients player object
