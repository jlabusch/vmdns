.PHONY: all tidy clean install uninstall

all: package.json
	rm -fr node_modules
	npm install -d
	patch -p0 < mdns.patch
	/usr/lib/node_modules/npm/bin/node-gyp-bin/node-gyp configure
	/usr/lib/node_modules/npm/bin/node-gyp-bin/node-gyp build

tidy:
	rm -fr *.log *.conf

clean: tidy
	rm -fr node_modules build

install: vmdns vmdns.conf
	install -m 644 -o root vmdns.conf /etc/init/
	mkdir -p /usr/local/lib/vmdns
	rsync -a --exclude .git . /usr/local/lib/vmdns/
	ln -s /usr/local/lib/vmdns/vmdns /usr/local/bin/
	service vmdns start

uninstall:
	service vmdns stop || :
	rm -f /usr/local/bin/vmdns
	rm -fr /usr/local/lib/vmdns
	rm -f /etc/init/vmdns.conf

