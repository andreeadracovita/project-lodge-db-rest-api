import express from "express";
import db from "../db/db.js";

const router = express.Router();

// GET /user/properties
router.get("/properties", async (req, res) => {
	const userId = parseInt(req.user.id);
	try {
		const result = await db.query("SELECT p.id, p.title, p.city, p.country, p.is_listed, pd.images_url_array FROM properties AS p, property_details AS pd WHERE p.id = pd.property_id AND pd.host_id = $1", [userId]);
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

router.post("/properties/new", async (req, res) => {
	try {
		const { title, geo, city, country, is_listed } = req.body;
		const result = await db.query("INSERT INTO properties (title, geo, city, country, is_listed) VALUES ($1, POINT($2, $3), $4, $5, $6) RETURNING id", [
			title, geo.x, geo.y, city, country, is_listed
		]);
		if (result.rows.length > 0) {
			console.log("Successfully added!");
			res.status(200).send(result.rows[0]);
		}
	} catch (err) {
		console.log(err);
	}
});

router.patch("/property/:id", async (req, res) => {
	try {
		console.log(req.params.id);
		console.log(req.body);
		res.status(200).send("OK");
	} catch (err) {
		console.log(err);
	}
});

router.post("/property-details/new/base", async (req, res) => {
	try {
		console.log(req.body);
		const {
			property_id,
			street,
			street_no
		} = req.body;
		const queryParams = "property_id, host_id, street, street_no, created_at";
		const result = await db.query(`INSERT INTO property_details (${queryParams}) VALUES ($1, $2, $3, $4, $5) RETURNING *;`, [
			property_id, req.user.id, street, street_no, new Date().toISOString().slice(0, 10)
		]);
		if (result.rows.length > 0) {
			console.log("Successfully added!");
			res.status(200).send("OK");
		}
	} catch (err) {
		console.log(err);
	}
});

router.patch("/property-details/:id", async (req, res) => {
	try {
		console.log(req.params.id);
		console.log(req.body);
		res.status(200).send("OK");
	} catch (err) {
		console.log(err);
	}
});

export default router;