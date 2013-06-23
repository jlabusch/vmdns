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
    console.log('Options: [--list] [--server <host[:port]>] [vm-names...]');
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

var filter = process.argv.slice(parser.optind());

http.get(
    {host: config.server, port: config.port, path: '/'},
    util.query_handler(
        function(s){
            var vms  = JSON.parse(s),
                ips  = [],
                names= [],
                meta = [];
            _.each(vms, function(attrs, vm){
                if (filter.length && _.contains(filter, attrs.name) == false){
                    // skip
                    return;
                }
                names.push(vm);
                ips.push(attrs.addr || 'addr-unknown');
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
            });
            if (config.list){
                _.each(
                    _.zip(names, meta),
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
    console.log('Error querying ' + config.server + ' [[' + e.message + ']]');
});

