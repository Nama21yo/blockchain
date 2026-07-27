export function decodeBase64(value: string): Uint8Array {
	const binary = atob(value);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function encodeBase64(value: Uint8Array): string {
	let binary = '';
	for (let offset = 0; offset < value.length; offset += 0x8000) {
		binary += String.fromCharCode(...value.subarray(offset, offset + 0x8000));
	}
	return btoa(binary);
}
