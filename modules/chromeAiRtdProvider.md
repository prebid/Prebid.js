# Chrome AI RTD Provider

## Overview

The Chrome AI RTD Provider is a Prebid.js Real-Time Data (RTD) module that enhances bidding by leveraging Chrome's built-in AI capabilities. It can automatically detect page language using the [Chrome AI Language Detection API](https://developer.chrome.com/docs/ai/language-detection) and generate page summaries or keywords using the [Chrome AI Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api). This information is added to the OpenRTB bid request objects, allowing bid adapters to optimize bids based on content language and context.

## Features

- Automatic language detection using the Chrome AI Language Detection API.
- Automatic page summarization or keyword generation using the Chrome AI Summarizer API.
- Caching of detected language and summaries/keywords in localStorage to reduce redundant API calls (configurable for summarizer).
- Configurable options for both language detection (e.g., confidence threshold) and summarization (e.g., type, format, length).
- Flexible ORTB2 path configuration for placing detected data.
- Ability to enable/disable each feature independently.
- Compatible with the Prebid.js RTD framework.

## Integration

### Build Setup

To include the Chrome AI RTD Provider in your Prebid.js build, use the following command:

```bash
gulp build --modules=rtdModule,chromeAiRtdProvider
```

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

Configure language detection and summarization with additional options:

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      waitForIt: true, // Set to true if auction should wait for both enabled features
      params: {
        languageDetector: {
          enabled: true,       // Set to false to disable language detection
          confidence: 0.9,     // Set minimum confidence threshold (0.0 - 1.0)
          ortb2Path: 'site.content.language' // Default path for language
        },
        summarizer: {
          enabled: false,      // Set to true to enable summarization/keyword generation
          type: 'headline',    // 'headline','key-points', 'tldr' or 'teaser'
          format: 'markdown', // 'plain-text' or 'markdown'
          length: 'short',     // 'short', 'medium', or 'long'
          ortb2Path: 'site.content.keywords', // Path for summary/keywords
          cacheInLocalStorage: true // Whether to cache generated summary/keywords
        }
      }
    }]
  }
});
```

## Configuration Options

| Parameter | Scope | Type | Description | Default |
|-----------|-------|------|-------------|---------|
| `waitForIt` | Optional | Boolean | Whether to delay auction for data retrieval | `false` |
| `languageDetector.enabled` | Optional | Boolean | Enable or disable language detection | `true` |
| `languageDetector.confidence` | Optional | Number | Minimum confidence threshold for detected language (0.0 - 1.0) | `0.8` |
| `languageDetector.ortb2Path` | Optional | String | Path in ORTB2 to store the detected language | `'site.content.language'` |
| `summarizer.enabled` | Optional | Boolean | Enable or disable summarization/keyword generation | `false` |
| `summarizer.type` | Optional | String | Type of summary: `'headline'`, `'key-points'`, `'tldr'`, or `'teaser'` | `'headline'` |
| `summarizer.format` | Optional | String | Format of the summary: `'plain-text'` or `'markdown'` | `'mark-down'` |
| `summarizer.length` | Optional | String | Length of the summary: `'short'`, `'medium'`, or `'long'` | `'short'` |
| `summarizer.ortb2Path` | Optional | String | Path in ORTB2 to store the generated summary/keywords | `'site.content.keywords'` |
| `summarizer.cacheInLocalStorage` | Optional | Boolean | Whether to cache the generated summary/keywords in localStorage | `true` |

## How It Works

The module initializes configured features (language detection, summarization) asynchronously.

### Language Detection (`languageDetector`)
1. **Data Prioritization**: On initialization or when `getBidRequestData` is called, the module first checks for existing language information in this order:
   - Auction-specific ORTB2 data (from `reqBidsConfigObj` passed to `getBidRequestData`).
   - Data cached in localStorage for the current page URL (from a previous detection).
2. **API Call**: If no language is found and the feature is enabled, it attempts to detect the language of the visible page content using the Chrome AI Language Detection API.
   - The API's `availability()` method is checked. If 'unavailable', detection is skipped. If 'after-download', the module may proceed if the model downloads.
3. **Data Handling**: The detected language (if it meets the confidence threshold) is:
   - Stored in localStorage for future page loads on the same URL.
   - Added to the OpenRTB bid requests at the configured `languageDetector.ortb2Path` (default: `site.content.language`).

### Summarization / Keyword Generation (`summarizer`)
1. **Data Prioritization**: Similar to language detection, it checks for existing summary/keywords:
   - Auction-specific ORTB2 data.
   - Data cached in localStorage (if `cacheInLocalStorage: true`).
2. **API Call**: If no data is found and the feature is enabled, it attempts to generate a summary/keywords from the page content using the Chrome AI Summarizer API.
   - The API's `availability()` method is checked. If 'unavailable', summarization is skipped. If 'after-download', the module may proceed.
3. **Data Handling**: The generated summary/keywords are:
   - Stored in localStorage (if `cacheInLocalStorage: true`).
   - Added to the OpenRTB bid requests at the configured `summarizer.ortb2Path` (default: `site.content.keywords`).

If `waitForIt: true` is set in the RTD config, the auction will be delayed until all enabled and available Chrome AI features complete their processing.

## Requirements

- The browser must support the Chrome AI APIs being used (Language Detection, Summarizer).
- The specific Chrome AI models (e.g., for language detection or summarization) must be 'available' or become 'available-after-download'. The module handles these states.
- Sufficient text content must be available on the page (minimum 20 characters for language detection and summarization).
- If using the `waitForIt: true` option, consider the potential impact on auction latency.

## Limitations

- Relies on browser support for Chrome AI APIs.
- Requires sufficient and meaningful visible text content on the page for accurate results.
- Language detection may not be accurate for pages with multiple languages mixed together.
- Summarization quality depends on the page content and the capabilities of the underlying Chrome AI model.

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

### Higher Confidence Requirement for Language Detection

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      waitForIt: true,
      params: {
        languageDetector: {
          enabled: true,
          confidence: 0.95  // Only use high-confidence detections
        }
      }
    }]
  }
});
```

### Enable Summarizer with Custom Settings

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      waitForIt: true,
      params: {
        languageDetector: {
          enabled: false // Example: only using summarizer
        },
        summarizer: {
          enabled: true,
          type: 'teaser',
          format: 'markdown', // In markdown format
          length: 'medium',
          ortb2Path: 'site.ext.data.summary', // Custom ORTB2 path
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
