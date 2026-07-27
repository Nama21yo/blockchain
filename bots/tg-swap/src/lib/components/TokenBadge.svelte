<script lang="ts">
	import type { SwapToken } from '$lib/domain/tokens';

	let { token, size = 'md' }: { token: SwapToken; size?: 'sm' | 'md' | 'lg' } = $props();
	const dimensions = { sm: 'size-7 text-[9px]', md: 'size-9 text-[10px]', lg: 'size-11 text-xs' };
</script>

<span
	class={`grid shrink-0 place-items-center rounded-full border-2 border-white font-display font-bold text-white shadow-sm ${dimensions[size]}`}
	style={`background: ${token.color}`}
	aria-hidden="true"
>
	{token.symbol === 'BONK' ? 'B!' : token.symbol.slice(0, 2)}
</span>
