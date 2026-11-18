# Source notice

This project includes code from `@deepseek-ai/dsh-experimental-auto-review` version `0.2.1-rc.1`.

Copyright (c) 2026 DeepSeek. The MIT license applies. See LICENSE.

The unchanged source is in `vendor/auto-review-0.2.1-rc.1.js`.

SHA-256: `14b0fec944f734a888468b75ee9d7ae121383f018ce5bf76c4506393a910787f`.

The review policy and evidence rules come from that source. This project adds a separate review route, a request timeout, and safer plugin removal. The upstream source is a reference. The installed plugin does not import it.

## Reviewed host reference: DSH 0.2.2-rc.1 and 0.2.2-rc.4

Both releases ship identical built-in Auto Review entry bytes (SHA-256: `c516e8803facb9c8484f10c81037859826f1b1d0fef098d933ea23b38fd780b3`). The CI check pins their digest separately from the original source above.

- Upstream recognizes additional user transports and separates inherited child creation prompts from user instructions. This fork retains its narrower behavior: only browser-admitted user prompts qualify as human instructions; a child creation prompt can act only as a direct-parent instruction in that child. Other non-admitted text does not gain human authority.
- Upstream sends ordered, cacheable evidence messages and retains previously shown tool schemas. This fork retains separate project constraints, history and pending-action sections. It still requires the pending tool's logged identity, arguments and schema to agree and fails closed if the evidence is missing or ambiguous.
- Upstream adds localized denial text, structured reviewer failure metadata, and changed shutdown handling. This fork retains its own refusal handling, cancellation/draining on reload, and reset to the confined workspace preset, preserving an explicit `never` approval policy.

These are intentional differences, not claims of behavioral equivalence. The host integration tests run both versions through the shipped native executor; they verify approval, failure without execution, monotonic guards, and lifecycle behavior without calling a real reviewer model.
