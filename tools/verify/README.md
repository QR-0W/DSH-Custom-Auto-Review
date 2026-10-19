# Offline tool-runtime probe

This directory contains a pure test-definition factory used by `test/verification.test.mjs`. It is not an installable bundle and has no activation hook, provider route, credentials access or network calls.

For configuration/reload validation, use `test/gui-lifecycle.test.mjs`. Those tests run isolated temporary profiles with synthetic model adapters, never the active user profile.

The former installation-specific preflight and live probe bundles were removed in 0.3.0. They modified an author's private provider metadata and did not belong in a general-purpose distribution. Model metadata is now read from each user's own DSH provider configuration.
