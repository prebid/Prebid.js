### Adtelligent Id Sytem

The [Adtelligent](https://adtelligent.com) ID system is a uniq per-session user identifier for providing high quality DMP data for advertisers

#### Adtelligent Id Sytem Configuration Example
 
{% highlight javascript %}
 pbjs.setConfig({
     userSync: {
         userIds: [{
             name: 'adtelligent'
         }]
     }
 });
{% endhighlight %}

Example with a short storage for ~10 minutes and refresh in 5 minutes: 

{% highlight javascript %}
    pbjs.setConfig({
        userSync: {
            userIds: [{
                name: 'adtelligent',
                storage: {
                    type: "html5",
                    name: "adt_id",
                    expires:0.003,
                    refreshInSeconds: 60 * 5
                }
            }]
        }
    });
{% endhighlight %}
