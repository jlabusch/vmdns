var resolver= require('./build/Release/avahi_resolver'),
    stats   = require('./stats.js'),
    fs      = require('fs'),
    _       = require('underscore')._;

var LOCK_TIMEOUT = 5*1000;

var __locks = {};
var __lid = 1;

function lock(x){
    if (__locks[x]){
        throw "'" + x + "' is already locked";
    }
    var n = __lid++;
    __locks[x] = n;
    return n;
}
function locked(x, id){
    return id ? __locks[x] == id : __locks[x];
}
function unlock(x, id){
    if (id){
        if (__locks[x] == id){
            __locks[x] = 0;
        }else{
            console.log('Lock ' + id + " for '" + x + "' already released");
        }
    }else{
        __locks[x] = 0;
    }
}
function unlocker(x, id){ return function(){ unlock(x, id); }; }

var vms = {};

exports.data = vms;

exports.update = function(key, newdata){
    vms[key] = _.extend(vms[key], newdata);
};

var HOSTS = '/etc/hosts';

function sync_to_hosts_file(and_then){
    // TODO:
    // Attempt to clean up hosts file by deleting entries with "Added by vmdns"
    // comment that don't exist in vms any more
    and_then = and_then || function(){};
    var hostmap = {};
    _.each(vms, function(attrs){
        hostmap[attrs.name] = {
            addr: attrs.addr,
            str: attrs.addr + '\t' + [attrs.host, attrs.name].join(' ').replace(/local\./g, 'local') + " # Added by vmdns",
            done: false
        };
    });
    fs.readFile(HOSTS, 'utf8', function(err, input){
        if (err){
            console.log("Can't read " + HOSTS + " [[" + err + "]]");
            and_then();
        }else{
            var lines = input.split(/\n/);
            var find_in_hm = function(line){
                var entry = null;
                _.each(hostmap, function(detail){
                    if (line.match(new RegExp("\\s*#?\\s*" + detail.addr))){
                        entry = detail;
                    }
                });
                return entry;
            };
            for (var i = 0; i < lines.length; ++i){
                var he = find_in_hm(lines[i]);
                if (he){
                    lines[i] = he.str;
                    he.done = true;
                }else{
                    if (lines[i].match(/Added by vmdns/)){
                        lines.splice(i, 1);
                        --i;
                    }
                }
            }
            if (lines[lines.length - 1].length < 1){
                lines.pop();
            }
            _.each(hostmap, function(detail){
                if (detail.done == false){
                    lines.push(detail.str);
                }
            });
            if (lines[lines.length - 1].length > 0){
                lines.push(''); // file must end in newline
            }
            fs.writeFile(HOSTS, lines.join('\n'), function(err){
                if (err){
                    console.log('Error updating ' + HOSTS + ': ' + err);
                }
                and_then();
            });
        }
    });
}

exports.add = function(obj){
    try{
        if (obj.host){
            if (locked(obj.host)){
                return;
            }
            var lid = lock(obj.host);
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
    // Don't try to clean up hosts file too aggressively
    if (locked(obj.host)){
        return;
    }
    console.log(obj.name + ' => {deleted}');
    delete vms[obj.name];
};
