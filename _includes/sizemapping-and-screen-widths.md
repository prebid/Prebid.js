{: .alert.alert-warning :}
**Size mapping and screen widths**  
There are two cases to keep in mind when it comes to size mapping:  
1. If Prebid.js can detect the screen width, but no mapping is defined, Prebid.js doesn't make a request for that ad unit at all  
2. If Prebid.js *cannot* detect the screen width, it uses the largest ad among *all* elements of the `sizes` arrays from each mapping object  

