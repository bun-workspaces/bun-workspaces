## Development processes

The repo contains three packages:

- `packages/bun-workspaces`: the package that is published, built via rslib. Except when working on the docs, this is the assumed package to be working on.
- `packages/doc-website`: the documentation website (uses the rspress doc framework that has React and MDX support). This imports some metadata directly from the `bun-workspaces` package for consistency.
- `packages/sandbox`: a sandbox for testing the CLI and API (can largely be ignored)

Useful development commands:

- Format via prettier: `bun format`
- Run tests: `bun bw:test`
- Run test that matches a pattern: `bun bw:test myFilePattern`
- Run rslib build: `bun bw:build`
- Lint the package: `bun bw:lint`
- Lint the documentation website: `bun docs:lint`

## Coding style

TypeScript is written in a generally functional/procedural style. Patterns in general in this project should remain fairly consistent but are not dogmatic, as will be explained below.

Class-based patterns are seen but are not the default, such as the `Project` class, which encapsulates composable operations, since context of most of bw's functionality depends on the state of a given project. Classes are still abstracted away, such as how `Project`s are usually instantiated via `createFileSystemProject()`.

The `Workspace` objects are a plain JSON-serializable objects to prevent complex class structures and maintain a functional-like style that generally separates process from data within the project context. Many generic utilities on top of workspaces are written as plain functions and then incorporated into a `Project`'s implementation details.

### Packaging

Feature packaging is preferred over layer packaging. The `src/internal/` directory leans more towards layer packaging for generic utilities.

Module directories often contain an `index.ts` that simply uses `export *` for all files and subdirectories. However, `src/index.ts` defines the public-facing API, so this is where exports must be defined only explicitly.

### Naming and language features

Variable names are camelCase and longer descriptive names are preferred over abbreviations. Functions should generally use a verb. Booleans read as a question, often using `is` or `has` prefix etc. SCREAMING_SNAKE_CASE is used for top-level constants and environment variables.

Arrow functions are preferred, and a single object parameter is generally preferred over multiple parameters. Inline types are not encouraged, with a preference of a named type for object parameters and return types, so that these types can be reused and potentially exported.

Object destructuring is encouraged.

Don't use TypeScript `enum`s but prefer plain objects.

### Style example:

This example shows some common patterns used when a set of accepted values is needed. The main idea here is that the structure of this code is DRY and self-validating, since the `MyValue` type is inferred dierctly from the concrete `MY_VALUES` array, which is the one source of truth for both the type and runtime values. The `MY_BEHAVIOR_MAP` ensures each value has a handler when this type of branched logic is needed instead of using `switch`. Other modules importing from this can use the parameter and return types for `handleMyValue` as needed when composing logic.

```typescript
export const MY_VALUES = ["a", "b", "c"] as const;

export type MyValue = (typeof MY_VALUES)[number];

/** Description of the purpose of the options */
export type MyFunctionOptions = {
  /** The value to handle */
  value: MyValue;
  /** An optional flag */
  isSomething?: boolean;
};

/** Description of the purpose of the result */
export type MyFunctionResult = {
  /** Whether the operation was successful */
  success: boolean;
};

const MY_BEHAVIOR_MAP: Record<
  MyValue,
  (options: MyFunctionOptions) => MyFunctionResult
> = {
  a: ({ isSomething }) => {
    console.log("a", isSomething);
    return { success: true };
  },
  b: ({ isSomething }) => {
    console.log("b", isSomething);
    return { success: true };
  },
  c: ({ isSomething }) => {
    console.log("c", isSomething);
    return { success: true };
  },
};

/** Description of the purpose of the function */
export const handleSomething = (options: MyFunctionOptions): MyFunctionResult =>
  MY_BEHAVIOR_MAP[options.value](options);

// Example usage
const { success } = handleSomething({ value: "a", isSomething: true });
```

### Testing practices

Except when unreasonably complex to test, generally speaking, all feature additions and fixes should include tests. This means that all CLI commands and their options that can be passed should be verified.

Testing both and API feature and the CLI version of it is necessary to ensure that arguments etc. are handled correctly in both places. It may often make sense to do the most exhaustive behavior testing on the API and then ensure the CLI passes all options correctly to this API more simply, but without making too much assumption that the CLI "must be fine" just because the API does.

Sometimes important internals (like the generic `runScripts` function) are tested to ensure the core logic driving features work, even if they aren't exposed publicly, which can help with diagnosing issues and making more focused logic tests that require less boilerplate/setup.
