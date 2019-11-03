New provider must include the following:

1. sub module object:
```
export const subModuleName = {
  name: String,
  getData: Function <Promise>
};
```

2. Function that returns the real time data according to the following structure:
```
{
  "adUnitCode":{
      "key":"value",
      "key2":"value"
  },
  "adUnitCode2":{
      "dataKey":"dataValue",
  }
}
``` 

3. Hook to Real Time Data module:
```
submodule('realTimeData', subModuleName);
```
