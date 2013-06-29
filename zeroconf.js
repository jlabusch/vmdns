var mdns    = require('mdns'),
    vms     = require('./vms.js');

module.exports = (function(){
    var browser = mdns.createBrowser(mdns.tcp('vm'), {resolverSequence: [mdns.rst.DNSServiceResolve()]});

    browser.on('serviceUp', vms.add);
    browser.on('serviceChanged', vms.add);
    browser.on('serviceDown', vms.rm);
    browser.on('error', function(e){ console.log('Error: ' + JSON.stringify(e)); });

    var ad = mdns.createAdvertisement(
        mdns.tcp('vm'),
        9300
    );

    return {
        run: function(){
            browser.start();
            ad.start();
        }
    };
})();

