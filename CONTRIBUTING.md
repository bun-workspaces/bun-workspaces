# Contributing

Thank you for your interest in contributing to **bun-workspaces**. This document explains the current state of the project and what kinds of contributions are practical at this stage.

## Project Maturity

The project is currently in **alpha** as I continue building out its core feature set—especially around running scripts across workspaces—and expanding the documentation simultaneously. This means a lot of internal development and refactoring is happening rapidly.

While the public-facing CLI and API are kept stable as much as possible, the internals are changing frequently as the design evolves.

## Outside Contributions

Large or ambitious contributions are likely to conflict with ongoing work.

That being said, contributions are not outright discouraged. Smaller PRs that are focused or fix specific issues have the highest chance of being accepted

Examples of contributions that currently work well:

- Small bug fixes
- Documentation corrections or clarifications
- Minor improvements that don’t require major changes to the internals

PRs that have issues with the GitHub action checks will not be merged, so please ensure all checks pass before requesting a review.

More substantial proposals may be better suited for discussion via issues before any implementation.

Even though it's more tailored for AI, reading the [CLAUDE.md](./CLAUDE.md) file may be good for getting a more detailed overview of the project's development practices and features not covered in the README.

## Going Forward

This constrained contribution phase is temporary. Early in a project’s life, maintaining a single-developer flow helps establish cohesion, consistency, and uniform style while giving the freedom to experiment with the internals until the code finds the right shape.

Thanks to major improvements in testing since the first few releases, it has felt easy to guarantee a level of stability for each release despite large refactors.

My goal is to continue delivering features quickly while shaping the codebase into a more mature and maintainable form, which has been a balance.

As the project stabilizes, contribution guidelines will broaden.

## Philosophy

This package is simply for both the community and myself. My main agenda is to build a tool I want for myself as a serious project, so I'm eating my dog food, hope to serve the community well, and hope to eventually benefit from the extra eyes and hands as this grows and matures.
