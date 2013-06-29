#!/usr/bin/env node

var http    = require('http'),
    getopt  = require('posix-getopt'),
    tool    = require('./tool.js'),
    _       = require('underscore')._;

var config = {
    mode: 'short',      // short, long, server
    host: 'localhost',  // ignored for mode=server
    filter: [],         // ignored for mode=server
    port: 9300
};

(function(){
    var parser = new getopt.BasicParser('l(list)s(server)c:(connect-to)h(help)', process.argv);
    var option;

    function usage(){
        console.log('Query:  vmdns [--list] [--connect-to <host[:port]>] [vm-names...]');
        console.log('Server: vmdns --server');
        process.exit(1);
    }

    while ((option = parser.getopt()) !== undefined){
        switch (option.option){
            case 'h':
                usage();
                break;
            case 's':
                config.mode = 'server';
                break;
            case 'c':
                config.host = option.optarg;
                var parts = config.host.split(/:/);
                if (parts > 1){
                    config.host = parts[0];
                    config.port = parseInt(parts[1]);
                    if (isNaN(config.port)){
                        usage();
                    }
                }
                break;
            case 'l':
                config.mode = 'long';
                break;
        }
    }

    config.filter = process.argv.slice(parser.optind());
})();

if (config.mode === 'server'){
    var stats   = require('./stats.js'),
        websvc  = require('./websvc.js'),
        mdns    = require('./zeroconf.js');
    stats.run();
    websvc.run();
    mdns.run();
}else{
    tool.query(config);
}

