import { describe, it, expect, beforeEach } from 'vitest';
import { showConfirm } from '../../confirm-dialog.js';

const dialog = () => document.querySelector('[role="alertdialog"]');
const button = (text) => [...dialog().querySelectorAll('button')].find((b) => b.textContent === text);
const press = (key) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('showConfirm (shared in-app confirm dialog)', () => {
  /** @type {HTMLButtonElement} */
  let trigger;

  beforeEach(() => {
    document.body.innerHTML = '';
    trigger = document.createElement('button');
    trigger.textContent = 'Delete';
    document.body.appendChild(trigger);
    trigger.focus();
  });

  it('shows the message with Cancel and Confirm buttons', () => {
    showConfirm({ message: 'Delete day 3?' });

    expect(dialog().textContent).toContain('Delete day 3?');
    expect(button('Cancel')).toBeTruthy();
    expect(button('Confirm')).toBeTruthy();
  });

  it('resolves true on Confirm and false on Cancel, then goes away', async () => {
    const yes = showConfirm({ message: 'Sure?' });
    button('Confirm').click();
    await expect(yes).resolves.toBe(true);
    expect(dialog()).toBeNull();

    const no = showConfirm({ message: 'Sure?' });
    button('Cancel').click();
    await expect(no).resolves.toBe(false);
    expect(dialog()).toBeNull();
  });

  it('uses the given title and button labels', () => {
    showConfirm({ title: 'Delete Day', message: 'Sure?', confirmLabel: 'Delete', cancelLabel: 'Keep' });

    expect(dialog().textContent).toContain('Delete Day');
    expect(button('Delete')).toBeTruthy();
    expect(button('Keep')).toBeTruthy();
  });

  it('moves focus into the dialog on open and back to the trigger on close', async () => {
    const result = showConfirm({ message: 'Sure?' });
    expect(dialog().contains(document.activeElement)).toBe(true);

    button('Cancel').click();
    await result;
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape cancels', async () => {
    const result = showConfirm({ message: 'Sure?' });
    press('Escape');
    await expect(result).resolves.toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('Enter confirms', async () => {
    const result = showConfirm({ message: 'Sure?' });
    press('Enter');
    await expect(result).resolves.toBe(true);
  });

  it('Enter on a Tabbed-to Cancel presses Cancel', async () => {
    const result = showConfirm({ message: 'Sure?' });
    button('Cancel').focus();
    press('Enter');
    await expect(result).resolves.toBe(false);
  });

  it('keeps Tab inside the dialog', () => {
    showConfirm({ message: 'Sure?' });
    button('Confirm').focus();
    press('Tab');
    expect(document.activeElement).toBe(button('Cancel'));
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    document.activeElement.dispatchEvent(back);
    expect(document.activeElement).toBe(button('Confirm'));
  });

  it('ignores other keys', async () => {
    const result = showConfirm({ message: 'Sure?' });
    press('a');
    expect(dialog()).toBeTruthy();
    button('Cancel').click();
    await expect(result).resolves.toBe(false);
  });
});
