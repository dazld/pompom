(function() {
    var source = new EventSource('/pompom-reload');
    var open = false;
    function connectionOpen(state){
        open = state;
    }

    source.onopen = function() {
        connectionOpen(true);
    };

    source.onerror = function() {
        connectionOpen(false);
    };


    source.onmessage = function(event) {
        // a message without a type was fired
        console.log(event);
    };

})()
