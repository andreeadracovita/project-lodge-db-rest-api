import env from "dotenv";
import express from "express";

import db from "../db/db.js";
import { deleteProperty } from "../utils/utils.js";

env.config();
const router = express.Router();

router.get("/authorize", async (req, res) => {
	const userEmail = req.user.email;
	if (!userEmail || userEmail !== process.env.ADMIN_EMAIL) {
		res.json({ authorized: false });
	} else {
		res.json({ authorized: true });
	}
});

router.get("/properties", async (req, res) => {
	const userEmail = req.user.email;
	if (!userEmail || userEmail !== process.env.ADMIN_EMAIL) {
		return res.status(401).send("Unauthorized");
	}

	const query = `SELECT p.*, pd.*, u.email AS host_email FROM properties AS p
		JOIN property_details AS pd
		ON p.id=pd.property_id
		JOIN users AS u
		ON pd.host_id=u.id
		WHERE p.is_listed=true
		ORDER BY p.id DESC`;
	const result = await db.query(query, []);
	return res.status(200).json(result.rows);
});

router.delete("/property/:id", async (req, res) => {
	const userEmail = req.user.email;
	if (!userEmail || userEmail !== process.env.ADMIN_EMAIL) {
		return res.status(401).send("Unauthorized");
	}
	const propId = req.params.id;
	try {
		await deleteProperty(propId);
		res.status(200).send(`Property with id ${propId} successfully deleted`);
	} catch (err) {
		console.log(err);
	}
});

export default router;