/// A RuntimeType is a value with a distinct type, that can be used for both runtime and compile time typechecks.
/// Runtime types are as follows (along with the compile-time types RealTypeOf maps them to):
/// - null            -> null
/// - undefined       -> any
/// - Boolean         -> boolean
/// - Number          -> number
/// - String          -> string
/// - {nullable: T}   -> T | null (where T is any RuntimeType)
/// - {arrayOf: T}    -> T[] (where T is any RuntimeType)
/// - T               -> T (where T is any non-generic object constructor)
/// Note there is currently not support for generic objects except arrays. If it's needed the easiest thing to do will
/// be to patch it on an object-by-object basis
export type RuntimeType =
  null |
  undefined |
  {nullable: RuntimeType} |
  {arrayOf: RuntimeType} |
  (new (...args: any[]) => any);

type RuntimeTypeNullable<T extends RuntimeType> = {nullable: T};
type RuntimeTypeArray<T extends RuntimeType> = {arrayOf: T};
/// Gives access to the compile-time type of a RuntimeType
type NonNullableRealTypeOf<T extends RuntimeType> =
  T extends null ? null :
  T extends undefined ? any :
  T extends BooleanConstructor ? boolean :
  T extends NumberConstructor ? number :
  T extends StringConstructor ? string:
  T extends RuntimeTypeArray<infer U> ? Array<RealTypeOf<U>> :
  T extends new (...args: any[]) => infer U ? U :
  never;

export type RealTypeOf<T extends RuntimeType> =
  T extends RuntimeTypeNullable<infer U> ? (NonNullableRealTypeOf<U> | null) :
  NonNullableRealTypeOf<T>;

export type RuntimeTypeOf<T> = RuntimeType & T extends RealTypeOf<infer U> ? U : never;

/// Needed sometimes because typescript is bad
export function indirectRuntimeType<T extends RuntimeType>(rtType: T) {
  return rtType as any as RuntimeTypeOf<RealTypeOf<T>>;
}

/// Needed sometimes because typescript is bad
export function indirectRealType<T>(value: T) {
  return value as any as RealTypeOf<RuntimeTypeOf<T>>;
}

/// Returns the name of a value's type. For primitive type. For example:
/// - true  -> 'boolean'
/// - 88    -> 'number'
/// - {}    -> 'object'
/// -> [1]  -> 'array' (does not try to work out inner type)
/// for objects of classes it returns the class name.
export function typeName(value: any): string {
  if (typeof value === 'object') {
    if (value === null) {
      return 'null';
    } else if (Array.isArray(value)) {
      return 'array';
    } else if ('constructor' in value &&
      ((value as any).constructor !== Object) &&
      (typeof (value as any).constructor === 'function')
    ) {
      return ((value as any).constructor as () => void).name;
    } else {
      return 'object';
    }
  } else {
    return typeof value;
  }
}

/// Returns true if two runtime types are equal
export function runtimeTypeEquals(a: RuntimeType, b: RuntimeType): boolean {
  if (a === b) {
    return true;
  } else if (
    typeof a === 'object' &&
    typeof b === 'object' &&
    a !== null &&
    b !== null
  ) {
    if ('nullable' in a && 'nullable' in b) {
      return runtimeTypeEquals(a.nullable, b.nullable);
    } else if ('arrayOf' in a && 'arrayOf' in b) {
      return runtimeTypeEquals(a.arrayOf, b.arrayOf);
    } else {
      return false;
    }
  } else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length === 1 && b.length === 1) {
      return runtimeTypeEquals(a[0], b[0]);
    } else {
      throw Error('RuntimeType array with invalid length');
    }
  } else {
    return false;
  }
}

/// Returns the name of a runtime type. Similar to typeName() except it returns 'number[]' instead of 'array'
export function runtimeTypeName(t: RuntimeType): string {
  switch (t as any) {
    case null:
      return 'null';
    case undefined:
      return 'any';
    case Boolean:
      return 'boolean';
    case Number:
      return 'number';
    case String:
      return 'string';
    default:
      if (typeof t === 'object') {
        if ('nullable' in (t as any)) {
          return runtimeTypeName((t as any).nullable) + '?';
        } else if ('arrayOf' in (t as any)) {
          return runtimeTypeName((t as any).arrayOf) + '[]';
        }
      } else if ('name' in (t as any) && typeof (t as any).name === 'string') {
        return (t as any).name;
      }

      throw Error('invalid RuntimeType, can not get name');
  }
}

function typeErrorMessage<T extends RuntimeType>(value: unknown, t: T): string {
  if (Array.isArray(t) && Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!isType(value[i], t[0])) {
        return 'inside array: ' + typeErrorMessage(value[i], t[0]);
      }
    }
  }
  return 'expected ' + runtimeTypeName(t) + ', got ' + typeName(value);
}

export function isType<T extends RuntimeType>(value: unknown, t: T): boolean {
  switch (t as any) {
    case null:
      return value === null;
    case undefined:
      return true;
    case Boolean:
      return typeof value === 'boolean';
    case Number:
      return typeof value === 'number';
    case String:
      return typeof value === 'string';
    default:
      switch (typeof t) {
        case 'function':
          return (
            typeof value === 'object' &&
            value !== null &&
            (value as any).constructor === t
          );
        case 'object':
          if ('nullable' in t) {
            return value === null || isType(value, t.nullable);
          } else if ('arrayOf' in t) {
            if (Array.isArray(value)) {
              for (let i = 0; i < value.length; i++) {
                if (!isType(value[i], (t as any).arrayOf)) {
                  return false;
                }
              }
              return true;
            }
          }
      }
    return false;
  }
}

export function assertIsType<T, R extends RuntimeType = RuntimeTypeOf<T>>(value: unknown, t: R): asserts value is T {
  if (!isType(value, t)) {
    throw Error(typeErrorMessage(value, t));
  }
}
