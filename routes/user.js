import bcrypt from "bcrypt";
import express from "express";
import fs from "fs";

import { saltRounds, storagePath } from "../constants.js";
import db from "../db/db.js";
import { fetchExchangeRate, processExchangeRates } from "../exchangeRateMap.js";
import { validateEmail, validatePassword } from "../utils/utils.js";

const router = express.Router();

const userFields = ["email", "password"];
const userDetailsFields = ["first_name", "last_name", "img_url", "country_code", "language", "currency", "experiences_ids"];

// GET /user/config
router.get("/config", async (req, res) => {
	try {
		const query = `SELECT u.email, ud.first_name, ud.last_name, ud.country_code, ud.language, ud.currency,
			ud.experiences_ids, ud.img_url
			FROM user_details AS ud
			JOIN users AS u
				ON ud.user_id=u.id
			WHERE user_id = $1`;
		const result = await db.query(query, [
			req.user.id
		]);
		if (result.rows.length > 0) {
			const userDetails = result.rows[0];
			return res.json(userDetails);
		} else {
			return res.status(404).send("User not found");
		}
	} catch (err) {
		console.log(err);
	}
});

async function filterBookings(bookings) {
	const results = {
		current: [],
		upcoming: [],
		completed: [],
		cancelled: []
	};

	if (bookings.length > 0) {
		const today = new Date();

		results.current = bookings
			.filter(b =>
				b.booking_status !== "cancelled" &&
				today >= new Date(b.check_in) &&
				today <= new Date(b.check_out)
			)
			.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));

		results.upcoming = bookings
			.filter(b => b.booking_status !== "cancelled" && today < new Date(b.check_in))
			.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));

		results.completed = bookings
			.filter(b => b.booking_status !== "cancelled" && today > new Date(b.check_out))
			.sort((a, b) => new Date(b.check_out) - new Date(a.check_out));
		results.cancelled = bookings.filter(b => b.booking_status === "cancelled");
	}

	return results;
}

// GET /user/bookings
router.get("/booking/all", async (req, res) => {
	try {
		// Get bookings where user email matches
		const query = `SELECT b.id AS booking_id, b.property_id, b.check_in, b.check_out, b.booking_status_id,
			b.pin_code, p.title, p.city, p.country, p.geo, pd.images_url_array, pd.street, pd.street_no,
			bs.name AS booking_status
			FROM bookings AS b
			JOIN properties AS p
			ON b.property_id=p.id
			JOIN property_details AS pd
			ON b.property_id=pd.property_id
			JOIN booking_status AS bs
			ON bs.id=b.booking_status_id
			WHERE b.email=$1;`
		const result = await db.query(query, [req.user.email]);

		const response = await filterBookings(result.rows);
		res.json(response);
	} catch (err) {
		console.log(err);
	}
});

// GET /user/wishlist/property-id/1
router.get("/wishlist/property-id/:id", async (req, res) => {
	try {
		const propertyId = req.params.id;
		const userId = req.user.id;
		const result = await db.query("SELECT * FROM wishlist WHERE user_id=$1 AND property_id=$2", [
			userId, propertyId
		]);
		if (result.rows.length > 0) {
			return res.json({ is_wishlisted: true });
		}
		return res.json({ is_wishlisted: false });
	} catch (err) {
		console.log(err);
	}
});

// POST /user/wishlist/property-id/1
router.post("/wishlist/toggle/property-id/:id", async (req, res) => {
	try {
		const propertyId = req.params.id;
		const userId = req.user.id;
		const result = await db.query("SELECT * FROM wishlist WHERE user_id=$1 AND property_id=$2", [
			userId, propertyId
		]);
		if (result.rows.length > 0) {
			await db.query("DELETE FROM wishlist WHERE user_id=$1 AND property_id=$2", [
				userId, propertyId
			]);
			return res.json({ is_wishlisted: false });
		} else {
			const result = await db.query("INSERT INTO wishlist (user_id, property_id) VALUES ($1, $2) RETURNING *", [
				userId, propertyId
			]);
			return res.json({ is_wishlisted: true });
		}
	} catch (err) {
		console.log(err);
	}
});

// GET /user/wishlist/all
router.get("/wishlist/all", async (req, res) => {
	try {
		const userId = req.user.id;
		const query = `SELECT p.id, p.title, p.geo, p.city, p.country, pd.rating, pd.images_url_array,
			pd.price_night AS price_night_local, pd.local_currency
			FROM properties AS p
			JOIN property_details AS pd
			ON p.id = pd.property_id
			JOIN wishlist AS w
			ON p.id = w.property_id
			WHERE w.user_id=$1 AND p.is_listed = TRUE;`;
		const result = await db.query(query, [
			userId
		]);
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

// GET /user/authorize/booking
router.get("/authorize/booking", async (req, res) => {
	const bookingId = req.query.id;
	if (!bookingId) {
		res.status(404).message("Missing booking number");
	}

	try {
		const result = await db.query("SELECT email FROM bookings WHERE id=$1", [bookingId]);
		if (result.rows.length > 0 && result.rows[0].email === req.user.email) {
			return res.json({ authorized: true });
		}
		return res.json({ authorized: false });
	} catch (err) {
		console.log(err);
	}
});

async function updateBookingsEmail(oldEmail, newEmail) {
	try {
		await db.query(`UPDATE bookings SET email=$1 WHERE email=$2`, [newEmail, oldEmail]);
	} catch (err) {
		console.log(err);
	}
}

async function updateUserField(id, field, value) {
	try {
		if (userFields.includes(field)) {
			await db.query(`UPDATE users SET ${field}=$1 WHERE id=$2`, [value, id]);
		} else if (userDetailsFields.includes(field)) {
			await db.query(`UPDATE user_details SET ${field}=$1 WHERE user_id=$2`, [value, id]);
		}
	} catch (err) {
		console.log(err);
	}
}

// PATCH /user
router.patch("/", async (req, res) => {
	const id = req.user.id;
	const { email, first_name, last_name, img_url, country_code, language, currency, experiences_ids } = req.body;
	if (email !== undefined) {
		if (email === "") {
			return res.json({ errors: ["Email field cannot be empty"]});
		}

		if (email.length > 50) {
			return res.json({ errors: ["Email must exceeds 50 characters"]});
		}

		if (validateEmail(email) === false) {
			return res.json({ errors: ["Invalid email"]});
		}
		try {
			const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
			if (result.rows.length === 0){
				const oldEmail = req.user.email;
				await updateBookingsEmail(oldEmail, email);
				await updateUserField(id, "email", email);
			} else {
				return res.json({ errors: ["Email is already associated with an account"] });
			}
		} catch (err) {
			console.log(err);
		}	
	}
	if (first_name !== undefined) {
		if (first_name === "") {
			return res.json({ errors: ["First name field cannot be empty"]});
		}
		if (first_name.length > 50) {
			return res.json({ errors: ["First name exceeds 50 characters"]});
		}
		await updateUserField(id, "first_name", first_name);
	}
	if (last_name !== undefined) {
		if (last_name === "") {
			return res.json({ errors: ["Last name field cannot be empty"]});
		}
		if (last_name.length > 50) {
			return res.json({ errors: ["Last name exceeds 50 characters"]});
		}
		await updateUserField(id, "last_name", last_name);
	}
	if (img_url !== undefined) {
		// Delete previously stored image
		const result = await db.query("SELECT img_url FROM user_details WHERE user_id=$1", [id]);
		if (result.rows.length > 0 && result.rows[0].img_url) {
			const path = storagePath + result.rows[0].img_url;
			fs.unlinkSync(path);
		};

		await updateUserField(id, "img_url", img_url);
	}
	if (country_code !== undefined) {
		if (country_code === "") {
			return res.json({ errors: ["Country field cannot be empty"]});
		}
		if (country_code.length > 2) {
			return res.json({ errors: ["Country code exceeds 2 characters"]});
		}
		await updateUserField(id, "country_code", country_code);
	}
	if (language !== undefined) {
		if (language === "") {
			return res.json({ errors: ["Language field cannot be empty"]});
		}
		if (language.length > 5) {
			return res.json({ errors: ["Language exceeds 5 characters"]});
		}
		await updateUserField(id, "language", language);
	}
	if (currency !== undefined) {
		if (currency === "") {
			return res.json({ errors: ["Currency field cannot be empty"]});
		}
		if (currency.length > 5) {
			return res.json({ errors: ["Currency exceeds 3 characters"]});
		}
		await updateUserField(id, "currency", currency);
	}
	if (experiences_ids !== undefined) {
		await updateUserField(id, "experiences_ids", experiences_ids);
	}
	res.status(200).send("User updated successfully");
});

// PATCH /user/password
router.patch("/password", async (req, res) => {
	const id = req.user.id;
	const { old_password, new_password } = req.body;
	if (!old_password || !new_password) {
		return res.json({ errors: ["Fields cannot be empty"] });
	}
	if (new_password.length > 50) {
		return res.json({ errors: ["Password exceeds 50 characters"]});
	}

	if (old_password === new_password) {
		return res.json({ errors: ["Old and new passwords cannot be the same"] });
	}
	
	try {
		const nameResult = await db.query("SELECT first_name, last_name FROM user_details WHERE user_id=$1", [id]);
		if (nameResult.rows.length !== 1) {
			return res.status(400).send("Bad request");
		}
		// Password must not contain user's name
		const passwordValidationErrors = validatePassword(
			new_password,
			nameResult.rows[0].firstName,
			nameResult.rows[0].lastName
		);
		if (passwordValidationErrors.length > 0) {
			return res.json({ errors: passwordValidationErrors });
		}

		const result = await db.query("SELECT password FROM users WHERE id=$1", [id]);
		if (result.rows.length === 1) {
			const storedHashedPassword = result.rows[0].password;
			bcrypt.compare(old_password, storedHashedPassword, (err, valid) => {
				if (err) {
					console.error("Error comparing passwords:", err);
				} else {
					if (valid) {
						bcrypt.hash(new_password, saltRounds, async (err, hash) => {
							if (err) {
								console.error("Error hashing password:", err);
								return res.status(400).send("Bad request");
							} else {
								await db.query(`UPDATE users SET password=$1 WHERE id=$2`, [hash, id]);
								return res.status(200).send("Password changed successfully");
							}
						});
					} else {
						return res.json({ errors: ["Old password does not match"] });
					}
				}
			});
		} else {
			return res.status(400).send("Bad request");
		}
	} catch (err) {
		console.log(err);
	}
});

// DELETE /user
router.delete("/", async (req, res) => {
	const userId = req.user.id;
	if (!userId) {
		return res.status(400).send("Bad request");
	}
	try {
		const propertiesResult = await db.query("SELECT COUNT(*) FROM property_details WHERE host_id=$1", [userId]);
		if (propertiesResult.rows.length === 1 && propertiesResult.rows[0].count) {
			const avatarResult = await db.query("SELECT img_url FROM user_details WHERE user_id=$1", [userId]);
			if (avatarResult.rows.length === 1 && avatarResult.rows[0].img_url) {
				const path = storagePath + avatarResult.rows[0].img_url;
				fs.unlinkSync(path);
			}
			await db.query("DELETE FROM user_details WHERE user_id=$1", [userId]);
			await db.query("DELETE FROM users WHERE id=$1", [userId]);
			return res.status(200).send("Account deleted successfully");
		} else {
			return res.status(400).send("Bad request");
		}
	} catch (err) {
		console.log(err);
	}
});

export default router;