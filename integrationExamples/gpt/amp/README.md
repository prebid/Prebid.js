##WARNING
The below documented method of deploying prebid on AMP requires remote.html
This is being deprecated on March 29th. A new method the requires Prebid Server
is being developed, see [Prebid Server](http://github.com/prebid/prebid-server).

## Old method:

This README provides steps to run amp example page.

Add following entries to your hosts file

    127.0.0.1    publisher.com
    127.0.0.1    amp.publisher.com

Command to run

    gulp serve --https

Additional documentation can be found at [Prebid AMP](http://prebid.org/dev-docs/how-prebid-on-amp-works.html)
