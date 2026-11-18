import { createWebHistory } from "vue-router";
import { mountVueIsland } from "@framework/ui/island";
import { frappeRequest, setConfig } from "frappe-ui";

import App from "./App.vue";
import { loadBoot } from "./boot.js";
import { setAskedSession, setEmbedded, setPanel } from "./panel.js";
import { routes } from "./router.js";
import "./index.css";

// frappe-ui's list and document resources fetch through this
setConfig("resourceFetcher", frappeRequest);

// frappe-ui's Spinner turns a custom property its CSS registers with @property, which a shadow
// root ignores; registered for the page instead, it spins. Already registered: nothing to do
try {
	CSS.registerProperty({ name: "--fui-spinner-angle", syntax: "<angle>", inherits: false, initialValue: "0deg" });
} catch {}

// props: `panel` ("desk" or "app", the page around the launcher's panel; none on /flow),
// `embedded` (on a page of a frappe-ui app; the panel wins over it), `boot` (rendered by /flow;
// the panel and an app's page ask for it), `path` (the route to open), `asked` (the chat an app
// asked for, when that is the route), and the listeners onClose, onNavigate(path), and on an app's
// page onTitle(title) and onActions(actions), which fill the app's header (ui/island 0010).
// On /flow the routes are the address after /flow; in the panel and on an app's page they run on
// a memory history: the launcher keeps the last one for the next page, an app turns it into its
// own address. A new `path` moves the chat to that route.
export async function mount(el, context) {
	const panel = context.props?.panel;
	// a bare `embedded` on Vue's <Island> comes as ""
	const embedded = !panel && [true, ""].includes(context.props?.embedded);
	const hosted = Boolean(panel) || embedded;
	setPanel(panel);
	setEmbedded(embedded);
	setAskedSession(context.props?.asked);
	// the host's skeleton shows until the mount resolves, so a hosted chat loads boot first and
	// draws at once; a failed load leaves App to try again and say why
	const boot = hosted ? await loadBoot().catch(() => null) : context.props?.boot;
	let router;
	const island = await mountVueIsland(el, {
		...context,
		props: { ...context.props, boot, embedded },
		component: App,
		routes,
		history: hosted ? null : createWebHistory("/flow"),
		configure(app) {
			if (!hosted) return;
			router = app.config.globalProperties.$router;
			router.replace(context.props.path || "/");
			// the router's first move to "/", which the replace cancels, still reaches afterEach
			router.afterEach((to, from, failure) => failure || context.props.onNavigate?.(to.fullPath));
		},
	});
	const host = island.shadow_root.host;
	host.toggleAttribute("data-panel", Boolean(panel));
	// the launcher keeps its panel out of the way of a chat on the page
	host.toggleAttribute("data-flow-embedded", embedded);
	if (embedded) window.dispatchEvent(new CustomEvent("flow-embedded"));
	if (!hosted) return island;
	const update = island.update;
	return {
		...island,
		update(next) {
			update(next);
			if (next.asked) setAskedSession(next.asked);
			if (next.path && next.path !== router.currentRoute.value.fullPath) router.replace(next.path);
		},
	};
}
