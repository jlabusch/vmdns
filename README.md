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

## Dependencies

libavahi-compat-libdnssd-dev
