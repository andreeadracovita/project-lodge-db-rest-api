import express from "express";

import db from "../db/db.js";
import { fetchExchangeRate, processExchangeRates } from "../exchangeRateMap.js";

const router = express.Router();

// GET /property/all response price is converted into site currency
router.get("/all", async (req, res) => {
	try {
		const query = `SELECT p.id, p.title, p.geo, p.city, p.country, pd.rating, pd.reviews_no, pd.images_url_array,
			pd.price_night AS price_night_local, pd.local_currency
			FROM properties AS p
			JOIN property_details AS pd
			ON p.id = pd.property_id
			WHERE p.is_listed = true`;
		const result = await db.query(query, []);
		if (result.rows.length > 0) {
			const currencies = result.rows.map(row => row.local_currency);
			if (currencies.length > 0) {
				await processExchangeRates(currencies);
			}
		}
		const properties = await Promise.all(
			result.rows.map(async (row) => {
				const rate = await fetchExchangeRate(row.local_currency);
				return {
					...row,
					price_night_site: (row.price_night_local / rate).toFixed(2)
				}
			})
		);
		res.json(properties);
	} catch (err) {
		console.log(err);
	}
});

// GET /property/id/1
router.get("/id/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const query = `SELECT p.id, p.title, p.geo, p.city, p.country, p.is_listed,
			pd.street, pd.street_no, pd.description, pd.guests, pd.beds, pd.bedrooms, pd.bathrooms, pd.features_ids,
			pd.building_type_id, pd.rental_type_id, pd.images_url_array, pd.price_night AS price_night_local,
			pd.local_currency, pd.experiences_ids, pd.rating, pd.reviews_no
			FROM properties AS p, property_details AS pd
			WHERE p.id=$1 AND p.id=pd.property_id`;
		const result = await db.query(query, [id]);
		if (result.rows.length === 1) {
			const property = result.rows[0];
			const rate = await fetchExchangeRate(property.local_currency);
			return res.json({
				...property,
				price_night_site: (property.price_night_local / rate).toFixed(2),
			});
		}
		return res.json({});
	} catch (err) {
		console.log(err);
	}
});

/**
 * GET /property/booked?id=1&date=2025-08-01 (year, month, day)
 * @query id - property id
 * @query date - queried date
 * For the year & month of date attribute, retrieve a list of check-in, check-out ranges
 * [
 * 	 { check_in: "...", check_out: "..." },
 * 	 { check_in: "...", check_out: "..." }
 * ]
 */
router.get("/booked", async (req, res) => {
	const id = req.query.id;
	const date = req.query.date;
	if (!id || !date) {
		return res.status(400).send("Bad request");
	}
	try {
		// TODO: do not hard code cancelled status
		const result = await db.query("SELECT check_in, check_out FROM bookings WHERE property_id=$1 AND booking_status_id!=3 AND check_out>$2", [id, new Date()]);
		return res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

// GET /property/availability?id=14&check_in=2025-08-01&check_out=2025-08-10
router.get("/availability", async (req, res) => {
	const id = req.query.id;
	const checkIn = req.query.check_in;
	const checkOut = req.query.check_out;
	if (id && checkIn && checkOut) {
		try {
			// TODO fix hardcoded cancelled value (3)
			const query = `SELECT * FROM bookings
				WHERE property_id=$1 AND booking_status_id != 3 AND (
					(check_in >= $2 AND check_in < $3) OR
					(check_out > $2 AND check_out < $3) OR
					(check_in <= $2 AND check_out >= $3)
				);`;
			const result = await db.query(query, [id, checkIn, checkOut]);
			if (result.rows.length > 0) {
				return res.json({
					available: false
				});
			} else {
				return res.json({
					available: true
				});
			}
		} catch (err) {
			console.log(err);
		}
	} else {
		return res.status(400).send("Bad request");
	}
});

// GET /property/reviews/:id get all reviews for property
router.get("/reviews/:id", async (req, res) => {
	const propId = parseInt(req.params.id);
	if (!propId) {
		return res.status(400).send("Bad request");
	}
	try {
		const result = await db.query("SELECT * FROM reviews WHERE property_id=$1", [propId]);
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

// POST /property/query retrieve all properties that match criteria
router.post("/query", async (req, res) => {
	const { country, city, check_in, check_out, guests } = req.body;
	if (!country) {// || !check_in || !check_out || !guests
		return res.status(401).send("Bad request");
	}

	try {
		// TODO fix hardcoded cancelled value (3)
		const query = `SELECT p.id, p.title, p.geo, p.city, p.country, pd.rating, pd.reviews_no, pd.images_url_array,
			pd.price_night AS price_night_local, pd.local_currency
			FROM properties AS p
			JOIN property_details AS pd
			ON p.id=pd.property_id
			WHERE p.is_listed=true AND (p.country=$1 OR p.city=$2) AND pd.guests >= $3 AND NOT EXISTS
			(
				SELECT 1 FROM bookings b
				WHERE b.property_id = p.id AND booking_status_id != 3
				AND 
				(
					(check_in >= $4 AND check_in < $5) OR
					(check_out > $4 AND check_out < $5) OR
					(check_in <= $4 AND check_out >= $5)
				)
			)`;
		const result = await db.query(query, [country, city, guests, check_in, check_out]);
		if (result.rows.length > 0) {
			const currencies = result.rows.map(row => row.local_currency);
			if (currencies.length > 0) {
				await processExchangeRates(currencies);
			}
		}
		const properties = await Promise.all(
			result.rows.map(async (row) => {
				const rate = await fetchExchangeRate(row.local_currency);
				return {
					...row,
					price_night_site: (row.price_night_local / rate).toFixed(2)
				}
			})
		);
		res.json(properties);
	} catch (err) {
		console.log(err);
	}
});

export default router;