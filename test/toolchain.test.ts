/** @vitest-environment node */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const workspace = read('pnpm-workspace.yaml');
const bitbucket = read('bitbucket-pipelines.yml');
const pkg = JSON.parse(read('package.json')) as {
  packageManager: string;
  engines: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe('toolchain', () => {
  it('drops workspace settings pnpm 11 removed', () => {
    expect(workspace).not.toMatch(/^onlyBuiltDependencies:/m);
  });

  it('enforces a strict 3-day minimum release age', () => {
    expect(workspace).toMatch(/^minimumReleaseAge: 4320$/m);
    expect(workspace).toMatch(/^minimumReleaseAgeStrict: true$/m);
  });

  it('has no release-age exclusions', () => {
    expect(workspace).not.toMatch(/^minimumReleaseAgeExclude:/m);
  });

  it('engines.pnpm accepts the packageManager major', () => {
    const major = /^pnpm@(\d+)\./.exec(pkg.packageManager)?.[1];
    expect(major).toMatch(/^\d+$/);
    expect(pkg.engines.pnpm).toBe(`>=${major}`);
  });

  it('Bitbucket activates the packageManager pnpm version', () => {
    expect(bitbucket).toContain(`corepack prepare ${pkg.packageManager} --activate`);
  });

  it('keeps the shadcn CLI out of production dependencies', () => {
    expect(pkg.dependencies.shadcn).toBeUndefined();
    expect(pkg.devDependencies.shadcn).toMatch(/^\^4\./);
  });

  it('declares vite, the required Vitest 5 peer', () => {
    expect(pkg.devDependencies.vitest).toMatch(/^\^5\./);
    expect(pkg.devDependencies.vite).toMatch(/^\^8\./);
  });

  it('engines.node matches the jsdom 30+ floor', () => {
    expect(pkg.devDependencies.jsdom).toMatch(/^\^31\./);
    expect(pkg.engines.node).toBe('^22.22.2 || ^24.15.0 || >=26.0.0');
  });

  it('declares @testing-library/dom, the required jest-dom 7 peer', () => {
    expect(pkg.devDependencies['@testing-library/jest-dom']).toMatch(/^\^7\./);
    expect(pkg.devDependencies['@testing-library/dom']).toMatch(/^\^10\./);
  });
});
