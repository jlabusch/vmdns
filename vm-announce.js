var mdns    = require('mdns'),
    http    = require('http'),
    express = require('express'),
    fs      = require('fs'),
    util    = require('./util.js'),
    resolver= require('./build/Release/avahi_resolver'),
    _       = require('underscore')._;

var stats = {};

// My stats
(function(){
    function fix(n){
        return n.toFixed(2);
    }

    function update_stats(){
        fs.readFile('/proc/loadavg', 'utf8', function(err, loadavg){
            if (err){
                console.log("Can't read /proc/loadavg [[" + err + "]]");
            }else{
                var parts = loadavg.split(/ /);
                stats.loadavg = parts[0] + ' ' + parts[1] + ' ' + parts[2];
            }
            fs.readFile('/proc/uptime', 'utf8', function(err, uptime){
                if (err){
                    console.log("Can't read /proc/uptime [[" + err + ']]');
                }else{
                    var sec = parseInt(uptime);
                    if (isNaN(sec)){
                        console.log("Couldn't parse /proc/uptime");
                    }else{
                        if (sec < 100){
                            stats.uptime = sec + ' sec';
                        }else if (sec < (60*72)){
                            stats.uptime = fix(sec/60) + ' min';
                        }else if (sec < (60*60*25)){
                            stats.uptime = fix(sec/(60*60)) + ' hours';
                        }else{
                            stats.uptime = fix(sec/(60*60*24)) + ' days';
                        }
                    }
                }
            });
        });
        setTimeout(update_stats, 30*1000);
    }

    update_stats();
})();

var vms = {};

// mDNS browser
(function(){
    function add_vm(obj){
        //console.log('Add: ' + JSON.stringify(obj));
        try{
            if (obj.host){
                resolver(obj.host, function(err, name, addr){
                    if (err){
                        console.log('Error in Avahi resolver: ' + err);
                        return;
                    }
                    console.log(obj.name + ' => ' + addr);
                    vms[obj.name] = _.extend({addr: addr}, obj);
                    if (obj.port){
                        http.get(
                            {host: addr, port: obj.port, path: '/stats'},
                            function(resp){
                                var str = '';
                                resp.on('data', function(chunk){
                                    str += chunk;
                                });
                                resp.on('end', function(){
                                    var stats = {};
                                    try{
                                        stats = JSON.parse(str);
                                        vms[obj.name] = _.extend(vms[obj.name], stats);
                                    }catch(ex){
                                        console.log('Exception parsing stats for ' + obj.name + ' [[' + ex + ']]');
                                    }
                                });
                            }
                        ).on('error', function(e){
                            console.log("Couldn't fetch stats from " + obj.name);
                        });
                    }else{
                        console.log('Host ' + obj.name + ' has no port specified');
                    }
                });
            }else{
                console.log(obj.name + ' => {unknown}');
                vms[obj.name] = obj;
            }
        }catch(ex){
            console.log('Exception in add_vm: ' + ex);
        }
        //console.log('VMs: ' + JSON.stringify(vms));
    }

    function rm_vm(obj){
        console.log(obj.name + ' => {deleted}');
        delete vms[obj.name];
        //console.log('VMs: ' + JSON.stringify(vms));
    }

    var browser = mdns.createBrowser(mdns.tcp('vm'), {resolverSequence: [mdns.rst.DNSServiceResolve()]});

    browser.on('serviceUp', add_vm);
    browser.on('serviceChanged', add_vm);
    browser.on('serviceDown', rm_vm);
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
        res.end(JSON.stringify(vms) + CRLF);
    });
    webapp.get('/stats', function(req, res){
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(stats) + CRLF);
    });

    webapp.listen(9300, function(){
        console.log('This vm-announce server can be queried over HTTP on port 9300');
    });
})();
