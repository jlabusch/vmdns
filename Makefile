.PHONY: dep clean install

dep: package.json
	rm -fr node_modules
	npm install -d
	patch -p0 < mdns.patch

clean:
	rm -fr node_modules *.log vms vm-announce.conf

vm-announce.conf: upstart.conf
	sed 's!PLACE!'$$PWD'!' $< | sed 's/HOST/$(shell /bin/hostname)/' > $@

vms: vms.sh
	sed 's!PLACE!'$$PWD'!' $< > $@

client-install: vm-announce.conf
	install -m 644 -o root vm-announce.conf /etc/init/

server-install: vms
	install -m 755 -o root vms /usr/local/bin

client-uninstall:
	service vm-announce stop
	rm -f /etc/init/vm-announce.conf

server-uninstall:
	rm -f /usr/local/bin/vms

