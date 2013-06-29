# What teh

I have many VMs that move around between hosts and even between networks. I can't keep track of them!
(Well I can, but it's harder than it should be.)

This tool makes it easy by using multicast DNS to broadcast IP address changes for the `vm` service.

## Usage

In this version the client and server modules have been merged. Everyone runs a browser and everyone advertises their own IP address. <em>(Caveats - only one address, and it must be IPv4.)</em>

The `vms` script wraps `tool.js` and gives you a way to query the data that the server has collected.

The most interesting use cases are:

<pre>
    # List VMs
    $ vms -l
    Bob:	addr 10.1.1.10, uptime 5.88 min, loadavg 0.13 0.17 0.08
    Fred:	addr 10.1.1.7, uptime 11.05 min, loadavg 0.14 0.33 0.29

    # Open shells on all VMs
    $ cssh $(vms)

    # Connect to only the VMs named Bob and Fred
    $ cssh $(vms Bob Fred)
</pre>

## Installation

<pre>
    $ git clone git://github.com/jlabusch/vm-announce.git
    $ cd vm-announce
    $ make all 
    $ sudo make install
</pre>

Installation includes a simple upstart job supplied that'll run `vm-announce.js` on boot. <em>(TODO - modify it to stop on network-down.)</em>

## Notes

  * Only tested on Linux.
  * Address resolution depends on Avahi.
  * `node-mdns` depends on libavahi-compat-libdnssd-dev.

## License

GPLv3 - http://www.gnu.org/licenses/gpl-3.0.txt
