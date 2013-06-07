var http    = require('http'),
    _       = require('underscore')._;

var server = 'localhost'; // TODO - remote hosts and peers

http.get(
    {host: server, port: 9300, path: '/'},
    query_handler(
        function(s){
            var vms = JSON.parse(s);
            delete vms.peers;
            var ips = _.map(
                vms,
                function(val, key){
                    return key;
                }
            );
            console.log(ips.join(' '));
        }
    )
).on('error', function(e){
    console.log('Error querying ' + server + ' [[' + e.message + ']]');
});

function query_handler(func){
    return function(resp){
        var str = '';
        resp.on('data', function(chunk){
            str += chunk;
        });
        resp.on('end', function(){
            try{
                func(str);
            }catch(ex){
                console.log('Exception processing query response [[' + ex + ']]');
            }
        });
    };
}

