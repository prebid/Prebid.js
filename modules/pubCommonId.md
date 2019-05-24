## Publisher Common ID Example Configuration

When the module is included, it's automatically enabled and saves an id to both cookie and local storage with an expiration time of 1 year.  

Example of disabling publisher common id.

```
pbjs.setConfig(
	pubcid: {
		enable: false
	}
);
```

Example of setting expiration interval to 30 days.  The interval is expressed in minutes.

```
pbjs.setConfig(
	pubcid: {
		expInterval: 43200
	}
);
```

Example of using local storage only and setting expiration interval to 30 days.

```
pbjs.setConfig(
	pubcid: {
		expInterval: 43200,
		type: 'html5'
	}
);
```



