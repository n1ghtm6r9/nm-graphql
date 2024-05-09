export function findTypeName(data) {
  if (data.name) {
    return data.name;
  }
  return data.ofType ? findTypeName(data.ofType) : null;
}
