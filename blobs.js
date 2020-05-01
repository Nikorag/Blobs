var express = require('express');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//Give static access to public directory
app.use(express.static('public'));

// Root directs to game.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/game.html');
});

http.listen(3000, () => {
  console.log("listening on 3000");
});
