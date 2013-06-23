var mdns    = require('mdns'),
    util    = require('./util.js'),
    express = require('express'),
    resolver= require('./build/Release/avahi_resolver'),
    _       = require('underscore')._;


var browser = mdns.createBrowser(mdns.tcp('vm'), {resolverSequence: [mdns.rst.DNSServiceResolve()]});

var vms = {
};

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

browser.on('serviceUp', add_vm);
browser.on('serviceChanged', add_vm);
browser.on('serviceDown', rm_vm);
browser.on('error', function(e){ console.log('Error: ' + JSON.stringify(e)); });

browser.start();

var ad = mdns.createAdvertisement(
    mdns.tcp('vm'),
    9301
);

ad.start();

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
