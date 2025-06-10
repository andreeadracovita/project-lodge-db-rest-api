import express from "express";

import db from "../db/db.js";

const router = express.Router();

async function registerPayment(email, card_number, card_holder, price) {
	try {
		const query = `INSERT INTO payments (email, card_number, card_holder, payment_date, amount)
			VALUES ($1, $2, $3, $4, $5) RETURNING id`;
		const result = await db.query(query, [email, card_number, card_holder, new Date().toISOString(), price]);
		if (result.rows.length === 1) {
			return result.rows[0].id;
		}
		return -1;
	} catch (err) {
		console.log(err);
		return -1;
	}
}

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
		card_holder,
		price
	} = req.body;
	try {
		const paymentId = await registerPayment(email, card_number, card_holder, price);
		if (paymentId) {
			const query = `INSERT INTO bookings (email, property_id, first_name, last_name, guest_address, guest_city, guest_country,
				guest_phone_no, check_in, check_out, guests, booking_status_id, payment_id)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
				RETURNING id`;
			const result = await db.query(query, [
				email, property_id, first_name, last_name, address, city, country,
				phone_number, check_in, check_out, guests, 2, paymentId
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

export default router;