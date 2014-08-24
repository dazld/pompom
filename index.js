
var http = require('http');
var chokidar = require('chokidar');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var argv = require('minimist')(process.argv.slice(2));

var options = {
    cwd: argv.cwd || __dirname,
    root: argv.index || 'index.html',
    live: argv.live || false,
    bundler: argv.bundler || false,
    port: argv.port || 8001,
    hostname: argv.hostname || '0.0.0.0'
}

function fileExists(file){
    return new Promise(function(resolve, reject){
        fs.stat(path.resolve(options.cwd, file), function(err, stat){
            if (err) {
                reject(err);
            } else {
                resolve(stat);
            }
        });
    });
}

var server = http.createServer(function(req,res){
    console.log(req.method, req.url);
    res.end('hey')
});

server.listen(options.port, options.hostname, console.log);
