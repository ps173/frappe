import { dialog } from "frappe-ui/src/utils/dialog"

import { afterMenu } from "./menu.js"
import { __ } from "./translate.js"

// A chat's menu: the host's own items, then Rename and Delete once there is a chat to rename.
// `title` is read as an item runs, so a dialog names the chat as it is then. Rename prompts for
// the name unless the caller edits it in place (`onRename`). Each item runs once the menu has
// handed the focus back, so a dialog or field it opens keeps it
export function chatMenuItems(flow, menu) {
	const sid = menu.sessionId
	const own = sid
		? [
				{ label: __("Rename"), icon: "lucide-pen", onClick: menu.onRename ?? (() => promptRename(flow, sid, menu.title)) },
				{ label: __("Delete"), icon: "lucide-trash-2", theme: "red", onClick: () => confirmDelete(flow, sid, menu.title) },
			]
		: []
	return [...(menu.actions ?? []), ...own].map((item) => ({
		...item,
		onClick: afterMenu((...args) => item.onClick?.(...args)),
	}))
}

function promptRename(flow, sid, title) {
	dialog.prompt({
		title: __("Rename chat"),
		size: "lg",
		fields: [{ name: "title", label: __("Name"), defaultValue: title, required: true }],
		confirmLabel: __("Rename"),
		// fire-and-forget (outcome lands as a toast): returning the promise would
		// flash the button's loading state for ~20ms and jolt the action row
		onConfirm: ({ values }) => {
			void flow.renameSession(sid, values.title.trim())
		},
	})
}

// dialog.confirm, not dialog.danger: danger's red theme injects a header
// icon; the destructive styling lives on the action button instead
function confirmDelete(flow, sid, title) {
	dialog.confirm({
		title: __("Delete chat?"),
		size: "lg",
		message: __("“{0}” and its full history will be permanently removed.", [title]),
		actions: [
			{ label: __("Cancel"), variant: "outline" },
			{
				label: __("Delete"),
				variant: "solid",
				theme: "red",
				onClick: () => {
					void flow.deleteSession(sid)
				},
			},
		],
	})
}
