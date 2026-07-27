<script lang="ts">
	let { size = 44 }: { size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 48 48"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	aria-hidden="true"
>
	<rect width="48" height="48" rx="15" fill="#229ED9" />
	<path d="M11.5 24.2 37 13.9c1.5-.6 2.8.5 2.3 2.6l-4.4 20.6c-.3 1.5-1.3 1.9-2.6 1.2l-6.7-4.9-3.2 3.1c-.4.4-.7.7-1.4.7l.5-6.9 12.6-11.4c.5-.5-.1-.8-.8-.3L17.7 28.4 11 26.3c-1.5-.5-1.5-1.5.5-2.1Z" fill="white" />
	<circle cx="35" cy="13" r="5" fill="#FFD166" stroke="#11233C" stroke-width="2" />
	<path d="M33 12.5c.7-1 1.3-1.4 2-1.4s1.4.4 2 1.4M33.5 14.2c1 .7 2 .7 3 0" stroke="#11233C" stroke-width="1.2" stroke-linecap="round" />
</svg>
