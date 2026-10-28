import { vi, onTestFinished } from 'vitest';

/**
 * For a test that deliberately drives an error path: keeps the error and
 * warning the code is expected to log out of the run's output, for this test
 * only, so unexpected error output from any other test still stands out.
 * Returns the spies, so a test can also assert the error was logged.
 */
export function expectConsoleErrors() {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  onTestFinished(() => {
    error.mockRestore();
    warn.mockRestore();
  });
  return { error, warn };
}
