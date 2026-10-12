/**
 * Shape of server data after JSON serialisation: Dates become ISO strings.
 * Lets client components reuse server query types without lying about Dates.
 */
export type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<Serialized<U>>
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
