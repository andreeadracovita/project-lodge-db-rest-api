import express from "express";
import db from "../db/db.js";

const router = express.Router();

router.get("/building", async (req, res) => {
	try {
		const result = await db.query("SELECT * FROM property_types");
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

router.get("/rental", async (req, res) => {
	try {
		const result = await db.query("SELECT * FROM rental_types");
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

router.get("/feature", async (req, res) => {
	try {
		const result = await db.query("SELECT * FROM features");
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

router.get("/experience", async (req, res) => {
	try {
		const result = await db.query("SELECT * FROM experiences");
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
})

export default router;