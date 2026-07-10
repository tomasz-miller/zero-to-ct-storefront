export const DEFAULT_STORE_NAME = 'Zero to CT storefront';
export const DEFAULT_STORE_NAME_EMPHASIS = 'CT';

export type StoreBrandConfig = {
  name: string;
  emphasis: string;
};

export type StoreNamePart = {
  text: string;
  emphasized: boolean;
};

export function getStoreBrandConfig(): StoreBrandConfig {
  return {
    name: process.env.NEXT_PUBLIC_STORE_NAME ?? DEFAULT_STORE_NAME,
    emphasis:
      process.env.NEXT_PUBLIC_STORE_NAME_EMPHASIS ?? DEFAULT_STORE_NAME_EMPHASIS,
  };
}

export function splitStoreName(
  name: string,
  emphasis: string,
): StoreNamePart[] {
  if (!emphasis || !name.includes(emphasis)) {
    return [{ text: name, emphasized: false }];
  }

  const parts: StoreNamePart[] = [];
  let remaining = name;

  while (remaining.length > 0) {
    const index = remaining.indexOf(emphasis);

    if (index === -1) {
      parts.push({ text: remaining, emphasized: false });
      break;
    }

    if (index > 0) {
      parts.push({ text: remaining.slice(0, index), emphasized: false });
    }

    parts.push({ text: emphasis, emphasized: true });
    remaining = remaining.slice(index + emphasis.length);
  }

  return parts;
}
