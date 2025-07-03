import db from "../db/db.js";

export function generateCode() {
	return `${Math.floor(Math.random() * 10000)}`.padStart(4, '0');
}

export function getNightsCount(checkIn, checkOut) {
	const diffTime = checkOut - checkIn;
	const diffNights = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	return diffNights;
}

// Input validation ------------------------------------------------------

// Returns true or false
export function validateEmail(email) {
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	return emailRegex.test(email);
}

// Returns an array of errors if any
export function validatePassword(password, first, last) {
	const errors = [];
	if (password.length < 8) {
		errors.push("Password must contain at least 8 characters");
	}
	if (password.includes(first) || password.includes(last)) {
		errors.push("Password can't contain your name");
	}
	const hasDigit = /\d/;
	const hasSymbol = /[|\\/~^:.,;?!&%$@*+]/;
	if (!hasDigit.test(password) || !hasSymbol.test(password)) {
		errors.push("Password must contain a digit and a symbol");
	}
	return errors;
}