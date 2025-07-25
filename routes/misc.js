import axios from "axios";
import express from "express";

import { fetchExchangeRate } from "../exchangeRateMap.js";
import db from "../db/db.js";

const router = express.Router();

// GET /misc/exchange-rate?target=EUR
router.get("/exchange-rate", async (req, res) => {
	const targetCurrency = req.query.target;
	const rate = await fetchExchangeRate(targetCurrency);
	if (rate) {
		res.json({ target: targetCurrency, rate });
	}
});

// GET /misc/user/1 get user's first_name and avatar for reviews
router.get("/user/:id", async (req, res) => {
	const userId = parseInt(req.params.id);
	if (!userId) {
		return res.status(400).send("Bad request");
	}

	try {
		const result = await db.query("SELECT first_name, last_name, img_url FROM user_details WHERE user_id=$1", [userId]);
		if (result.rows.length > 0) {
			return res.json(result.rows[0]);
		}
		return res.status(404).send("User not found");
	} catch (err) {
		console.log(err);
	}
});

// GET /misc/geo/Zurich+Switzerland
router.get("/geo/:address", async (req, res) => {
	const address = req.params.address;
	if (!address) {
		return res.status(400).send("Bad request");
	}

	const apiKey = process.env.GEOCODE_API_KEY;
	const response = await axios.get(`https://geocode.maps.co/search?q=${address}&api_key=${apiKey}`);
	
	return res.json(response.data);
});

export default router;