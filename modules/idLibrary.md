## ID Library Configuration Example 


|Param            |Required                         |Description                         |
|----------------|-------------------------------|-----------------------------|
|url |Yes           | The url endpoint is used to post the hashed email and user ids.           |
|target          |No            |It should contain the element id from which the email can be read.      |
|debounce          |No            | Time in milliseconds before the email and ids are fetched           |
|fullscan          |No            | Option to enable/disable full body scan to get email. By default the full body scan is enabled.           |

### Example
```
 pbjs.setConfig({
                idLibrary:{
                    url: <url>,
                    debounce: 250,
                    target: 'username',
                    fullscan: false
               },
            });
```    


```   
