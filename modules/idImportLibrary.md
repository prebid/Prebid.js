# ID Import Library

## Configuration Options

| Parameter  | Required | Type    | Default | Description |
| :--------- | :------- | :------ | :------ | :---------- |
| `target`   | Yes      | String  | N/A     | ID attribute of the element from which the email can be read. |
| `url`      | Yes      | String  | N/A     | URL endpoint used to post the hashed email and user IDs. |
| `debounce` | No       | Number  | 250     | Time in milliseconds before the email and IDs are fetched. |
| `fullscan` | No       | Boolean | false   | Enable/disable a full page body scan to get email. |
| `formElementId`   | No      | String  | N/A     | ID attribute of the input (type=text/email)  from which the email can be read. |
| `inputscan`   | No      | Boolean  | N/A     | Enable/disable a input element (type=text/email) scan to get email. |

## Example

```javascript
pbjs.setConfig({
    idImportLibrary: {
        target: 'username',
        url: 'https://example.com',
        debounce: 250,
        fullscan: false,
        inputscan: false,
        formElementId: "userid"
    },
});
