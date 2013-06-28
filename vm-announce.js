var mdns    = require('mdns'),
    http    = require('http'),
    express = require('express'),
    fs      = require('fs'),
    util    = require('./util.js'),
    resolver= require('./build/Release/avahi_resolver'),
    _       = require('underscore')._;

var stats = {};

var STAT_UPDATE_INTERVAL = 30*1000;
var LOCK_TIMEOUT = 5*1000;

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
        setTimeout(update_stats, STAT_UPDATE_INTERVAL);
    }

    update_stats();
})();

var locked = {};

function lock(x){ locked[x] = true; }
function unlock(x){ locked[x] = false; }
function unlocker(x){ return function(){ unlock(x); }; }

var vms = {};

// mDNS browser
(function(){
    function update_other_stats(host, port, callback){
        http.get(
            {host: host, port: port, path: '/stats'},
            function(resp){
                var str = '';
                resp.on('data', function(chunk){
                    str += chunk;
                });
                resp.on('end', function(){
                    var stats = {};
                    var err = null;
                    try{
                        stats = JSON.parse(str);
                    }catch(ex){
                        err = 'Exception parsing stats for ' + host + ' [[' + ex + ']]';
                    }
                    callback(err, stats);
                });
            }
        ).on('error', function(e){
            console.log("Couldn't fetch stats from " + host + ':' + port + '/stats');
        });
    }

    function stat_updater(key){
        return function(err, stats){
            if (err){
                console.log(err);
            }else{
                vms[key] = _.extend(vms[key], stats);
            }
        };
    }

    function update_all_other_stats(list){
        if (!list){
            list = _.keys(vms);
        }
        if (list.length < 1){
            setTimeout(update_all_other_stats, STAT_UPDATE_INTERVAL);
            return;
        }
        var head = list.shift();
        var updater = stat_updater(head);
        update_other_stats(vms[head].host, vms[head].port, function(e, s){
            updater(e, s);
            update_all_other_stats(list);
        });
    }

    update_all_other_stats();

    function add_vm(obj){
        try{
            if (obj.host){
                if (locked[obj.host]){
                    return;
                }
                lock(obj.host);
                resolver(obj.host, function(err, name, addr){
                    if (err){
                        console.log('Error in Avahi resolver: ' + err);
                        return;
                    }
                    console.log(obj.name + ' => ' + addr);
                    vms[obj.name] = _.extend({addr: addr}, obj);
                    if (obj.port){
                        update_other_stats(obj.host, obj.port, stat_updater(obj.name));
                    }else{
                        console.log('Host ' + obj.name + ' has no port specified');
                    }
                    setTimeout(unlocker(obj.host), LOCK_TIMEOUT);
                });
            }else{
                console.log(obj.name + ' => {unknown}');
                vms[obj.name] = obj;
            }
        }catch(ex){
            console.log('Exception in add_vm: ' + ex);
        }
    }

    function rm_vm(obj){
        // Respect locks, but since this is synchronous there's no need for its own lock.
        if (locked[obj.host]){
            return;
        }
        console.log(obj.name + ' => {deleted}');
        delete vms[obj.name];
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
