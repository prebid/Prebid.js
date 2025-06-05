# Chrome AI RTD Provider

## Overview

The Chrome AI RTD Provider is a Prebid.js Real-Time Data (RTD) module that enhances bidding by automatically detecting the page language using the Chrome AI Language Detection API. This information is added to the OpenRTB bid request objects, allowing bid adapters to optimize bids based on content language.

Language detection is just one use case of Chrome AI capabilities. This module is designed with a modular architecture to support additional Chrome AI APIs as they become available. Future extensions will include support for features such as content summarization, when Chrome makes these APIs accessible.

## Features

- Automatic language detection using Chrome AI API
- Language caching in localStorage to reduce redundant API calls
- Configurable language detection confidence threshold
- Ability to enable/disable the language detection feature
- Compatible with Prebid.js RTD framework

## Integration

### Basic Integration

Add the Chrome AI RTD Provider to your Prebid.js configuration:

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      waitForIt: true  // Optional: delays the auction until language detection completes
    }]
  }
});
```

### Advanced Configuration

Configure language detection with additional options:

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      waitForIt: true,
      params: {
        languageDetector: {
          enabled: true,       // Set to false to disable language detection
          confidence: 0.9      // Set minimum confidence threshold (0.0 - 1.0)
        }
      }
    }]
  }
});
```

## Configuration Options

| Parameter | Scope | Type | Description | Default |
|-----------|-------|------|-------------|---------|
| `languageDetector.enabled` | Optional | Boolean | Enable or disable language detection | `true` |
| `languageDetector.confidence` | Optional | Number | Minimum confidence threshold for detected language | `0.8` |
| `waitForIt` | Optional | Boolean | Whether to delay auction for language detection | `false` |

## How It Works

1. When initialized, the module checks if a language is already available in:
   - The existing `ortb2.site.content.language` property
   - localStorage (from a previous detection on the same URL)

2. If no language is found, it detects the language of the visible page content using the Chrome AI Language Detection API.

3. The detected language is:
   - Stored in localStorage for future page loads
   - Added to the OpenRTB bid requests in `ortb2.site.content.language`

## Requirements

- The Chrome AI Language Detection API must be available in the browser
- Sufficient text content must be available on the page (minimum 20 characters)
- If using the `waitForIt: true` option, ensure it doesn't significantly delay your auction

## Limitations

- Only works in browsers that support the Chrome AI Language Detection API
- Requires visible text content on the page
- May not work accurately for multi-language pages

## Browser Compatibility

- Chrome: 138(Beta)+
- Firefox, Safari: Not supported (lacks Chrome AI API)

## Example Use Cases

### Standard Implementation

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      waitForIt: true
    }]
  }
});
```

### Disable Language Detection for Specific Sites

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      params: {
        languageDetector: {
          enabled: false
        }
      }
    }]
  }
});
```

### Higher Confidence Requirement

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      waitForIt: true,
      params: {
        languageDetector: {
          confidence: 0.95  // Only use high-confidence detections
        }
      }
    }]
  }
});
```

## Integration with Other Modules

The Chrome AI RTD Provider is compatible with other Prebid.js modules and can be used alongside other RTD providers:

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [
      {
        name: 'chromeAi',
        waitForIt: false
      },
      {
        name: 'anotherProvider',
        waitForIt: true,
        params: {
          // other provider config
        }
      }
    ]
  }
});
```
