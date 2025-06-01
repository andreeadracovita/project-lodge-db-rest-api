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
	} catch (error) {
		console.log(error);
	}
});

// GET /user/properties
router.get("/properties", async (req, res) => {
	const userId = parseInt(req.user.id);
	try {
		const result = await db.query("SELECT p.id, p.title, p.geo, p.city, p.country, p.is_listed, pd.rating, pd.images_url_array, pd.price_per_night_eur AS price FROM properties AS p, property_details AS pd WHERE p.id = pd.property_id AND pd.host_id = $1", [userId]);
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

export default router;