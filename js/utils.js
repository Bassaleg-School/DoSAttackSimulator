export function clamp(value, min, max) {
  if (min > max) {
    throw new Error('min cannot exceed max');
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function randomOctet() {
  return Math.floor(Math.random() * 256);
}

export function generateRandomIP(excludedPrefix = '172.16.0') {
  let ip = '';
  do {
    const o1 = randomOctet();
    const o2 = randomOctet();
    const o3 = randomOctet();
    const o4 = randomOctet();
    ip = `${o1}.${o2}.${o3}.${o4}`;
  } while (ip.startsWith(`${excludedPrefix}.`));
  return ip;
}

export function extractSubnet(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    throw new Error('Invalid IPv4 address');
  }
  return parts.slice(0, 3).join('.');
}

export function randomChoice(items) {
  if (!items || items.length === 0) return undefined;
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

export function generateSequentialIps(prefix, count, start = 1) {
  const ips = [];
  for (let i = 0; i < count; i += 1) {
    ips.push(`${prefix}.${start + i}`);
  }
  return ips;
}
