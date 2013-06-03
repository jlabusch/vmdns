.PHONY: dep clean

dep: package.json
	rm -fr node_modules
	npm install -d
	patch -p0 < mdns.patch

clean:
	rm -fr node_modules *.log

