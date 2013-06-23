.PHONY: dep clean tidy client-install server-install client-uninstall server-uninstall

dep: package.json
	rm -fr node_modules
	npm install -d
	patch -p0 < mdns.patch
	/usr/lib/node_modules/npm/bin/node-gyp-bin/node-gyp configure
	/usr/lib/node_modules/npm/bin/node-gyp-bin/node-gyp build

tidy:
	rm -fr *.log vms vm-announce-client.conf vm-announce-server.conf

clean: tidy
	rm -fr node_modules build

vm-announce.conf: vm-announce.template
	sed 's!PLACE!'$$PWD'!' $< | sed 's/HOST/$(shell /bin/hostname)/' > $@

vms: vms.sh
	sed 's!PLACE!'$$PWD'!' $< > $@

install: vm-announce.conf vms
	install -m 644 -o root vm-announce.conf /etc/init/
	install -m 755 -o root vms /usr/local/bin

uninstall:
	rm -f /usr/local/bin/vms
	service vm-announce stop
	rm -f /etc/init/vm-announce.conf

