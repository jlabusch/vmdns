var mdns    = require('mdns'),
    http    = require('http'),
    express = require('express'),
    _       = require('underscore')._;

var browser = mdns.createBrowser(mdns.tcp('vm'), {resolverSequence: []});

function unwrap(service){
    if (service.type.name !== 'vm'){
        return undefined;
    }
    var arr = undefined;
    try{
        arr = JSON.parse(service.name);
    }catch(ex){
        console.log('Exception while parsing service name [[' + ex + ']]');
    }
    if (!arr || arr.length < 1){
        console.log('Invalid service name - not a list of IP addresses [[' + service.name + ']]');
        return undefined;
    }
    return arr;
}

var vms = {};

function query_handler(ips){
    return function(resp){
        var str = '';
        resp.on('data', function(chunk){
            str += chunk;
        });
        resp.on('end', function(){
            try{
                _.extend(vms[ips[0]], JSON.parse(str));
            }catch(ex){
                console.log('Exception processing query response for ' + ip + ' [[' + ex + ']]');
            }
        });
    };
}

browser.on(
    'serviceUp',
    function(s){
        var ips = unwrap(s);
        if (ips){
            if (vms[ips[0]]){
                // Already seen, not interesting
            }else{
                vms[ips[0]] = {};
                console.log('up: ' + ips[0]);
                http.get({host: ips[0], port: 9301, path: '/'}, query_handler(ips)).on('error', function(e){
                    console.log('Error querying metadata from http://' + ips[0] + ':9301 [[' + e.message + ']]');
                });
            }
        }
    }
);
browser.on(
    'serviceDown',
    function(s){
        var ips = unwrap(s);
        if (ips){
            if (!vms[ips[0]]){
                // Already seen, not interesting
            }else{
                vms[ips[0]] = undefined;
                console.log('down: ' + ips[0]);
            }
        }
    }
);
browser.on(
    'error',
    function(e){
        console.log('error: ' + JSON.stringify(e));
    }
);

browser.start();

var webapp  = express();

webapp.get('/', function(req, res){
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(vms));
});

webapp.listen(9300, function(){
    console.log('This vm-announce server can be queried over HTTP on port 9300');
});

