
exports.is_ip = function(x){
    return x.match(/^\d+\.\d+\.\d+\.\d+$/);
}

exports.query_handler = function(func){
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

