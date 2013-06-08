var mdns    = require('mdns'),
    express = require('express'),
    getopt  = require('posix-getopt'),
    fs      = require('fs'),
    _       = require('underscore')._;

var vm = {};

function fix(n){
    return n.toFixed(2);
}

function update_stats(){
    fs.readFile('/proc/loadavg', 'utf8', function(err, loadavg){
        if (err){
            console.log("Can't read /proc/loadavg [[" + err + "]]");
        }else{
            var parts = loadavg.split(/ /);
            vm.loadavg = parts[0] + ' ' + parts[1] + ' ' + parts[2];
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
                        vm.uptime = sec + ' sec';
                    }else if (sec < (60*72)){
                        vm.uptime = fix(sec/60) + ' min';
                    }else if (sec < (60*60*25)){
                        vm.uptime = fix(sec/(60*60)) + ' hours';
                    }else{
                        vm.uptime = fix(sec/(60*60*24)) + ' days';
                    }
                }
            }
        });
    });
}

setInterval(update_stats, 60*1000);

(function(){
    var parser = new getopt.BasicParser('n:(name)d:(desc)h(help)', process.argv);
    var option;

    function usage(){
        console.log('Options: [--name <name>] [--desc <description>]');
        process.exit(1);
    }

    while ((option = parser.getopt()) !== undefined){
        switch (option.option){
            case 'h':
                usage();
                break;
            case 'n':
                vm.name = option.optarg;
                break;
            case 'd':
                vm.desc = option.optarg;
                break;
        }
    }
})();

// From http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
var getNetworkIPs = (function(){
    var ignoreRE = /^(127\.0\.0\.1|::1|fe80(:1)?::1(%.*)?)$/i;

    var exec = require('child_process').exec;
    var cached;
    var command;
    var filterRE;

    switch (process.platform) {
        case 'darwin':
            command = 'ifconfig';
            filterRE = /\binet\s+([^\s]+)/g;
            // filterRE = /\binet6\s+([^\s]+)/g; // IPv6
            break;
        default:
            command = 'ifconfig';
            filterRE = /\binet\b[^:]+:\s*([^\s]+)/g;
            // filterRE = /\binet6[^:]+:\s*([^\s]+)/g; // IPv6
            break;
    }

    return function (callback, bypassCache) {
        if (cached && !bypassCache) {
            callback(null, cached);
            return;
        }
        // system call
        exec(command, function (error, stdout, sterr) {
            cached = [];
            var ip;
            var matches = stdout.match(filterRE) || [];
            for (var i = 0; i < matches.length; i++) {
                ip = matches[i].replace(filterRE, '$1')
                if (!ignoreRE.test(ip)) {
                    cached.push(ip);
                }
            }
            callback(error, cached);
        });
    };
})();

getNetworkIPs(
    function(err, ips){
        if (!ips || ips.length < 1){
            console.log("Couldn't determine this host's IP address; exiting.");
            process.exit(1);
        }

        var webapp = express();

        webapp.get('/', function(req, res){
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(vm));
        });

        webapp.listen(9301, function(){
            console.log('This vm-announce client can be queried over HTTP on port 9301');
        });

        var ad = mdns.createAdvertisement(
            mdns.tcp('vm'),
            9301,
            {name: JSON.stringify(ips)}
        );

        ad.start();
    }
);

