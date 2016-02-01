var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var Busboy = require('busboy');
var express = require('express');
var http = require('http');
var https = require('https');
var request = require('request');
var tmp = require('tmp');


// Different headers can be pushed depending on data format
// to allow for changes with backwards compatibility
var UP1_HEADERS = {
    v1: new Buffer("UP1\0", 'binary')
}

function handle_upload(req, res) {
    var config = req.app.locals.config
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
            var ftmp = tmp.fileSync({ postfix: '.tmp', dir: req.app.locals.config.path.i, keep: true });
            tmpfname = ftmp.name;

            var fstream = fs.createWriteStream('', {fd: ftmp.fd, defaultEncoding: 'binary'});
            fstream.write(UP1_HEADERS.v1);
            file.pipe(fstream);
        } catch (err) {
            console.error("Error on file:", err);
            res.send("Internal Server Error");
            req.unpipe(busboy);
            res.close();
        }
    });

    busboy.on('finish', function() {
        try {
            if (!tmpfname) {
                res.send("Internal Server Error");
            } else if (fields.api_key !== config['api_key']) {
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
            console.error("Error on finish:", err);
            res.send("Internal Server Error");
        }
    });

    return req.pipe(busboy);
};


function handle_delete(req, res) {
    var config = req.app.locals.config
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
            cf_invalidate(req.query.ident, config);
            res.redirect('/');
        });
    }
};

function ident_path(ident) {
    return '../i/' + path.basename(ident);
}

function ident_exists(ident) {
    try {
        fs.lstatSync(ident_path(ident));
        return true;
    } catch (err) {
        return false;
    }
}

function cf_do_invalidate(ident, mode, cfconfig) {
    var inv_url = mode + '://' + cfconfig.url + '/i/' + ident;

    request.post({
        url: 'https://www.cloudflare.com/api_json.html',
        form: {
            a: 'zone_file_purge',
            tkn: cfconfig.token,
            email: cfconfig.email,
            z: cfconfig.domain,
            url: inv_url
        }
    }, function(err, response, body) {
        if (err) {
            console.error("Cache invalidate failed for", ident);
            console.error("Body:", body);
            return;
        }
        try {
            var result = JSON.parse(body)
            if (result.result === 'error') {
                console.error("Cache invalidate failed for", ident);
                console.error("Message:", msg);
            }
        } catch(err) {}
    });
}

function cf_invalidate(ident, config) {
    var cfconfig = config['cloudflare-cache-invalidate']
    if (!cfconfig.enabled) {
      return;
    }
    if (config.http.enabled)
        cf_do_invalidate(ident, 'http', cfconfig);
    if (config.https.enabled)
        cf_do_invalidate(ident, 'https', cfconfig);
}

function create_app(config) {
  var app = express();
  app.locals.config = config
  app.use('', express.static(config.path.client));
  app.use('/i', express.static(config.path.i));
  app.post('/up', handle_upload);
  app.get('/del', handle_delete);
  return app
}

/* Convert an IP:port string to a split IP and port */
function get_addr_port(s) {
    var spl = s.split(":");
    if (spl.length === 1)
        return { host: spl[0], port: 80 };
    else if (spl[0] === '')
        return { port: parseInt(spl[1]) };
    else
        return { host: spl[0], port: parseInt(spl[1]) };
}

function serv(server, serverconfig, callback) {
  var ap = get_addr_port(serverconfig.listen);
  return server.listen(ap.port, ap.host, callback);
}

function init_defaults(config) {
  config.path = config.path ? config.path : {};
  config.path.i = config.path.i ? config.path.i : "../i";
  config.path.client = config.path.client ? config.path.client : "../client";
}

function init(config) {
  init_defaults(config)

  var app = create_app(config);

  if (config.http.enabled) {
    serv(http.createServer(app), config.http, function() {
      console.info('Started server at http://%s:%s', this.address().address, this.address().port);
    });
  }

  if (config.https.enabled) {
      var sec_creds = {
          key: fs.readFileSync(config.https.key),
          cert: fs.readFileSync(config.https.cert)
      };
      serv(https.createServer(sec_creds, app), config.https, function() {
        console.info('Started server at https://%s:%s', this.address().address, this.address().port);
      });
  }
}

function main(configpath) {
  init(JSON.parse(fs.readFileSync(configpath)));
}

main('./server.conf')
