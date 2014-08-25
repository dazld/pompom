var http = require('http');
var chokidar = require('chokidar');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var mime = require('mime');


mime.default_type = 'text/html';

function checkMime(path) {
    return mime.lookup(path);
}

var liveReloadScript = ['<script>', fs.readFileSync(__dirname + '/live/live.js').toString(), '</script>'].join('');


function sendSSE(res, id, event, message) {
    var data = '';
    if (event) {
        data += 'event: ' + event + '\n';
    }

    // blank id resets the id counter
    if (id) {
        data += 'id: ' + id + '\n';
    } else {
        data += 'id\n';
    }

    if (message) {
        data += 'data: ' + message.split(/\n/).join('\ndata:') + '\n';
    }
    data += '\n'; // final part of message

    res.write(data);

    if (res.hasOwnProperty('xhr')) {
        clearTimeout(res.xhr);
        res.xhr = setTimeout(function() {
            res.end();
            // removeConnection(res);
        }, 250);
    }
    console.log(data);
}

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

    var sseConnections = {};


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
        index = index + liveReloadScript;
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

    

    // do we have a webpack config we can parse?
    var webpackConfig = path.join(cwd, 'webpack.config.js');

    var checkingConfig = fileExists(webpackConfig).then(function(){
        
        var webpackLocal = {};
        var config = webpackLocal.config = require(webpackConfig);
        webpackLocal.output = path.join(config.output.path, config.output.filename);
        webpackLocal.entry = path.join(cwd, config.entry);

        // load local webpack
        var webpack = require(path.join(cwd,'node_modules/webpack'));

        var compiler = webpackLocal.compiler = webpack(config);
        return webpackLocal;

    }, function(err){
        console.log(err);
        // no webpack config
        throw new Error('sorry, no webpack config found');
    });

   

    var server = http.createServer(function(req, res) {

        // are we getting pinged for a SSE?
        if (req.url === '/pompom-reload') {
            
            res.writeHead(200, {
                'content-type': 'text/event-stream',
                'cache-control': 'no-cache',
                'connection': 'keep-alive'
            });

            var id = Math.random();
            sseConnections[id] = {
                req: req,
                res: res
            };

            var cleanup = function(){
                // req.off('close', cleanup);
                delete sseConnections[id];
            }

            // req.on('close', cleanup);
            // sendSSE(res, Date.now(), 'rocking', 'open');
            
            return;
        }

        var normalisedReq = normaliseRequest(req.url);

        fileExists(normalisedReq).then(function(stat) {
            var data = fs.readFileSync(normalisedReq).toString();
            if (data && acceptsHtml(req.headers.accept)) {

                data = data + liveReloadScript;
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


    checkingConfig.then(function(webpackLocal){

        var watcher = chokidar.watch(cwd, {
            ignored: /[\/\\]\./,
            ignoreInitial: true,
            interval: 500,
            usePolling: false
        });

        var building = false;

        watcher.on('change', function(file){

            if (file === webpackLocal.output || building) {
                console.log('ignoring build output, or already building');
                return;
            };

            building = true;

            // broadcast reload event
            console.log('trying to rebuild');
            webpackLocal.compiler.run(function(){
                building = false;
                console.log('build finished')
                // broadcast reload SSE
                _.each(sseConnections,function(connection,key){
                    var res = connection.res;
                    console.log(key, connection.req.url)
                    sendSSE(res, Date.now(), 'reload', 'true');
                });
            });
        });


        server.listen(options.port, options.hostname, null, function() {
            console.log('PomPom up on ' + options.port);
        });

    }, function(err){
        console.log(err);
        process.exit(1);
    })

    
};
