import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

const dom = new JSDOM("<body></body>", { url: "http://localhost/flow/s/S1" });
for (const name of ["window", "document", "location", "history", "CustomEvent"]) globalThis[name] = dom.window[name];

const { island, loadModule, transport } = await import("./helpers/components.js");
const { mount } = await loadModule("island.js");
const panel = await loadModule("panel.js");

// an element the island mounts into; it records the marks put on it
const target = () => {
	const marks = {};
	return { marks, toggleAttribute: (name, on) => (marks[name] = on) };
};
const last = () => island.mounts.at(-1);

test("in a page's panel the island loads boot before it mounts, opens the saved route on a memory history and reports each route", async () => {
	transport.answers["frappe.flow.api.boot"] = { user: "riya@example.com" };
	transport.calls.length = 0;
	const routes = [];
	const el = target();
	await mount(el, {
		props: { panel: "desk", path: "/s/S2", onNavigate: (path) => routes.push(path) },
	});
	const { options, router } = last();
	assert.equal(panel.inPanel, true);
	assert.equal(panel.panelHost, "desk");
	assert.deepEqual(transport.calls.map(([method]) => method), ["frappe.flow.api.boot"]);
	assert.equal(options.props.boot.user, "riya@example.com");
	assert.equal(options.history, null);
	assert.equal(el.marks["data-panel"], true);
	await router.isReady();
	assert.equal(router.currentRoute.value.fullPath, "/s/S2");
	await router.push("/s/S3");
	assert.deepEqual(routes.slice(-1), ["/s/S3"]);
	// the address bar is the page's
	assert.equal(location.pathname, "/flow/s/S1");
});

test("a new path moves an open panel to that route, and the same path leaves it be", async () => {
	transport.answers["frappe.flow.api.boot"] = { user: "riya@example.com" };
	const routes = [];
	const panelIsland = await mount(target(), {
		props: { panel: "app", path: "/s/S2", onNavigate: (path) => routes.push(path) },
	});
	const { router } = last();
	await router.isReady();
	panelIsland.update({ path: "/s/S4", asked: "S4" });
	await new Promise((resolve) => setTimeout(resolve));
	assert.equal(router.currentRoute.value.fullPath, "/s/S4");
	// the chat an app asked for, which the page may say it could not open
	assert.equal(panel.askedSession, "S4");
	assert.deepEqual(routes.slice(-1), ["/s/S4"]);
	const count = routes.length;
	panelIsland.update({ path: "/s/S4" });
	panelIsland.update({ title: "no path" });
	await new Promise((resolve) => setTimeout(resolve));
	assert.equal(routes.length, count);
});

test("a panel whose boot fails mounts without it, leaving App to try again and say why", async () => {
	transport.answers["frappe.flow.api.boot"] = () => {
		throw new Error("down");
	};
	await mount(target(), { props: { panel: "app" } });
	assert.equal(last().options.props.boot, null);
	assert.equal(panel.panelHost, "app");
});

test("on a page of an app the island loads boot, runs on a memory history the app moves and is told about, and marks its host", async () => {
	transport.answers["frappe.flow.api.boot"] = { user: "riya@example.com" };
	transport.calls.length = 0;
	const routes = [];
	const announced = [];
	const onAnnounce = () => announced.push(true);
	window.addEventListener("flow-embedded", onAnnounce);
	const el = target();
	const page = await mount(el, {
		props: { embedded: true, path: "/s/S2", asked: "S2", onNavigate: (path) => routes.push(path) },
	});
	window.removeEventListener("flow-embedded", onAnnounce);
	const { options, router } = last();
	assert.equal(panel.embedded, true);
	assert.equal(panel.inPanel, false);
	assert.equal(panel.ownsWindow, false);
	assert.equal(panel.askedSession, "S2");
	assert.deepEqual(transport.calls.map(([method]) => method), ["frappe.flow.api.boot"]);
	assert.equal(options.props.boot.user, "riya@example.com");
	assert.equal(options.props.embedded, true);
	assert.equal(options.history, null);
	assert.equal(el.marks["data-flow-embedded"], true);
	assert.equal(el.marks["data-panel"], false);
	assert.deepEqual(announced, [true]);
	await router.isReady();
	assert.equal(router.currentRoute.value.fullPath, "/s/S2");
	await router.push("/s/S3");
	assert.deepEqual(routes.slice(-1), ["/s/S3"]);
	page.update({ path: "/" });
	await new Promise((resolve) => setTimeout(resolve));
	assert.equal(router.currentRoute.value.fullPath, "/");
	assert.deepEqual(routes.slice(-1), ["/"]);
	assert.equal(location.pathname, "/flow/s/S1");
});

for (const props of [{ panel: "app" }, { embedded: true }]) {
	test(`hosted (${Object.keys(props)[0]}) on a saved route, the island tells the host only that route, never the "/" it starts on`, async () => {
		transport.answers["frappe.flow.api.boot"] = { user: "riya@example.com" };
		const routes = [];
		await mount(target(), { props: { ...props, path: "/s/S5", onNavigate: (path) => routes.push(path) } });
		const { router } = last();
		await router.isReady();
		await new Promise((resolve) => setTimeout(resolve));
		assert.equal(router.currentRoute.value.fullPath, "/s/S5");
		assert.deepEqual(routes, ["/s/S5"]);
	});
}

test("a bare embedded attribute, as Vue's <Island embedded> passes it, is the embedded mode", async () => {
	transport.answers["frappe.flow.api.boot"] = { user: "riya@example.com" };
	const el = target();
	await mount(el, { props: { embedded: "" } });
	assert.equal(panel.embedded, true);
	assert.equal(el.marks["data-flow-embedded"], true);
});

test("the panel wins over embedded", async () => {
	transport.answers["frappe.flow.api.boot"] = { user: "riya@example.com" };
	const el = target();
	await mount(el, { props: { panel: "app", embedded: true } });
	assert.equal(panel.inPanel, true);
	assert.equal(panel.embedded, false);
	assert.equal(last().options.props.embedded, false);
	assert.equal(el.marks["data-panel"], true);
	assert.equal(el.marks["data-flow-embedded"], false);
});

test("/flow mounts the island on the address, with the boot it rendered", async () => {
	transport.calls.length = 0;
	const el = target();
	await mount(el, { props: { boot: { user: "sam@example.com" } } });
	const { options, router } = last();
	assert.equal(panel.inPanel, false);
	assert.equal(panel.embedded, false);
	assert.equal(panel.ownsWindow, true);
	assert.deepEqual(transport.calls, []);
	assert.equal(options.props.boot.user, "sam@example.com");
	assert.equal(el.marks["data-panel"], false);
	assert.equal(el.marks["data-flow-embedded"], false);
	await router.push("/s/S9");
	assert.equal(location.pathname, "/flow/s/S9");
});
