var http    = require('http'),
    getopt  = require('posix-getopt'),
    util    = require('./util.js'),
    _       = require('underscore')._;

var config = {
    list: false,
    server: 'localhost',
    port: 9300
};

var parser = new getopt.BasicParser('l(list)s:(server)h(help)', process.argv);
var option;

function usage(){
    console.log('Options: [--list] [--server <host[:port]>]');
    process.exit(1);
}

while ((option = parser.getopt()) !== undefined){
    switch (option.option){
        case 'h':
            usage();
            break;
        case 's':
            config.server = option.optarg;
            var parts = config.server.split(/:/);
            if (parts > 1){
                config.server = parts[0];
                config.port = parseInt(parts[1]);
                if (isNaN(config.port)){
                    usage();
                }
            }
            break;
        case 'l':
            config.list = true;
            break;
    }
}

http.get(
    {host: config.server, port: config.port, path: '/'},
    util.query_handler(
        function(s){
            var vms  = JSON.parse(s),
                ips  = [],
                meta = [];
            function visit_peer(p){
                _.each(p, function(attrs, ip){
                    if (util.is_ip(ip)){
                        ips.push(ip);
                        meta.push(
                            _.reduce(
                                attrs,
                                function(memo, val, key){
                                    if (memo.length){
                                        memo += ', ';
                                    }
                                    return memo + key + '=' + val;
                                },
                                ''
                            )
                        );
                    }
                });
            }
            visit_peer(vms);
            if (vms.peers){
                _.each(vms.peers, function(p){
                    visit_peer(p);
                });
            }
            if (config.list){
                _.each(
                    _.zip(ips, meta),
                    function(val){
                        console.log(val[0] + ': ' + val[1]);
                    }
                );
            }else{
                console.log(ips.join(' '));
            }
        }
    )
).on('error', function(e){
    console.log('Error querying ' + server + ' [[' + e.message + ']]');
});

