import db from "../db/db.js";

export function generateCode() {
	return `${Math.floor(Math.random() * 10000)}`.padStart(4, '0');
}

export function getNightsCount(checkIn, checkOut) {
	const diffTime = checkOut - checkIn;
	const diffNights = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	return diffNights;
}