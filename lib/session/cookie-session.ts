import 'server-only';

import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';

import { sealJson, unsealJson } from './sealed-cookie';

export type SessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
};

export type CookieSession<T> = {
  readonly name: string;
  readonly cookieOptions: SessionCookieOptions;
  read(): Promise<T | null>;
  write(value: T): Promise<boolean>;
  clear(): Promise<boolean>;
  readFrom(store: { get(name: string): { value: string } | undefined }): T | null;
  serialize(value: T): string;
};

type Envelope = { c: string; e: number; v: unknown };

export function createCookieSession<T>(options: {
  name: string;
  maxAge: number;
  parse: (value: unknown) => T | null;
}): CookieSession<T> {
  const { name, maxAge, parse } = options;
  const cookieOptions: SessionCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };

  function serialize(value: T): string {
    const envelope: Envelope = { c: name, e: Date.now() + maxAge * 1000, v: value };
    return sealJson(envelope);
  }

  function readFrom(store: { get(name: string): { value: string } | undefined }): T | null {
    const envelope = unsealJson(store.get(name)?.value);
    if (!envelope || typeof envelope !== 'object') return null;
    const { c, e, v } = envelope as Partial<Envelope>;
    if (c !== name || typeof e !== 'number' || e <= Date.now()) return null;
    return parse(v);
  }

  async function read(): Promise<T | null> {
    let store;
    try {
      store = await cookies();
    } catch (error) {
      unstable_rethrow(error);
      return null;
    }
    return readFrom(store);
  }

  async function write(value: T): Promise<boolean> {
    const sealed = serialize(value);
    try {
      (await cookies()).set(name, sealed, cookieOptions);
      return true;
    } catch (error) {
      unstable_rethrow(error);
      return false;
    }
  }

  async function clear(): Promise<boolean> {
    try {
      (await cookies()).delete(name);
      return true;
    } catch (error) {
      unstable_rethrow(error);
      return false;
    }
  }

  return { name, cookieOptions, read, write, clear, readFrom, serialize };
}
