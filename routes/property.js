import express from "express";
import db from "../db/db.js";

const router = express.Router();

// GET /property/all
router.get("/all", async (req, res) => {
	try {
		const result = await db.query("SELECT p.id, p.title, p.geo, p.city, p.country, p.is_listed, pd.rating, pd.images_url_array, pd.price_per_night_eur AS price FROM properties AS p, property_details AS pd WHERE p.id = pd.property_id AND p.is_listed = true", []);
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

// GET /property/id/:id
router.get("/id/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const result = await db.query("SELECT * FROM properties AS p, property_details AS pd WHERE p.id = $1 AND p.id = pd.property_id", [id]);
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

export default router;