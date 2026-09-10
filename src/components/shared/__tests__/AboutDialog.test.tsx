// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutDialog } from '../AboutDialog';

describe('AboutDialog', () => {
  it('exposes itself as a modal dialog named by its heading', () => {
    render(<AboutDialog onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('STRUXURE');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<AboutDialog onClose={onClose} />);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the Close button is pressed', async () => {
    const onClose = vi.fn();
    render(<AboutDialog onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(<AboutDialog onClose={onClose} />);

    // The catcher is hidden from assistive tech on purpose, so it is reached
    // through the DOM rather than by role.
    const backdrop = container.querySelector('button[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalled();
  });

  it('shows the running version', () => {
    render(<AboutDialog onClose={() => {}} />);
    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument();
  });

  it('stops listening for Escape once unmounted', async () => {
    const onClose = vi.fn();
    const { unmount } = render(<AboutDialog onClose={onClose} />);
    unmount();

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });
});
