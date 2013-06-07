.PHONY: dep clean install

dep: package.json
	rm -fr node_modules
	npm install -d
	patch -p0 < mdns.patch

clean:
	rm -fr node_modules *.log vms vm-announce.conf

vm-announce-client.conf: client.conf
	sed 's!PLACE!'$$PWD'!' $< | sed 's/HOST/$(shell /bin/hostname)/' > $@

vm-announce-server.conf: server.conf
	sed 's!PLACE!'$$PWD'!' $< | sed 's/HOST/$(shell /bin/hostname)/' > $@

vms: vms.sh
	sed 's!PLACE!'$$PWD'!' $< > $@

client-install: vm-announce-client.conf
	install -m 644 -o root $< /etc/init/

server-install: vms vm-announce-server.conf
	install -m 755 -o root vms /usr/local/bin
	install -m 644 -o root vm-announce-server.conf /etc/init/

client-uninstall:
	service vm-announce-client stop
	rm -f /etc/init/vm-announce-client.conf

server-uninstall:
	rm -f /usr/local/bin/vms
	service vm-announce-server stop
	rm -f /etc/init/vm-announce-server.conf

