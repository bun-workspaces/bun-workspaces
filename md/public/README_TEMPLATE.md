<a href="https://bunworkspaces.com">
<img src="./packages/doc-website/src/pages/public/images/png/bwunster-bg-banner-wide_3000x900.png" alt="bun-workspaces" width="100%" />
</a>

# bun-workspaces

### [**See Full Documentation Here**: _https://bunworkspaces.com_](https://bunworkspaces.com)

**Big Recent Updates!**

- Version 1 is here after the initial alpha! 🍔🍔👁️🍔🍔
- You can demo the CLI [directly in the browser](https://bunworkspaces.com/web-cli)
- There's now [an official blog](https://bunworkspaces.com/blog/bun-workspaces-v1) to cover noteworthy releases and more!
<hr/>

This is a CLI and TypeScript API to enhance your monorepo development with Bun's [native workspaces](https://bun.sh/docs/install/workspaces) feature for nested JavaScript/TypeScript packages.

- Works right away, with no boilerplate required 🍔🍴
- Get metadata about your monorepo 🤖
- Orchestrate your workspaces' `package.json` scripts 📋
- Run inline [Bun Shell](https://bun.com/docs/runtime/shell) scripts in workspaces 🐚

This is a tool to help manage a Bun monorepo, offering features beyond what [Bun's --filter feature](https://bun.com/docs/pm/filter) can do. It can be used to get a variety of metadata about your project and run scripts across your workspaces with advanced control.

To get started, all you need is a repo using [Bun's workspaces feature](https://bun.sh/docs/install/workspaces) for nested JavaScript/TypeScript packages.

This package is unopinionated and works with any project structure you want. Think of this as a power suit you can snap onto native workspaces, rather than whole new monorepo framework.

Start running some [CLI commands](https://bunworkspaces.com/cli) right away in your repo, or take full advantage of the [scripting API](https://bunworkspaces.com/api) and its features.

## Quick Start

Installation:

```bash
$ # Install to use the API and/or lock your CLI version for your project
$ bun add --dev bun-workspaces
$ # Start using the CLI with or without the installation step
$ bunx bun-workspaces --help
```

Note that you need to run `bun install` in your project for `bun-workspaces` to find your project's workspaces. This is because it reads `bun.lock`. This also means that if you update your workspaces, such as changing their name, you must run `bun install` for the change to reflect.

### CLI

[Full CLI documentation here](https://bunworkspaces.com/cli)

```bash
<<CLI_QUICKSTART>>
```

### API

[Full API documentation here](https://bunworkspaces.com/api)

```typescript
<<API_QUICKSTART>>
```

_`bun-workspaces` is independent from the [Bun](https://bun.sh) project and is not affiliated with or endorsed by Anthropic. This project aims to enhance the experience of Bun for its users._

Developed By:

<a href="https://smorsic.io" target="_blank" rel="noopener noreferrer">
  <img src="./packages/doc-website/src/pages/public/images/png/smorsic-banner_light_803x300.png" alt="Smorsic Labs logo" width="280" />
</a>
