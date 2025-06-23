import express from "express";
import fs from "fs";

import { storagePath } from "../constants.js";
import db from "../db/db.js";

const router = express.Router();

const userFields = ["email", "password"];
const userDetailsFields = ["first_name", "last_name", "img_url", "country_code", "language", "currency", "experiences_ids"];

// GET /user/config
router.get("/config", async (req, res) => {
	try {
		const result = await db.query("SELECT * FROM user_details WHERE user_id = $1", [
			req.user.id
		]);
		if (result.rows.length > 0) {
			const userDetails = result.rows[0];
			return res.json({
				first_name: userDetails.first_name,
				last_name: userDetails.last_name,
				img_url: userDetails.img_url,
				language: userDetails.language,
				currency: userDetails.currency,
				experiences_ids: userDetails.experiences_ids
			});
		} else {
			return res.status(404).send("User not found");
		}
	} catch (err) {
		console.log(err);
	}
});

function filterBookings(bookings) {
	const results = {
		current: [],
		upcoming: [],
		completed: [],
		cancelled: []
	};

	if (bookings.length > 0) {
		const today = new Date();

		// TODO: Do not hard code booking status enum value.
		results.current = bookings.filter(b =>
			b.booking_status_id !== 3 &&
			today >= new Date(b.check_in) &&
			today <= new Date(b.check_out)
		);
		// TODO: order asc by check_in, in order
		results.upcoming = bookings.filter(b => b.booking_status_id !== 3 && today < new Date(b.check_in));
		// TODO: order desc by check_out, most recent first
		results.completed = bookings.filter(b => b.booking_status_id !== 3 && today > new Date(b.check_out));
		results.cancelled = bookings.filter(b => b.booking_status_id === 3);
	}

	return results;
}

// GET /user/bookings
router.get("/booking/all", async (req, res) => {
	try {
		// Get bookings where user email matches
		const query = `SELECT b.id AS booking_id, b.property_id, b.check_in, b.check_out, b.booking_status_id, b.pin_code, p.title, p.city, p.country, pd.images_url_array
			FROM bookings AS b
			JOIN properties AS p
			ON b.property_id=p.id
			JOIN property_details AS pd
			ON b.property_id=pd.property_id
			WHERE b.email=$1;`
		const result = await db.query(query, [req.user.email]);

		const response = filterBookings(result.rows);
		res.json(response);
	} catch (err) {
		console.log(err);
	}
});

// GET /user/wishlist/property-id/1
router.get("/wishlist/property-id/:id", async (req, res) => {
	try {
		const propertyId = req.params.id;
		const userId = req.user.id;
		const result = await db.query("SELECT * FROM wishlist WHERE user_id=$1 AND property_id=$2", [
			userId, propertyId
		]);
		if (result.rows.length > 0) {
			return res.json({ is_wishlisted: true });
		}
		return res.json({ is_wishlisted: false });
	} catch (err) {
		console.log(err);
	}
});

// POST /user/wishlist/property-id/1
router.post("/wishlist/toggle/property-id/:id", async (req, res) => {
	try {
		const propertyId = req.params.id;
		const userId = req.user.id;
		const result = await db.query("SELECT * FROM wishlist WHERE user_id=$1 AND property_id=$2", [
			userId, propertyId
		]);
		if (result.rows.length > 0) {
			await db.query("DELETE FROM wishlist WHERE user_id=$1 AND property_id=$2", [
				userId, propertyId
			]);
			return res.json({ is_wishlisted: false });
		} else {
			const result = await db.query("INSERT INTO wishlist (user_id, property_id) VALUES ($1, $2) RETURNING *", [
				userId, propertyId
			]);
			return res.json({ is_wishlisted: true });
		}
	} catch (err) {
		console.log(err);
	}
});

// GET /user/wishlist/all
router.get("/wishlist/all", async (req, res) => {
	try {
		const userId = req.user.id;
		const query = `SELECT p.id, p.title, p.geo, p.city, p.country, pd.rating, pd.images_url_array, pd.price_per_night_eur AS price
			FROM properties AS p
			JOIN property_details AS pd
			ON p.id = pd.property_id
			JOIN wishlist AS w
			ON p.id = w.property_id
			WHERE w.user_id=$1 AND p.is_listed = TRUE;`;
		const result = await db.query(query, [
			userId
		]);
		return res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

async function updateUserField(id, field, value) {
	try {
		if (userFields.includes(field)) {
			const result = await db.query(`UPDATE users SET ${field} = $1 WHERE id = $2`, [
				value, id
			]);
		} else if (userDetailsFields.includes(field)) {
			const result = await db.query(`UPDATE user_details SET ${field} = $1 WHERE user_id = $2`, [
				value, id
			]);
		}
	} catch (err) {
		console.log(err);
	}
}

// PATCH /user
router.patch("/", async (req, res) => {
	const id = req.user.id;
	const { email, password, first_name, last_name, img_url, country_code, language, currency, experiences_ids } = req.body;
	if (email !== undefined) {
		await updateUserField(id, "email", email);
	}
	if (password !== undefined) {
		await updateUserField(id, "password", password);
	}
	if (first_name !== undefined) {
		await updateUserField(id, "first_name", first_name);
	}
	if (last_name !== undefined) {
		await updateUserField(id, "last_name", last_name);
	}
	if (img_url !== undefined) {
		// Delete previously stored image
		const result = await db.query("SELECT img_url FROM user_details WHERE user_id=$1", [id]);
		if (result.rows.length > 0 && result.rows[0].img_url) {
			const path = storagePath + result.rows[0].img_url;
			fs.unlinkSync(path);
		};

		await updateUserField(id, "img_url", img_url);
	}
	if (language !== undefined) {
		await updateUserField(id, "language", language);
	}
	if (currency !== undefined) {
		await updateUserField(id, "currency", currency);
	}
	if (experiences_ids !== undefined) {
		await updateUserField(id, "experiences_ids", experiences_ids);
	}
	res.status(200).send("OK");
});

// DELETE /user
router.delete("/", (req, res) => {
	console.log("Delete user with id ", req.user.id);
});

// GET /user/authorize/booking
router.get("/authorize/booking", async (req, res) => {
	const bookingId = req.query.id;
	if (!bookingId) {
		res.status(404).message("Missing booking number");
	}

	try {
		const result = await db.query("SELECT email FROM bookings WHERE id=$1", [bookingId]);
		if (result.rows.length > 0 && result.rows[0].email === req.user.email) {
			return res.json({ authorized: true });
		}
		return res.json({ authorized: false });
	} catch (err) {
		console.log(err);
	}
});

export default router;