import { describe, it, expect } from 'vitest';
import { clamp, generateRandomIP, extractSubnet, randomChoice, generateSequentialIps } from '../js/utils.js';

describe('utils', () => {
  it('clamps below, within, and above bounds', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('throws when min exceeds max', () => {
    expect(() => clamp(0, 10, 0)).toThrow(/min cannot exceed max/);
  });

  it('generates IPv4 addresses outside excluded prefix', () => {
    const samples = Array.from({ length: 100 }, () => generateRandomIP());
    samples.forEach((ip) => {
      expect(ip.startsWith('172.16.0.')).toBe(false);
      const parts = ip.split('.').map((part) => Number(part));
      expect(parts).toHaveLength(4);
      parts.forEach((part) => {
        expect(Number.isInteger(part)).toBe(true);
        expect(part).toBeGreaterThanOrEqual(0);
        expect(part).toBeLessThanOrEqual(255);
      });
    });
  });

  it('extracts /24 subnet from IPv4 addresses', () => {
    expect(extractSubnet('192.168.1.42')).toBe('192.168.1');
    expect(extractSubnet('10.0.0.1')).toBe('10.0.0');
  });

  it('throws on invalid IPv4 input when extracting subnet', () => {
    expect(() => extractSubnet('not-an-ip')).toThrow();
  });

  it('picks a random choice from array or undefined on empty', () => {
    const items = ['a', 'b', 'c'];
    const choice = randomChoice(items);
    expect(items).toContain(choice);
    expect(randomChoice([])).toBeUndefined();
    expect(randomChoice(undefined)).toBeUndefined();
  });

  it('generates sequential IPs from prefix', () => {
    expect(generateSequentialIps('172.16.0', 3)).toEqual(['172.16.0.1', '172.16.0.2', '172.16.0.3']);
    expect(generateSequentialIps('10.1.2', 2, 5)).toEqual(['10.1.2.5', '10.1.2.6']);
  });
});
