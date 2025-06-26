import express from "express";

import db from "../db/db.js";

const router = express.Router();

async function updatePropertyDetailsRatingAndReview(propId) {
	// Call ComputeProperty property_details rating and reviews_no for propId
	console.log("Updating property details...");
}

// POST /review/property/1 { rating: 5, title: "Review title", body: "This is the review" }
router.post("/property/:id", async (req, res) => {
	const propId = parseInt(req.params.id);
	const userId = parseInt(req.user.id);
	const { rating, title, body } = req.body;
	if (!propId || !userId || !rating) {
		return res.status(400).send("Bad request");
	}
	
	try {
		const query = `INSERT INTO reviews (property_id, user_id, title, body, rating, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *`;
		const result = await db.query(query, [propId, userId, title, body, parseInt(rating), new Date().toISOString().slice(0, 10)]);
		if (result.rows.length > 0) {
			await updatePropertyDetailsRatingAndReview(propId);
			res.status(200).send("OK");
		}
	} catch (err) {
		console.log(err);
	}
});

// GET /all
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

export default router;