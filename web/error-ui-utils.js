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

