.PHONY: dep clean install

dep: package.json
	rm -fr node_modules
	npm install -d
	patch -p0 < mdns.patch

clean:
	rm -fr node_modules *.log

install: upstart.conf
	sed 's!PLACE!'$$PWD'!' $< | sed 's/HOST/'$$HOSTNAME'/' > vm-announce.conf
	install -m 644 -o root vm-announce.conf /etc/init/
