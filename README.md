# vmdns

> Dynamic DNS for fluid local area networks.

## Use cases

List `vmdns` peers
<pre>
    $ vmdns -l
    hector:	addr 10.1.1.7, uptime 1.33 days, loadavg 0.03 0.04 0.05
    stonk:	addr 10.1.1.10, uptime 1.33 days, loadavg 0.01 0.06 0.11
</pre>

Open shells on all peers
<pre>
    $ cssh $(vmdns)
</pre>

`vmdns` keeps `/etc/hosts` up to date, so you can access a peer
using `<hostname>` or `<hostname>.local`
<pre>
    $ grep hector /etc/hosts
    10.1.1.7	hector.local hector # Added by vmdns
    $ ssh hector
</pre>

## How it works

### The service

`/etc/init/vmdns.conf` runs `vmdns --server` on boot.

The server advertises the local host as a vmdns peer as well as using mDNS to
browse for other peers.

Peers it discovers are added to `/etc/hosts` and periodically queried for uptime/load information. (`GET http://<peer>:9300/stats`)

### The utility

Running `vmdns` by hand will query a vmdns server, listing its peers in short or long form.

<pre>
    $ vmdns -h
    Query:  vmdns [--list] [--connect-to <host[:port]>] [vm-names...]
</pre>

## Installation

<pre>
    $ git clone git://github.com/jlabusch/vmdns.git
    $ cd vmdns
    $ make all 
    $ sudo make install
</pre>

## Notes

  * Only tested on Linux.
  * Address resolution depends on Avahi.
  * `node-mdns` depends on libavahi-compat-libdnssd-dev.

## License

GPLv3 - http://www.gnu.org/licenses/gpl-3.0.txt
