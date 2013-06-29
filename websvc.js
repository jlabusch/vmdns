var express = require('express'),
    stats   = require('./stats.js'),
    vms     = require('./vms.js');

module.exports = (function(){
    var CRLF = '\r\n';

    var www  = express();

    function send_json(x){
        return function(req, res){
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify(x) + CRLF);
        };
    }

    www.get('/', send_json(vms.data));
    www.get('/stats', send_json(stats.me()));

    return {
        run: function(){
            www.listen(9300, function(){
                console.log('This vm-announce server can be queried over HTTP on port 9300');
            });
        }
    };
})();
