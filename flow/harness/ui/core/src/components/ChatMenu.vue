<template>
	<!-- open and update:open, when given, pass through to the Dropdown -->
	<Dropdown :align="align" :options="options">
		<template #trigger><slot /></template>
	</Dropdown>
</template>

<script setup>
import { computed, inject } from "vue"
import Dropdown from "frappe-ui/src/components/Dropdown/Dropdown.vue"

import { chatMenuItems } from "../chatMenu.js"

// A chat's menu, for its sidebar row and the header. Rename edits the name in place where the row
// listens for it
const props = defineProps({
	sessionId: { type: String, default: null },
	title: { type: String, required: true },
	actions: { type: Array, default: () => [] },
	align: { type: String, default: "end" },
	onRename: { type: Function, default: null },
})
const flow = inject("flow")

const options = computed(() => chatMenuItems(flow, props))
</script>
