var mdns    = require('mdns'),
    express = require('express'),
    util    = require('./util.js'),
    vms     = require('./vms.js'),
    stats   = require('./stats.js'),
    _       = require('underscore')._;

stats.run();

// mDNS browser
(function(){
    var browser = mdns.createBrowser(mdns.tcp('vm'), {resolverSequence: [mdns.rst.DNSServiceResolve()]});

    browser.on('serviceUp', vms.add);
    browser.on('serviceChanged', vms.add);
    browser.on('serviceDown', vms.rm);
    browser.on('error', function(e){ console.log('Error: ' + JSON.stringify(e)); });

    browser.start();
})();

// mDNS client
(function(){
    var ad = mdns.createAdvertisement(
        mdns.tcp('vm'),
        9300
    );

    ad.start();
})();

// HTTP server
(function(){
    var CRLF = '\r\n';

    var webapp  = express();

    webapp.get('/', function(req, res){
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(vms.data) + CRLF);
    });
    webapp.get('/stats', function(req, res){
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(stats.me()) + CRLF);
    });

    webapp.listen(9300, function(){
        console.log('This vm-announce server can be queried over HTTP on port 9300');
    });
})();
