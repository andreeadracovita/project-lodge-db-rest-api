export function generateCode() {
	return `${Math.floor(Math.random() * 10000)}`.padStart(4, '0');
}