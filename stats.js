var http    = require('http'),
    fs      = require('fs'),
    vms     = require('./vms.js'),
    _       = require('underscore')._;

var STAT_UPDATE_INTERVAL = 30*1000;

var stats = {};

function fix(n){
    return n.toFixed(2);
}

function update_my_stats(){
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
    setTimeout(update_my_stats, STAT_UPDATE_INTERVAL);
}

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
            vms.data[key] = _.extend(vms.data[key], stats);
        }
    };
}

function update_all_other_stats(list){
    if (!list){
        list = _.keys(vms.data);
    }
    if (list.length < 1){
        setTimeout(update_all_other_stats, STAT_UPDATE_INTERVAL);
        return;
    }
    var head = list.shift();
    var updater = stat_updater(head);
    update_other_stats(vms.data[head].host, vms.data[head].port, function(e, s){
        updater(e, s);
        update_all_other_stats(list);
    });
}

exports.fetch = update_other_stats;

exports.me = function(){ return stats; };

exports.updater = stat_updater;

exports.run = function(){
    update_my_stats();
    update_all_other_stats();
};

