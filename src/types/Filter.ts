/**
 * A filter limits the authenticated user to a subset of business objects of a certain type.
 * Read-only; supports only the “all” read method.
 */
export interface Filter {
  /** [Read-only] Unique ID. */
  id: string;
}

export interface FilterWrapper {
  /** The element name matches the object type. */
  Filter: Filter;
}
