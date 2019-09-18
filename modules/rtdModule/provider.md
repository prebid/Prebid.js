New provider must include the following:

1. sub module object:
```
export const subModuleName = {
  name: String,
  getData: Function <Promise>
};
```

2. Promise that returns the real time data according to this structure:
```
{
  "slotPlacementId":{
      "key":"value",
      "key2":"value"
  },
  "slotBPlacementId":{
      "dataKey":"dataValue",
  }
}
``` 

3. Hook to Real Time Data module:
```
submodule('realTimeData', subModuleName);
```
