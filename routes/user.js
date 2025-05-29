import express from "express";
import db from "../db/db.js";

const router = express.Router();

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

export default router;