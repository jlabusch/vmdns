# What teh

I have many VMs that move around between hosts and even between networks. I can't keep track of them!
(Well I can, but it's harder than it should be.)

## Server

> `node ./server.js`

Starts a zeroconf server listening for providers of `vm.tcp`.

## Client

> `node ./client.js --name zazz --desc "Ubuntu 12.04.2 LTS"`

Starts a zeroconf client that registers a VM with the name `zazz`.
The Answer section of the client's mDNS broadcast will look something like

> `_vm._tcp.local: type PTR, class IN, ["10.1.1.6"]._vm._tcp.local`

The "name" returned is a JSON array of the VM's IP addresses. Only tested with IPv4 at this point.

## Data exchange

Once a server has seen a client's advertisement it will try to get additional metadata using the first IP address in its name array (10.1.1.6 above).

> `HTTP GET 10.1.1.6:9301/`

The client responds with a JSON dump of its metadata. You can query it yourself at any time:

<pre>
    $ curl -s http://10.1.1.6:9301 -o - | python -mjson.tool
    {
        "desc": "Ubuntu 12.04.2 LTS",
        "loadavg": "0.00 0.01 0.05",
        "name": "zazz",
        "uptime": "19.65 min"
    }
</pre>

The data includes

  * <b>name</b>: defaults to `$HOSTNAME`.
  * <b>desc</b>: optional description of the VM's purpose. Default's to `lsb_release --description`
  * <b>loadavg</b>: updated every minute from `/proc/loadavg`. <em>[TODO - non-Linux client support]</em>
  * <b>uptime</b>: updated every minute from `/proc/uptime`. <em>[TODO - non-Linux client support]</em>

## Tools

Server installation includes a script called `vms` that wraps `tool.js` and gives you a way to query the data that the server has collected.

<pre>
    $ vms -l
    10.1.1.6: name=zazz, desc=Ubuntu 12.04.2 LTS, loadavg=0.11 0.20 0.14, uptime=33.65 min
</pre>

The most interesting use cases are:

<pre>
    # Open shells on all VMs
    $ cssh $(vms)
    
    # Connect to the VMs named Bob and Fred
    $ cssh $(vms Bob Fred)
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

The server has an equivalent script for `server.js`.

## Notes

Depends on libavahi-compat-libdnssd-dev.

Installation is fit for <em>my</em> purposes right now, but might not be for yours: it keeps using the JS files in the source directory you installed from, which is great for development but maybe surprising for more normal installations.

## License

GPLv3 - http://www.gnu.org/licenses/gpl-3.0.txt
