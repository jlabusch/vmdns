# What teh

I have many VMs that move around between hosts and even between networks. I can't keep track of them!
(Well I can, but it's harder than it should be.)

This tool makes it easy by using multicast DNS to broadcast IP address changes for the `vm` service.

## Usage

TODO.

The most interesting use cases are:

<pre>
    # List VMs
    $ vmdns -l
    Bob:	addr 10.1.1.10, uptime 5.88 min, loadavg 0.13 0.17 0.08
    Fred:	addr 10.1.1.7, uptime 11.05 min, loadavg 0.14 0.33 0.29

    # Open shells on all VMs
    $ cssh $(vmdns)

    # Connect to only the VMs named Bob and Fred
    $ cssh $(vmdns Bob Fred)
</pre>

## Installation

<pre>
    $ git clone git://github.com/jlabusch/vm-announce.git
    $ cd vmdns
    $ make all 
    $ sudo make install
</pre>

Installation includes a simple upstart job supplied that'll run `vmdns --server` on boot.

## Notes

  * Only tested on Linux.
  * Address resolution depends on Avahi.
  * `node-mdns` depends on libavahi-compat-libdnssd-dev.

## License

GPLv3 - http://www.gnu.org/licenses/gpl-3.0.txt
