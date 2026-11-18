import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { JSDOM } from "jsdom";

const dom = new JSDOM("<body></body>", { url: "http://localhost/crm/chat" });
const globals = ["window", "document", "location", "localStorage", "MutationObserver", "CustomEvent"];
for (const name of globals) globalThis[name] = dom.window[name];
globalThis.innerWidth = 1440;
globalThis.innerHeight = 900;
Object.defineProperty(document, "currentScript", { value: { dataset: {} } });

// the host loop: each mount is recorded, and resolves at once
const host = `
	export const mounts = [];
	export function mountIsland(name, el, options) {
		const handle = { name, el, options, unmounted: false, update() {}, unmount() { handle.unmounted = true } };
		handle.ready = Promise.resolve(handle);
		mounts.push(handle);
		return handle;
	}
`;
const dataURL = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const hostURL = dataURL(host);
const { mounts } = await import(hostURL);
const source = await readFile(
	new URL("../../../frappe/public/js/flow_launcher.bundle.js", import.meta.url),
	"utf8"
);

// the panel was left open on the page before
localStorage.setItem("flow_launcher", JSON.stringify({ open: true }));
await import(dataURL(source.replace('"@framework/ui/island/host"', JSON.stringify(hostURL))));

const panel = () => document.querySelector("flow-launcher").shadowRoot.querySelector(".panel");
const saved = () => JSON.parse(localStorage.getItem("flow_launcher"));
const pressToggle = () =>
	document.body.dispatchEvent(
		new dom.window.KeyboardEvent("keydown", { key: "i", metaKey: true, bubbles: true, composed: true })
	);

// an app's page with Flow's chat on it, as the island marks it
function embeddedChat() {
	const el = document.createElement("div");
	el.toggleAttribute("data-flow-embedded", true);
	const box = document.createElement("textarea");
	el.attachShadow({ mode: "open" }).append(box);
	document.body.append(el);
	window.dispatchEvent(new CustomEvent("flow-embedded"));
	return { el, box };
}

test("a chat on an app's page puts the open panel away, its island unmounted", async () => {
	assert.equal(mounts.length, 1);
	assert.equal(panel().inert, false);
	const { el } = embeddedChat();
	assert.equal(panel().inert, true);
	assert.equal(mounts[0].unmounted, true);
	assert.equal(saved().open, false);

	// Cmd/Ctrl+I and the app's toggles go to the chat on the page, and the panel stays away
	pressToggle();
	assert.equal(el.shadowRoot.activeElement, el.shadowRoot.querySelector("textarea"));
	el.shadowRoot.activeElement.blur();
	const toggle = document.body.appendChild(document.createElement("button"));
	toggle.setAttribute("data-flow-toggle", "");
	toggle.click();
	toggle.remove();
	assert.equal(el.shadowRoot.activeElement, el.shadowRoot.querySelector("textarea"));
	assert.equal(mounts.length, 1);
	assert.equal(panel().inert, true);

	// the app moves on to another page: the panel opens again, on a new island
	el.remove();
	pressToggle();
	assert.equal(mounts.length, 2);
	assert.equal(mounts[1].options.props.panel, "app");
	assert.equal(panel().inert, false);
	await mounts[1].ready;
});
