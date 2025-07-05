import express from "express";

import db from "../db/db.js";
import { getNightsCount, generateCode } from "../utils/utils.js";

const router = express.Router();

// POST /booking/new payload
router.post("/new", async (req, res) => {
	const { 
		email,
		property_id,
		first_name,
		last_name,
		address,
		city,
		country,
		phone_number,
		check_in,
		check_out,
		guests,
		booking_status_id
	} = req.body;
	try {
		// Front end must send those fields even if empty
		if (!property_id || !check_in || !check_out || !email || !first_name || !last_name || !address || !city ||
			!country || country.length > 2 || !phone_number) {
			return res.status(400).send("Bad request");
		}
		// User must complete mandatory fields
		if (email === "" || first_name === "" || last_name === "" || address === "" || city === "" || country === "" ||
			phone_number === "") {
			return res.json({ errors: ["Fill in all mandatory fields (marked with *)"]});
		}
		if (email.length > 50) {
			return res.json({ errors: ["Email exceeds 50 characters"]});
		}
		if (first_name.length > 50) {
			return res.json({ errors: ["First name exceeds 50 characters"]});
		}
		if (last_name.length > 50) {
			return res.json({ errors: ["Last name exceeds 50 characters"]});
		}
		if (address.length > 50) {
			return res.json({ errors: ["Address exceeds 50 characters"]});
		}
		if (city.length > 50) {
			return res.json({ errors: ["City exceeds 50 characters"]});
		}
		if (phone_number.length > 50) {
			return res.json({ errors: ["Phone number exceeds 50 characters"]});
		}

		const priceQuery = `SELECT price_night, local_currency FROM property_details WHERE property_id=$1`;
		const propertyPriceResult = await db.query(priceQuery, [property_id]);
		if (propertyPriceResult.rows.length === 0) {
			return;
		}

		const priceNightLocal = propertyPriceResult.rows[0].price_night;
		const localCurrency = propertyPriceResult.rows[0].local_currency;
		const nightsCount = getNightsCount(new Date(check_in), new Date(check_out));
		const priceTotal = nightsCount * priceNightLocal;
		const pinCode = generateCode();

		const query = `INSERT INTO bookings (email, property_id, first_name, last_name, guest_address, guest_city, guest_country,
			guest_phone_no, check_in, check_out, guests, booking_status_id, pin_code, amount, currency)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
			RETURNING id, pin_code`;
		const result = await db.query(query, [
			email, property_id, first_name, last_name, address, city, country,
			phone_number, new Date(check_in).toISOString().slice(0, 10), new Date(check_out).toISOString().slice(0, 10),
			guests, 2, pinCode, priceTotal, localCurrency
		]);
		if (result.rows.length > 0) {
			return res.status(200).send(result.rows[0]);
		}
		return res.status(409).send("Something went wrong. Please try again later.");
	} catch (err) {
		console.log(err);
	}
});

router.get("/", async (req, res) => {
	const bookingId = req.query.id;
	const pinCode = req.query.pin;
	if (bookingId && pinCode) {
		try {
			const query = `SELECT b.*, u.email AS host_email, bs.name AS booking_status
				FROM bookings AS b
				JOIN property_details AS pd
				ON b.property_id=pd.property_id
				JOIN users AS u
				ON u.id=pd.host_id
				JOIN booking_status AS bs
				ON b.booking_status_id=bs.id
				WHERE b.id=$1`;
			const result = await db.query(query, [bookingId]);
			if (result.rows.length > 0 && result.rows[0].pin_code === pinCode) {
				return res.json(result.rows[0]);
			}
			return res.status(401).send("Unauthorized access");
		} catch (err) {
			console.log(err);
		}
	}
});

// POST /booking/authorize
router.post("/authorize", async (req, res) => {
	const {
		confirmation_number,
		pin_code
	} = req.body;
	if (confirmation_number && pin_code) {
		try {
			const result = await db.query("SELECT pin_code FROM bookings WHERE id=$1", [confirmation_number]);
			if (result.rows.length > 0 && pin_code === result.rows[0].pin_code) {
				return res.json({ authorized: true });
			}
			return res.json({ authorized: false });
		} catch (err) {
			console.log(err);
		}
	}
});

// POST /booking/cancel
router.post("/cancel", async (req, res) => {
	const {
		confirmation_number,
		pin_code
	} = req.body;
	if (confirmation_number && pin_code) {
		try {
			// Authorize request first: user knows confirmation number and pin code
			const result = await db.query("SELECT pin_code, booking_status_id FROM bookings WHERE id=$1", [confirmation_number]);
			if (result.rows.length > 0) {
				const today = new Date();
				const booking = result.rows[0];
				if (booking.booking_status_id === 3) {
					return res.status(403).send("Cannot cancel an already cancelled booking.");
				}
				// Can cancel only if current or upcoming booking.
				if (today <= new Date(booking.check_out)) {
					return res.status(403).send("Cannot cancel a completed booking");
				}
				if (pin_code === booking.pin_code) {
					const result = await db.query("UPDATE bookings SET booking_status_id=3 WHERE id=$1 RETURNING id", [confirmation_number]);
					if (result.rows.length > 0) {
						return res.status(200).send("Successfully cancelled a booking.");
					}
					return res.status(409).send("Something went wrong. Please try again later.");
				}
			}
			return res.status(401).send("Unauthorized");
		} catch (err) {
			console.log(err);
		}
	}
});

export default router;