export class BunWorkspacesError extends Error {
  name = "BunWorkspacesError";
}

export type DefinedErrors<ErrorName extends string> = {
  [name in ErrorName]: typeof BunWorkspacesError;
};

export function defineErrors<ErrorName extends string>(
  parentError: typeof BunWorkspacesError,
  ...errorNames: ErrorName[]
): DefinedErrors<ErrorName>;
export function defineErrors<ErrorName extends string>(
  ...errorNames: ErrorName[]
): DefinedErrors<ErrorName>;
export function defineErrors<ErrorName extends string>(
  ...[parentError, ...errorNames]: [
    typeof BunWorkspacesError | ErrorName,
    ...ErrorName[],
  ]
): DefinedErrors<ErrorName> {
  let Parent = BunWorkspacesError;
  if (typeof parentError === "function") {
    Parent = parentError;
  } else {
    errorNames.unshift(parentError);
  }
  return errorNames.reduce((acc, error) => {
    acc[error] = class extends Parent {
      constructor(message?: string) {
        super(message);
        this.name = error;
      }
      name = error;
    };

    Object.defineProperty(acc[error].prototype.constructor, "name", {
      value: error,
    });

    Object.defineProperty(acc[error].constructor, "name", {
      value: error,
    });

    Object.defineProperty(acc[error].prototype, "name", {
      value: error,
    });

    Object.defineProperty(acc[error], "name", {
      value: error,
    });

    return acc;
  }, {} as DefinedErrors<ErrorName>);
}
