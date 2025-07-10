import express from "express";

import db from "../db/db.js";
import { fetchExchangeRate, processExchangeRates } from "../exchangeRateMap.js";

const router = express.Router();

// GET /property/home response price is converted into site currency
router.get("/home", async (req, res) => {
	// Find date of first Saturday
	const checkIn = new Date();
	const currentDayIndex = checkIn.getDay();
	checkIn.setDate(checkIn.getDate() + 6 - currentDayIndex);
	const checkOut = new Date();
	checkOut.setDate(checkIn.getDate() + 1);
	try {
		const query = `SELECT p.id, p.title, p.geo, p.city, p.country, pd.rating, pd.reviews_no, pd.images_url_array,
			pd.price_night AS price_night_local, pd.local_currency
			FROM properties AS p
			JOIN property_details AS pd
			ON p.id = pd.property_id
			WHERE p.is_listed = true AND NOT EXISTS
			(
				SELECT 1 FROM bookings b
				WHERE b.property_id = p.id AND booking_status_id != 3
				AND 
				(
					(check_in >= $1 AND check_in < $2) OR
					(check_out > $1 AND check_out < $2) OR
					(check_in <= $1 AND check_out >= $2)
				)
			)
			ORDER BY RANDOM() LIMIT 8`;
		const result = await db.query(query, [checkIn.toISOString().slice(0, 10), checkOut.toISOString().slice(0, 10)]);
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
// Mandatory fields: check_in, check_out, guests. Auxiliary fields: city, country
router.post("/query", async (req, res) => {
	const { check_in, check_out, country, city, guests, property_type, rental_type } = req.body;
	if (!check_in || !check_out) {
		return res.status(400).send("Bad request");
	}

	try {
		// TODO fix hardcoded cancelled value (3)
		// Compose query
		let query = `SELECT p.id, p.title, p.geo, p.city, p.country, pd.rating, pd.reviews_no, pd.images_url_array,
			pd.price_night AS price_night_local, pd.local_currency, pt.name, rt.name
			FROM properties AS p
			JOIN property_details AS pd
			ON p.id=pd.property_id
			JOIN property_types AS pt
			ON pd.building_type_id=pt.id
			JOIN rental_types AS rt
			ON pd.rental_type_id=rt.id
			WHERE p.is_listed=true AND NOT EXISTS
			(
				SELECT 1 FROM bookings b
				WHERE b.property_id = p.id AND booking_status_id != 3
				AND 
				(
					(check_in >= $1 AND check_in < $2) OR
					(check_out > $1 AND check_out < $2) OR
					(check_in <= $1 AND check_out >= $2)
				)
			)`;
		const queryParams = [check_in, check_out];
		let paramCount = queryParams.length;
		if (country) {
			query += ` AND p.country=$${++paramCount}`;
			queryParams.push(country);
		}
		if (city) {
			query += ` AND p.city=$${++paramCount}`;
			queryParams.push(city);
		}
		if (guests) {
			query += ` AND pd.guests>=$${++paramCount}`;
			queryParams.push(parseInt(guests));
		}
		if (property_type) {
			query += ` AND pt.name=$${++paramCount}`;
			queryParams.push(property_type);
		}
		if (rental_type) {
			query += ` AND rt.name=$${++paramCount}`;
			queryParams.push(rental_type);
		}

		const result = await db.query(query, queryParams);
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