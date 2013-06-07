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
$ curl http://localhost:9300/ -o - 2&gt;/dev/null | python -mjson.tool 
{
    "10.1.1.4": {
        "name": "Fred"
    }
}
</pre>

## Installation

<pre>
git clone git://github.com/jlabusch/vm-announce.git
cd vm-announce
make dep
# Either
sudo make client-install
# Or
sudo make server-install
</pre>

On the client side there's a simple upstart job supplied that'll run `client.js` on boot.

The server has an equivalent script for `server.js` plus a shell script called `vms`
that wraps `tool.js` to provide easy access to the IP addresses of the running VMs.
Usage:
<pre>
$ vms
10.1.1.6 10.1.1.7 10.1.1.8
$ cssh $(vms)
</pre>

## Dependencies

libavahi-compat-libdnssd-dev

## License

GPLv3 - http://www.gnu.org/licenses/gpl-3.0.txt
