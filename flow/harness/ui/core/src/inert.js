// Whether a host hides `el` (inert), through the shadow roots it sits in: a chat mounted as an
// island in a page's panel is inside a shadow root, so closest() stops short of the host's mark
export function isInert(el) {
	for (let node = el; node; node = node.parentElement ?? node.getRootNode?.().host) {
		if (node.inert) return true
	}
	return false
}

// Whether an event belongs to the page around the chat: an island in a page's panel (its host
// marked data-panel) or on an app's page (data-flow-embedded) shares the page's window, where it
// hears keys and touches meant for the page. Anything from outside the island's shadow root is
// the page's
export function isPageEvent(event, el) {
	const host = el?.getRootNode?.().host
	const hosted = host?.hasAttribute?.("data-panel") || host?.hasAttribute?.("data-flow-embedded")
	return Boolean(hosted) && !event.composedPath().includes(host)
}
