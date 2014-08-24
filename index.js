var http = require('http');
var chokidar = require('chokidar');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var mime = require('mime');

mime.default_type = 'text/html';

function checkMime(path){
    return mime.lookup(path);
}

var liveReloadScript = ['<script>',fs.readFileSync(__dirname+'/live/live.js').toString(),'</script>'].join('');


// cache up static pages
var staticPages = (function() {
    var pompomDir = __dirname;
    var pages = {
        404: '/static/404.html',
        500: '/static/500.html'
    };
    var entry = {};
    _.each(pages, function(val, key) {
        entry[key] = fs.readFileSync(pompomDir + val).toString();
    });

    return entry;
})();

// check if that path actually exists
// @todo - need to check directories!
var fileExists = Promise.promisify(fs.stat);

// checking html accepts header for json or html
function acceptsHtml(accepts) {
    return /text\/html/.test(accepts.toLowerCase());
}
function acceptsJSON(accepts) {
    return /application\/json/.test(accepts.toLowerCase());
}



module.exports = function run(args, cwd, stdout, stderr) {
    
    function normaliseRequest(file) {

        if (file === '/') {
            file = options.index;
        }
        var filePath = path.join(options.cwd, file);
        return filePath;
    }

    // the index file will probably be changing, so get a fresh
    // one each time
    function getIndex() {
        var index = fs.readFileSync(normaliseRequest('/')).toString();
        index = index+liveReloadScript;
        return index;
    }

    var argv = require('minimist')(args);

    var options = {
        cwd: cwd || __dirname,
        index: argv.index || 'index.html',
        live: argv.live || false,
        bundler: argv.bundler || false,
        port: argv.port || 8001,
        hostname: argv.hostname || '0.0.0.0'
    };

    var server = http.createServer(function(req, res) {

        // are we getting pinged for a SSE?
        if (req.url === '/pompom-reload') {
            res.end('hey');
            return;
        };

        var normalisedReq = normaliseRequest(req.url);

        fileExists(normalisedReq).then(function(stat) {
            var data = fs.readFileSync(normalisedReq).toString();
            if (data && acceptsHtml(req.headers.accept)) {
                
                data = data+liveReloadScript;
            }
            return {
                content: data
            };

        }, function(err) {
            console.log('file not found, trying to fallback to default');
            var data = false;
            if (acceptsHtml(req.headers.accept)) {
                data = getIndex();
            }

            return {
                content: data
            };

        }).then(function(options) {

            var toRespond = {
                code: options.content ? 200 : 404,
                payload: options.content || staticPages['404']
            };

            res.writeHead(toRespond.code, {
                // todo sniff the mime type from the path
                // with html as default
                'Content-Type': checkMime(normalisedReq)
            });

            res.write(toRespond.payload);

            res.end();
        }).catch(function(err) {
            console.log(err);
            res.writeHead(500, {
                'Content-Type': 'text/html'
            });
            res.write(staticPages['500']);
            res.end();
        });
    });

    server.listen(options.port, options.hostname, null, function() {
        console.log('PomPom up on ' + options.port);
    });
};
