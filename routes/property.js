import express from "express";
import db from "../db/db.js";

const router = express.Router();

router.get("/all", async (req, res) => {
	try {
		const result = await db.query("SELECT p.id, p.title, p.geo, p.city, p.country, p.is_listed, pd.rating, pd.images_url_array, pd.price_per_night_eur AS price FROM properties AS p, property_details AS pd WHERE p.id = pd.property_id", []);
		res.json(result.rows);
	} catch (err) {
		res.status(404).send("Resource not found");
		console.log(err);
	}
});

// GET property with id
router.get("/id/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const result = await db.query("SELECT * FROM properties AS p, property_details AS pd WHERE p.id = $1 AND p.id = pd.property_id", [id]);
		res.json(result.rows);
	} catch (err) {
		res.status(404).send("Resource not found");
		console.log(err);
	}
});

// GET property with user id
router.get("/user-id/:userId", async (req, res) => {
	const userId = parseInt(req.params.userId);
	try {
		const result = await db.query("SELECT p.id, p.title, p.geo, p.city, p.country, p.is_listed, pd.rating, pd.images_url_array, pd.price_per_night_eur AS price FROM properties AS p, property_details AS pd WHERE p.id = pd.property_id AND pd.user_id = $1", [userId]);
		res.json(result.rows);
	} catch (err) {
		res.status(404).send("Resource not found");
		console.log(err);
	}
});

export default router;