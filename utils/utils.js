import fs from "fs";

import db from "../db/db.js";
import { storagePath } from "../constants.js";

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

export function deletePhotos(fileNameArray) {
	if (fileNameArray) {
		for (let fileName of fileNameArray) {
			const path = storagePath + fileName;
			if (fs.existsSync(path)) {
				fs.unlinkSync(path);
			}
		}
	}
}

// To be used by admin and host. To be called in try-catch block.
// Deletes properties, property details, reviews
export async function deleteProperty(propId) {
	if (!propId) {
		return;
	}

	// Delete reviews: dependencies booking_id, property_id
	await db.query("DELETE FROM reviews WHERE property_id=$1", [propId]);

	// Delete from wishlists: dependency property_id
	await db.query("DELETE FROM wishlist WHERE property_id=$1", [propId]);

	// Delete all bookings: dependency property_id
	await db.query("DELETE FROM bookings WHERE property_id=$1", [propId]);

	// Delete images from property details
	const imagesResult = await db.query(
		"SELECT images_url_array FROM property_details WHERE property_id=$1",
		[propId]
	);
	if (imagesResult.rows.length > 0) {
		deletePhotos(imagesResult.rows[0].images_url_array);
	}

	// Delete from property details: dependency property_id
	await db.query("DELETE FROM property_details WHERE property_id=$1", [propId]);

	// Delete property
	await db.query("DELETE FROM properties WHERE id=$1", [propId]);
}