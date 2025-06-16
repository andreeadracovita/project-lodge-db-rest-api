import axios from "axios";

import { siteCurrency } from "./constants.js";

/**
 * Map to store exchange rates. To be used across site for exchange. Limits calls to API and prevents against 429 error.
 * From: Site currency: e.g. "CHF"
 * To: Target currency: e.g. "EUR"
 * Rate: day's rate
 * Date: day for rate in toDateString() format
 * exchangeRateMap.set(targetCurrency, { date: new Date(), rate: API call });
 * exchangeRateMap.get(targetCurrency)
 */
const exchangeRateMap = new Map();

export async function fetchExchangeRate(targetCurrency) {
	if (targetCurrency === siteCurrency) {
		return 1;
	}

	const entry = exchangeRateMap.get(targetCurrency);
	// Check if same day
	if (entry?.date === (new Date()).toDateString()) {
		return entry.rate;
	}
	// Either entry does not exist or is different date
	// Base_currency = site_currency, target_currency = user_currency
	const apiKey = process.env.FCA_API_KEY;
	const response = await axios.get(`https://api.freecurrencyapi.com/v1/latest?apikey=${apiKey}&base_currency=${siteCurrency}&currencies=${targetCurrency}`);
	const rate = response.data.data[targetCurrency];

	exchangeRateMap.set(
		targetCurrency, 
		{
			date: (new Date()).toDateString(),
			rate
		}
	);
	console.log(exchangeRateMap);
	return rate;
}