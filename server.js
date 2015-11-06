var express = require('express');
var app = express();

app.use('', express.static('public'));

var server = app.listen(9382, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Starting server at http://%s:%s', host, port);
});
