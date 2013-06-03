var mdns = require('mdns'),
    util = require('./util.js'),
       _ = require('underscore')._;

util.getNetworkIPs(
    function(err, ips){
        var ad = mdns.createAdvertisement(
            mdns.tcp('vm'),
            9301,
            {
                txtRecord: {
                    name: 'Ubuntu 12.04 LTS',
                    addr: JSON.stringify(ips)
                }
            }
        );

        ad.start();
    }
);

