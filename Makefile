.PHONY: image
image:
	docker build -t prebidjs .

.PHONY: ci
ci:
	docker run -it --rm -v $(shell pwd):/srv -p 80:9999 prebidjs bash
