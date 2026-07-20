import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { mockReplace } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import { ReorderNotice } from './reorder-notice';

describe('ReorderNotice', () => {
  it('renders nothing when nothing was skipped', () => {
    const { container } = render(<ReorderNotice added={2} skipped={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows skipped counts and dismisses via replace', async () => {
    const user = userEvent.setup();
    render(<ReorderNotice added={2} skipped={1} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Added 2 items from your order',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 item was unavailable and skipped',
    );

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(mockReplace).toHaveBeenCalledWith('/cart');
  });
});
