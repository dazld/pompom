function broadcast(event, message) {
    message = JSON.stringify(message);
    ++lastMessageId;
    history.push({
        id: lastMessageId,
        event: event,
        message: message
    });

    //console.log('broadcast to %d connections', connections.length);

    connections.forEach(function(res) {
        sendSSE(res, lastMessageId, event, message);
    });
}

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
            removeConnection(res);
        }, 250);
    }
    // console.log(data);
}


module.exports = function stats(request, response) {
    // only response to an event-stream if the request 
    // actually accepts an event-stream
    if (request.headers.accept == 'text/event-stream') {

        // send the header to tell the client that we're going
        // to be streaming content down the connection
        response.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            'connection': 'keep-alive'
        });

        // support the polyfill - we'll come on to this later
        if (request.headers['x-requested-with'] == 'XMLHttpRequest') {
            response.xhr = null;
        }

        // if there was a lastEventId sent in the header, send
        // the history of messages we've already stored up
        if (request.headers['last-event-id']) {
            var id = parseInt(request.headers['last-event-id']);
            for (var i = 0; i < history.length; i++) {
                if (history[i].id >= id) {
                    sendSSE(response, history[i].id, history[i].event, history[i].message);
                }
            }
        } else {
            // if the client didn't send a lastEventId, it's the
            // first time they've come to our service, so send an
            // initial empty message with no id - this will reset
            // their id counter too.
            response.write('id\n\n');
        }

        // cache their connection - the response is where we write
        // to send messages
        connections.push(response);

        // send a broadcast message to all connected clients with
        // the total number of connections we have.
        broadcast('connections', connections.length);

        // if the connection closes to the client, remove them
        // from the connections array.
        request.on('close', function() {
            removeConnection(response);
        });
    } else {
        // if the client doesn't accept event-stream mime type,
        // send them the regular index.html page - you could do
        // anything here, including sending the client an error.
        response.writeHead(302, {
            location: "/index.html"
        });
        response.end();
    }
}
