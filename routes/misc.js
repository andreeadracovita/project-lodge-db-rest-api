import axios from "axios";
import express from "express";

import { siteCurrency } from "../constants.js";

const router = express.Router();

// GET /misc/convert?currency=EUR&value=240
router.get("/convert", async (req, res) => {
	// Base_currency = site_currency, target_currency = user_currency
	const targetCurrency = req.query.currency;
	const apiKey = process.env.FCA_API_KEY;
	const response = await axios.get(`https://api.freecurrencyapi.com/v1/latest?apikey=${apiKey}&base_currency=${siteCurrency}&currencies=${targetCurrency}`);
	const conversionRate = response.data.data[siteCurrency];

	const initValue = req.query.value;
	const convertedPrice = Math.round(initValue * conversionRate * 100) / 100;
	res.json({
		converted: convertedPrice
	});
});

export default router;