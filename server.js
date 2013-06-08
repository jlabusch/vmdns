var mdns    = require('mdns'),
    http    = require('http'),
    express = require('express'),
    getopt  = require('posix-getopt'),
    util    = require('./util.js'),
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

    function vm_loader(key){
        return function(j){
            _.extend(vms[key], JSON.parse(j));
        };
    }

    function add_vm(s){
        var ips = unwrap_mdns_name(s);
        if (ips){
            vms[ips[0]] = {};
            console.log('add: ' + ips[0]);
            http.get(
                {host: ips[0], port: 9301, path: '/'},
                util.query_handler(vm_loader(ips[0]))
            ).on('error', function(e){
                console.log('Error querying metadata from http://' + ips[0] + ':9301 [[' + e.message + ']]');
            });
        }
    }

    function rm_vm(s){
        var ips = unwrap_mdns_name(s);
        if (ips){
            console.log('rm: ' + ips[0]);
            delete vms[ips[0]];
        }
    }

    function poll_vms(vk){
        if (vk === undefined){
            vk = _.keys(vms);
        }
        if (vk.length < 1){
            poll_peers();
            return;
        }
        var ip = vk.shift();
        if (util.is_ip(ip) === false){
            poll_vms(vk);
            return;
        }
        var loadvm = vm_loader(ip);
        http.get(
            {host: ip, port: 9301, path: '/'},
            util.query_handler(function(j){
                loadvm(j);
                poll_vms(vk);
            })
        ).on('error', function(e){
            console.log('Error querying metadata from http://' + ip + ':9301 [[' + e.message + ']]');
            poll_vms(vk);
        });
    }

    function poll_peers(pk){
        if (pk === undefined){
            pk = _.keys(vms.peers);
        }
        if (pk.length < 1){
            setTimeout(poll_vms, 60*1000);
            return;
        }
        var peer = pk.shift();
        if (!peer){
            poll_peers(pk);
            return;
        }
        var parts = peer.split(/:/);
        if (util.is_ip(parts[0]) === false){
            console.log('Skipping peer "' + peer + '"');
            poll_peers(pk);
            return;
        }
        http.get(
            {
                host: parts[0],
                port: parts.lenth > 1 ? parts[1] : 9300,
                path: '/'
            },
            util.query_handler(
                function(s){
                    var p = JSON.parse(s);
                    var v = {};
                    _.each(p, function(val, key){
                        if (util.is_ip(key)){
                            v[key] = val;
                        }
                    });
                    vms.peers[peer] = v;
                    poll_peers(pk);
                }
            )
        ).on('error', function(e){
            console.log('Error querying peer ' + peer + ' [[' + e.message + ']]');
            poll_peers(pk);
        });
    }

    setTimeout(poll_vms, 2*1000);

    var browser = mdns.createBrowser(mdns.tcp('vm'), {resolverSequence: []});

    browser.on('serviceUp', add_vm);
    browser.on('serviceChanged', function(){});
    browser.on('serviceDown', rm_vm);
    browser.on(
        'error',
        function(e){
            console.log('mDNS browser error: ' + JSON.stringify(e));
        }
    );

    browser.start();
})();

