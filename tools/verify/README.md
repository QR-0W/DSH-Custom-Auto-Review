# Local installed-gate probe

This is a source-checkout-only developer helper, not part of the root runtime package and not a standalone package distribution. Its parent-relative preflight dependency and local report directory require the original complete checkout. Do not install an npm-packed copy.

The patch and regression test both use `index.js`; there is no alternate copied implementation.

Activation can make real requests to the configured review model and creates temporary test sessions. It must be separately authorized. It is not run by `npm test` or the single-bundle migration tests. Existing tests import only the pure probe definition.

For offline save/reload validation, use the real Loader fixture in `test/gui-lifecycle.test.mjs` instead. It uses temporary profiles and synthetic model responses, not the active user profile.
