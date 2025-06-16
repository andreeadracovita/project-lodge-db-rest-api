import express from "express";

import { fetchExchangeRate } from "../exchangeRateMap.js";

const router = express.Router();

// GET /misc/exchange-rate?target=EUR
router.get("/exchange-rate", async (req, res) => {
	const targetCurrency = req.query.target;
	const rate = await fetchExchangeRate(targetCurrency);
	if (rate) {
		res.json({ target: targetCurrency, rate });
	}
});

export default router;