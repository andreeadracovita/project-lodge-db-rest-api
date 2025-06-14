import express from "express";
import db from "../db/db.js";

const router = express.Router();

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
			b.booking_status !== 3 &&
			today >= new Date(b.check_in) &&
			today <= new Date(b.check_out)
		);
		// TODO: order asc by check_in, in order
		results.upcoming = bookings.filter(b => b.booking_status !== 3 && today < new Date(b.check_in));
		// TODO: order desc by check_out, most recent first
		results.completed = bookings.filter(b => b.booking_status !== 3 && today > new Date(b.check_in));
		results.cancelled = bookings.filter(b => b.booking_status === 3);
	}

	return results;
}

// GET /user/bookings
router.get("/booking/all", async (req, res) => {
	try {
		// Get bookings where user email matches
		const query = `SELECT b.id AS booking_id, b.property_id, b.check_in, b.check_out, b.booking_status_id, p.title, p.city, p.country, pd.images_url_array
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

// PATCH /user
router.patch("/", (req, res) => {
	console.log("Patch user with id ", req.user.id);
});

// DELETE /user
router.delete("/", (req, res) => {
	console.log("Delete user with id ", req.user.id);
});

export default router;