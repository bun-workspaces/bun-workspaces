/** Does not change an object type, but remaps it for cleaner Intellisense only */
export type Simplify<T extends object> = {
  [K in keyof T]: T[K];
};

/** A normal `AsyncIterable` that is only intended for `for await` style iteration */
export type SimpleAsyncIterable<T> = AsyncIterable<T, void, undefined>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction<Args extends unknown[] = any[], Return = any> = (
  ...args: Args
) => Return;

export type RequiredDeep<T> = T extends object
  ? Required<{
      [K in keyof T]: RequiredDeep<T[K]>;
    }>
  : T;

export type PartialDeep<T> = T extends object
  ? Partial<{
      [K in keyof T]: PartialDeep<T[K]>;
    }>
  : T;
