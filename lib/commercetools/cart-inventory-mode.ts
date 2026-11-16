export type CartInventoryMode = 'None' | 'TrackOnly' | 'ReserveOnOrder';

const CART_INVENTORY_MODES: readonly CartInventoryMode[] = ['None', 'TrackOnly', 'ReserveOnOrder'];

export function parseCartInventoryMode(value: string | undefined): CartInventoryMode {
  if (value === undefined || value === '') {
    return 'ReserveOnOrder';
  }

  const mode = CART_INVENTORY_MODES.find((candidate) => candidate === value);
  if (!mode) {
    throw new Error(`Invalid CTP_CART_INVENTORY_MODE: ${value}`);
  }
  return mode;
}
