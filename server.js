var mdns    = require('mdns'),
    http    = require('http'),
    express = require('express'),
    getopt  = require('posix-getopt'),
    _       = require('underscore')._;

var vms = {
    peers: {}
};

// Options and peers
(function(){
    var parser = new getopt.BasicParser('p:(peers)h(help)', process.argv);
    var option;
    var config = {};

    function usage(){
        console.log('Options: --peers <host1,host2,...>');
        process.exit(1);
    }

    while ((option = parser.getopt()) !== undefined){
        switch (option.option){
            case 'h':
                usage();
                break;
            case 'p':
                config.peers = option.optarg;
                break;
        }
    }

    if (config.peers){
        var peers = config.peers.split(/,/);
        _.each(peers, function(p){
            vms.peers[p] = {};
        });
    }

    function poll_peers(){
        //console.log(JSON.stringify(vms));
        // These GETs happen in parallel
        _.each(vms.peers, function(vmlist, peer){
            //console.log('checking peer: ' + peer);
            var parts = peer.split(/:/);
            http.get(
                {
                    host: parts[0],
                    port: parts.length > 1 ? parts[1] : 9300,
                    path: '/'
                },
                query_handler(
                    function(s){
                        var p = JSON.parse(s);
                        var v = {};
                        _.each(p, function(val, key){
                            if (key.match(/^\d+\.\d+\.\d+\.\d+$/)){
                                v[key] = val;
                            }
                        });
                        vms.peers[peer] = v;
                    }
                )
            ).on('error', function(e){
                console.log('Error querying peer ' + peer + ' [[' + e.message + ']]');
            });
        });
        setTimeout(poll_peers, 6*1000);
    };

    setTimeout(poll_peers, 0);
})();

// HTTP server
(function(){
    var CRLF = '\r\n';

    var webapp  = express();

    webapp.get('/', function(req, res){
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(vms) + CRLF);
    });

    webapp.listen(9300, function(){
        console.log('This vm-announce server can be queried over HTTP on port 9300');
    });
})();

// mDNS browser
(function(){
    function unwrap_mdns_name(service){
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

    function add_vm(s){
        var ips = unwrap_mdns_name(s);
        if (ips){
            vms[ips[0]] = {};
            console.log('add: ' + ips[0]);
            http.get(
                {host: ips[0], port: 9301, path: '/'},
                query_handler(
                    function(s){
                        _.extend(vms[ips[0]], JSON.parse(s));
                    }
                )
            ).on('error', function(e){
                console.log('Error querying metadata from http://' + ips[0] + ':9301 [[' + e.message + ']]');
            });
        }
    }

    function rm_vm(s){
        var ips = unwrap_mdns_name(s);
        if (ips){
            vms[ips[0]] = undefined;
            console.log('rm: ' + ips[0]);
        }
    }

    var browser = mdns.createBrowser(mdns.tcp('vm'), {resolverSequence: []});

    browser.on('serviceUp', add_vm);
    browser.on('serviceChanged', function(){});
    browser.on('serviceDown', rm_vm);
    browser.on(
        'error',
        function(e){
            console.log('error: ' + JSON.stringify(e));
        }
    );

    browser.start();
})();

function query_handler(func){
    return function(resp){
        var str = '';
        resp.on('data', function(chunk){
            str += chunk;
        });
        resp.on('end', function(){
            try{
                func(str);
            }catch(ex){
                console.log('Exception processing query response [[' + ex + ']]');
            }
        });
    };
}

