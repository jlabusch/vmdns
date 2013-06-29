var resolver= require('./build/Release/avahi_resolver'),
    stats   = require('./stats.js'),
    _       = require('underscore')._;

var LOCK_TIMEOUT = 5*1000;

var locked = {};

function lock(x){ locked[x] = true; }
function unlock(x){ locked[x] = false; }
function unlocker(x){ return function(){ unlock(x); }; }

var vms = {};

exports.data = vms;

exports.update = function(key, newdata){
    vms[key] = _.extend(vms[key], newdata);
};

exports.add = function(obj){
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
                    stats.fetch(obj.host, obj.port, stats.updater(obj.name));
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
};

exports.rm = function(obj){
    // Respect locks, but since this is synchronous there's no need for its own lock.
    if (locked[obj.host]){
        return;
    }
    console.log(obj.name + ' => {deleted}');
    delete vms[obj.name];
};
