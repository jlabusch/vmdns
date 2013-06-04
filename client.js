var mdns    = require('mdns'),
    express = require('express'),
    getopt  = require('posix-getopt'),
    util    = require('./util.js'),
       _    = require('underscore')._;

var parser = new getopt.BasicParser('n:(name)h(help)', process.argv);
var option;
var config = {};

function usage(m){
    console.log('Options: --name <name>');
    process.exit(1);
}

while ((option = parser.getopt()) !== undefined){
    switch (option.option){
        case 'h':
            usage();
            break;
        case 'n':
            config.name = option.optarg;
            break;
    }
}

util.getNetworkIPs(
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
            res.end(JSON.stringify(config));
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

