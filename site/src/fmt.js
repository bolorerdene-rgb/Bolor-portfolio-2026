export const n0 = new Intl.NumberFormat("en-US").format.bind(new Intl.NumberFormat("en-US"));

export async function loadJSON(name) {
  const res = await fetch(`./data/${name}.json`);
  if (!res.ok) throw new Error(`Could not load ${name}.json`);
  return res.json();
}
