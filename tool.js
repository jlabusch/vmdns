var http    = require('http'),
    util    = require('./util.js'),
    _       = require('underscore')._;

module.exports = (function(){
    var config = {};

    function show_vms(raw){
        var js  = JSON.parse(raw),
            ips  = [],
            names= [],
            meta = [];
        _.each(js, function(attrs, vm){
            if (config.filter.length && _.contains(config.filter, attrs.name) == false){
                // skip
                return;
            }
            names.push(vm);
            ips.push(attrs.addr || 'addr-unknown');
            var summary = '';
            ['addr', 'uptime', 'loadavg'].forEach(function(k){
                if (attrs[k]){
                    if (summary.length){
                        summary += ', ';
                    }
                    summary += k + ' ' + attrs[k];
                }
            });
            meta.push(summary);
        });
        if (config.mode === 'long'){
            _.each(
                _.zip(names, meta),
                function(val){
                    console.log(val[0] + ':\t' + val[1]);
                }
            );
        }else{
            console.log(ips.join(' '));
        }
    }

    return {
        query: function(c){
            config = c;
            http.get(
                {host: config.host, port: config.port, path: '/'},
                util.query_handler(show_vms)
            ).on('error', function(e){
                console.log('Error querying ' + config.host + ' [[' + e.message + ']]');
            });
        }
    };
})();

