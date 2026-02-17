export function createSingleResolver<T>(
  onResolve: (value: T | null) => void
): (value: T | null) => boolean {
  let resolved = false;

  return (value: T | null) => {
    if (resolved) {
      return false;
    }

    resolved = true;
    onResolve(value);
    return true;
  };
}
