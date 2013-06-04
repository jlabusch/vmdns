# What teh

I have many VMs that move around between hosts and even between networks. I can't keep track of them!
(Well I can, but it's harder than it should be.)

## Server

> `node ./server.js`

Starts a zeroconf server to track my VMs.

Query it at http://localhost:9300/ to get a JSON dump of hosts we know about.

## Client

> `node ./client.js --name "Fred"`

Starts a zeroconf client that registers a VM with the name "Fred".

## Example

<pre>
curl http://localhost:9300/ -o - 2&gt;/dev/null | python -mjson.tool 
{
    "10.1.1.4": {
        "name": "Fred"
    }
}
</pre>

## Dependencies

libavahi-compat-libdnssd-dev

## License

GPLv3 - http://www.gnu.org/licenses/gpl-3.0.txt
