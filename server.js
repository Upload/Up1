var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var Busboy = require('busboy');
var express = require('express');
var http = require('http');
var https = require('https');
var request = require('request');
var tmp = require('tmp');

var app = express();

// Different headers can be pushed depending on data format
// to allow for changes with backwards compatibility
var header = {
    v1: new Buffer("UP1\0", 'binary')
}

var config = JSON.parse(fs.readFileSync('./server.conf'));

app.use('', express.static('public'));

app.post('/up', function(req, res) {
    var busboy = new Busboy({
        headers: req.headers,
        limits: {
            fileSize: config.maximum_file_size,
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
        try {
            var ftmp = tmp.fileSync({ postfix: '.tmp', dir: 'public/i/', keep: true });
            tmpfname = ftmp.name;

            var fstream = fs.createWriteStream('', {fd: ftmp.fd, defaultEncoding: 'binary'});
            fstream.write(header.v1);
            file.pipe(fstream);
        } catch (err) {
            console.log("Error on file:", err);
            res.send("Internal Server Error");
            req.unpipe(busboy);
            res.close();
        }
    });

    busboy.on('finish', function() {
        try {
            if (fields.api_key !== config['api_key']) {
                res.send('{"error": "API key doesn\'t match", "code": 2}');
            } else if (!fields.ident) {
                res.send('{"error": "Ident not provided", "code": 11}');
            } else if (fields.ident.length !== 22) {
                res.send('{"error": "Ident length is incorrect", "code": 3}');
            } else if (ident_exists(fields.ident)) {
                res.send('{"error": "Ident is already taken.", "code": 4}');
            } else {
                var delhmac = crypto.createHmac('sha256', config.delete_key)
                                    .update(fields.ident)
                                    .digest('hex');
                fs.rename(tmpfname, ident_path(fields.ident), function() {
                    res.json({delkey: delhmac});
                });
            }
        } catch (err) {
            console.log("Error on finish:", err);
            res.send("Internal Server Error");
        }
    });

    return req.pipe(busboy);
});

app.get('/del', function(req, res) {
    var d = fields[blah];
    if (!req.query.ident) {
        res.send('{"error": "Ident not provided", "code": 11}');
        return;
    }
    if (!req.query.delkey) {
        res.send('{"error": "Delete key not provided", "code": 12}');
        return;
    }
    var delhmac = crypto.createHmac('sha256', config.delete_key)
                        .update(req.query.ident)
                        .digest('hex');
    if (req.query.ident.length !== 22) {
        res.send('{"error": "Ident length is incorrect", "code": 3}');
    } else if (delhmac !== req.query.delkey) {
        res.send('{"error": "Incorrect delete key", "code": 10}');
    } else if (!ident_exists(req.query.ident)) {
        res.send('{"error": "Ident does not exist", "code": 9}');
    } else {
        fs.unlink(ident_path(req.query.ident), function() {
            cf_invalidate(req.query.ident);
            res.send('success');
        });
    }
});

function ident_path(ident) {
    return 'public/i/' + path.basename(ident);
}

function ident_exists(ident) {
    try {
        fs.lstatSync(ident_path(ident));
        return true;
    } catch (err) {
        return false;
    }
}

function cf_invalidate(ident) {
    function cf_do_invalidate(ident, https) {
        if (https)
            var inv_url = 'https://' + config['cloudflare-cache-invalidate'].Url;
        else
            var inv_url = 'http://' + config['cloudflare-cache-invalidate'].Url;
        inv_url += '/i/' + ident;

        request.post({
            url: 'https://www.cloudflare.com/api_json.html',
            form: {
                a: 'zone_file_purge',
                tkn: config['cloudflare-cache-invalidate'].token,
                email: config['cloudflare-cache-invalidate'].email,
                z: config['cloudflare-cache-invalidate'].domain,
                url: inv_url
            }
        }, function(err, response, body) {
            if (err) {
                console.log("Cache invalidate failed for", ident);
                console.log("Body:", body);
                return;
            }
            try {
                var result = JSON.parse(body)
                if (result.result === 'error') {
                    console.log("Cache invalidate failed for", ident);
                    console.log("Message:", msg);
                }
            } catch(err) {}
        });
    }

    if (config.http.enabled)
        cf_do_invalidate(ident, false);
    if (config.https.enabled)
        cf_do_invalidate(ident, true);
}

/* Convert an IP:port string to a split IP and port */
function addrport(s) {
    var spl = s.split(":");
    if (spl.length === 1)
        return { host: spl[0], port: 80 };
    else if (spl[0] === '')
        return { port: parseInt(spl[1]) };
    else
        return { host: spl[0], port: parseInt(spl[1]) };
}

if (config.http.enabled) {
    var ap = addrport(config.http.listen);
    var server = http.createServer(app).listen(ap.port, ap.host, function() {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Started server at http://%s:%s', host, port);
    });
}
if (config.https.enabled) {
    var sec_ap = addrport(config.https.listen);
    var sec_creds = {
        key: fs.readFileSync(config.https.key),
        cert: fs.readFileSync(config.https.cert)
    };
    var sec_server = https.createServer(sec_creds, app).listen(sec_ap.port, sec_ap.host, function() {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Started server at https://%s:%s', host, port);
    });
}
