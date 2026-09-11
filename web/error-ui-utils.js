/**
 * Error UI Utility Functions
 * Provides consistent error state UI patterns across the application
 */

/**
 * Show an error state UI with a "Try Again" button
 * @param {Object} options - Configuration options
 * @param {HTMLElement|string} options.container - The container element or its ID to show the error in
 * @param {HTMLElement|string} [options.loadingState] - Optional loading state element or its ID to hide
 * @param {string} [options.title="Unable to load"] - The error title
 * @param {string} [options.message="There was a problem connecting to the server."] - The error message
 * @param {boolean} [options.withPadding=false] - Whether to add padding to the error container
 */
export function showErrorState({ container, loadingState, title = "Unable to load", message = "There was a problem connecting to the server.", withPadding = false }) {
	// Get container element
	const containerEl = typeof container === 'string' ? document.getElementById(container) : container;
	if (!containerEl) {
		console.warn('Error container element not found');
		return;
	}

	// Hide loading state if provided
	if (loadingState) {
		const loadingEl = typeof loadingState === 'string' ? document.getElementById(loadingState) : loadingState;
		if (loadingEl) {
			loadingEl.style.display = 'none';
		}
	}

	// Build error HTML
	const paddingStyle = withPadding ? 'padding: 2rem;' : '';
	const errorHtml = `
		<div style="text-align: center; color: #e53e3e; ${paddingStyle}">
			<h3>${title}</h3>
			<p style="color: #a0aec0; margin-bottom: 1rem;">${message}</p>
			<button onclick="location.reload()" style="width: auto; padding: 0.5rem 1rem;">
				Try Again
			</button>
		</div>
	`;

	containerEl.innerHTML = errorHtml;
}

const SLOW_CONNECTION_MESSAGE = "Still connecting — check your Wi-Fi.";

/**
 * Swap a loading state's caption (an element with class "loading-text",
 * either the root itself or a descendant) to a Wi-Fi-specific message. Used
 * as the onSlow callback for withConnectionTimeout.
 * @param {HTMLElement|string} root - The loading-state element (or its ID) whose caption should change
 */
export function showSlowConnectionMessage(root) {
	const rootEl = typeof root === 'string' ? document.getElementById(root) : root;
	if (!rootEl) return;
	const textEl = rootEl.classList?.contains('loading-text') ? rootEl : rootEl.querySelector('.loading-text');
	if (textEl) {
		textEl.textContent = SLOW_CONNECTION_MESSAGE;
	}
}

/**
 * Watch a load in progress and escalate the UI if it's taking unusually
 * long, without altering the load's own result - callers still await/catch
 * the returned promise exactly as they would the original. Firebase's get()
 * has no built-in timeout, so on a hung connection (e.g. a device still
 * negotiating Wi-Fi) the promise would otherwise just stay pending forever
 * with no feedback and no rejection to catch.
 * @param {Promise} taskPromise - The in-flight load to watch
 * @param {Object} [options]
 * @param {() => void} [options.onSlow] - Called if taskPromise hasn't settled after slowMs
 * @param {() => void} [options.onTimeout] - Called if taskPromise hasn't settled after timeoutMs (e.g. show an error state with a Try Again button); if taskPromise later settles successfully anyway, the caller's own .then/await naturally overwrites whatever onTimeout rendered
 * @param {number} [options.slowMs=6000]
 * @param {number} [options.timeoutMs=15000]
 * @returns {Promise} The same taskPromise, unmodified
 */
export function withConnectionTimeout(taskPromise, { onSlow, onTimeout, slowMs = 6000, timeoutMs = 15000 } = {}) {
	let settled = false;

	const slowTimer = setTimeout(() => {
		if (!settled) onSlow?.();
	}, slowMs);

	const timeoutTimer = setTimeout(() => {
		if (!settled) onTimeout?.();
	}, timeoutMs);

	// Attaching a rejection handler here (even a no-op one) is what makes a
	// rejected taskPromise "handled" - without it, a caller that awaits the
	// returned promise later (rather than immediately) can still trigger a
	// spurious unhandled-rejection warning in the meantime. Using .finally()
	// instead would reintroduce that problem: it returns a new derived
	// promise that re-rejects and is never awaited by anyone.
	taskPromise.then(
		() => { settled = true; clearTimeout(slowTimer); clearTimeout(timeoutTimer); },
		() => { settled = true; clearTimeout(slowTimer); clearTimeout(timeoutTimer); }
	);

	return taskPromise;
}

