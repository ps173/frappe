// In the launcher's panel, the app around it keeps the keyboard's shortcuts. The island's
// entry sets these before the chat mounts: the page around the panel is Desk ("desk") or a
// frappe-ui app ("app"); the /flow page has none
export let inPanel = false;
export let panelHost = null;
// on a page of a frappe-ui app, which keeps the address, the theme, the tab's title and its keys
export let embedded = false;
// only the /flow page has the window to itself
export let ownsWindow = true;
// the chat an app asked the panel for (window.flow.open), which says why when it can't open; the
// chat the panel reopens by itself does not
export let askedSession = null;

export function setPanel(host) {
	inPanel = Boolean(host);
	panelHost = host || null;
	ownsWindow = !inPanel && !embedded;
}

export function setEmbedded(on) {
	embedded = Boolean(on);
	ownsWindow = !inPanel && !embedded;
}

export function setAskedSession(session) {
	askedSession = session || null;
}
