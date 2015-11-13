var fs = require('fs');
var path = require('path');
var tmp = require('tmp');
var express = require('express');
var Busboy = require('busboy');

var app = express();

var header = {
    v1: new Buffer("UP1\0", 'binary')
}

app.use('', express.static('public'));

app.post('/up', function(req, res) {
    var busboy = new Busboy({
        headers: req.headers,
        limits: {
            fileSize: 50000000,
            files: 1,
            parts: 3
        }
    });

    var fields = {};
    var tmpfname = null;

    busboy.on('field', function(fieldname, value) {
        fields[fieldname] = value;
    });

    busboy.on('file', function(fieldname, file, filename) {
        var ftmp = tmp.fileSync({ postfix: '.tmp', dir: 'public/i/', keep: true });
        tmpfname = ftmp.name;

        var fstream = fs.createWriteStream('', {fd: ftmp.fd, defaultEncoding: 'binary'});
        fstream.write(header.v1);
        file.pipe(fstream);
    });

    busboy.on('finish', function() {
        console.log("New Upload:", fields['ident']);
        fs.rename(tmpfname, 'public/i/' + path.basename(fields['ident']), function() {
            res.send(JSON.stringify({delkey: '1'}));
        });
    });

    return req.pipe(busboy);
});

var server = app.listen(9382, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Starting server at http://%s:%s', host, port);
});
