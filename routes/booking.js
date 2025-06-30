import express from "express";

import db from "../db/db.js";
import { getNightsCount, generateCode } from "../utils/utils.js";

const router = express.Router();

async function registerPayment(email, card_number, card_holder, price, local_currency) {
	try {
		console.log("Registering payment for", price, local_currency);
		const query = `INSERT INTO payments (email, card_number, card_holder, payment_date, amount, currency)
			VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
		const result = await db.query(query, [email, card_number, card_holder, new Date().toISOString(), price, local_currency]);
		if (result.rows.length === 1) {
			return result.rows[0].id;
		}
		return -1;
	} catch (err) {
		console.log(err);
		return -1;
	}
}

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
		booking_status_id,
		card_number,
		card_holder
	} = req.body;
	try {
		if (!property_id || !check_in || !check_out) {
			return res.status(400).send("Bad request");
		}
		const nightsCount = getNightsCount(new Date(check_in), new Date(check_out));

		const propertyPriceResult = await db.query("SELECT price_night, local_currency FROM property_details WHERE property_id=$1", [property_id]);
		if (propertyPriceResult.rows.length === 0) {
			return;
		}

		const priceNightLocal = propertyPriceResult.rows[0].price_night;
		const localCurrency = propertyPriceResult.rows[0].local_currency;
		const priceTotal = nightsCount * priceNightLocal;
		console.log("Paid price in local currency: ")
		const paymentId = await registerPayment(email, card_number, card_holder, priceTotal, localCurrency);
		const pinCode = generateCode();
		if (paymentId) {
			const query = `INSERT INTO bookings (email, property_id, first_name, last_name, guest_address, guest_city, guest_country,
				guest_phone_no, check_in, check_out, guests, booking_status_id, payment_id, pin_code)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
				RETURNING id, pin_code`;
			const result = await db.query(query, [
				email, property_id, first_name, last_name, address, city, country,
				phone_number, new Date(check_in).toISOString().slice(0, 10), new Date(check_out).toISOString().slice(0, 10),
				guests, 2, paymentId, pinCode
			]);
			if (result.rows.length > 0) {
				return res.status(200).send(result.rows[0]);
			}
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
			const query = `SELECT b.*, p.amount, p.currency
				FROM bookings AS b
				JOIN payments AS p
				ON b.payment_id=p.id
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