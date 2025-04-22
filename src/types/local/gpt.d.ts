// include GPT type definitions, but only locally, so that we don't pollute
// the global namespace for pubs that are not using it.
// Using these types from our public API works as intended if the consumer
// also includes the GPT typedefs, otherwise the ts compiler appears to swap in "any".

// eslint-disable-next-line prebid/validate-imports
import 'google-publisher-tag';
