export type MapPointLinkRefSource = {
  id: number;
  ref: string | null;
  name: string | null;
};

export function resolveMapPointLinkRef(point: MapPointLinkRefSource): string {
  const ref = point.ref?.trim();
  if (ref) {
    return ref;
  }
  const name = point.name?.trim();
  if (name) {
    return name;
  }
  return `m${point.id}`;
}
