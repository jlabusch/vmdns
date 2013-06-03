var mdns = require('mdns'),
       _ = require('underscore')._;

var browser = mdns.createBrowser(mdns.tcp('vm'), {resolverSequence: []});

browser.on(
    'serviceUp',
    function(s){
        console.log('up: ' + JSON.stringify(s));
    }
);
browser.on(
    'serviceChanged',
    function(s){
        console.log('change: ' + JSON.stringify(s));
    }
);
browser.on(
    'serviceDown',
    function(s){
        console.log('down: ' + JSON.stringify(s));
    }
);
browser.on(
    'error',
    function(e){
        console.log('error: ' + JSON.stringify(e));
    }
);

browser.start();

