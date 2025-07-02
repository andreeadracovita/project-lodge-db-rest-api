import express from "express";

import db from "../db/db.js";

const router = express.Router();

// GET /review/all
router.get("/all", async (req, res) => {
	const userId = parseInt(req.user.id);
	if (!userId) {
		return res.status(400).send("Bad request");
	}
	try {
		const result = await db.query("SELECT * FROM reviews WHERE user_id=$1", [userId]);
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

// GET /review/authorize/booking/1
router.get("/authorize/booking/:id", async (req, res) => {
	// User is authorized to review a property if he has completed the booking.
	const bookingId = parseInt(req.params.id);
	const userEmail = req.user.email;
	if (!bookingId || !userEmail) {
		return res.status(400).send("Bad request");
	}

	try {
		const query = `SELECT b.*, bs.name AS booking_status
			FROM bookings AS b
			JOIN booking_status AS bs
			ON bs.id=b.booking_status_id
			WHERE b.id=$1`;
		const result = await db.query(query, [bookingId]);
		if (result.rows.length === 1) {
			const booking = result.rows[0];
			if (booking.email === userEmail && booking.booking_status === "confirmed") {
				// Can review only if did not review already
				const resultReviews = await db.query("SELECT * FROM reviews WHERE booking_id=$1", [bookingId]);
				if (resultReviews.rows.length === 0) {
					return res.status(200).send({ isAuthorized: true, property_id: booking.property_id });
				}
				// Review already exists
				return res.status(401).send({ isAuthorized: false });
			}
			return res.status(401).send({ isAuthorized: false });
		}
		return res.status(404).send("Booking not found");
	} catch (err) {
		console.log(err);
	}
});

// GET /review/exists/booking/1
// Check if a booking was reviewed
router.get("/exists/booking/:id", async (req, res) => {
	const bookingId = parseInt(req.params.id);
	if (!bookingId) {
		return res.status(400).send("Bad request");
	}

	try {
		const result = await db.query("SELECT * FROM reviews WHERE booking_id=$1", [bookingId]);
		if (result.rows.length > 0) {
			res.json({ exists: true });
		} else {
			res.json({ exists: false });
		}
	} catch (err) {
		console.log(err);
	}
});

// POST /review/booking/1 { property_id: 1, rating: 5, title: "Review title", body: "This is the review" }
router.post("/booking/:id", async (req, res) => {
	const bookingId = parseInt(req.params.id);
	const userId = parseInt(req.user.id);
	const { property_id, rating, title, body } = req.body;
	if (!bookingId || !userId || !rating || !property_id) {
		return res.status(400).send("Bad request");
	}
	
	try {
		const query = `INSERT INTO reviews (booking_id, property_id, user_id, title, body, rating, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING *`;
		const result = await db.query(query, [bookingId, property_id, userId, title, body, parseInt(rating), new Date().toISOString().slice(0, 10)]);
		if (result.rows.length > 0) {
			await updatePropertyDetailsRatingAndReview(property_id);
			res.status(200).send("OK");
		}
	} catch (err) {
		console.log(err);
	}
});

async function updatePropertyDetailsRatingAndReview(propId) {
	const query = "SELECT * FROM reviews WHERE property_id=$1";
	try {
		const result = await db.query("SELECT rating FROM reviews WHERE property_id=$1", [propId]);
		if (result.rows.length > 0) {
			const ratingSum = result.rows.reduce(
				(accumulator, row) => accumulator + row.rating,
				0
			);
			const reviewsNo = result.rows.length;
			const ratingAvg = (ratingSum / reviewsNo).toFixed(1);
			await db.query("UPDATE property_details SET rating=$1, reviews_no=$2 WHERE property_id = $3", [
				ratingAvg, reviewsNo, propId
			]);
		}
	} catch (err) {
		console.log(err);
	}
}

export default router;