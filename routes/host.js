import express from "express";
import fs from "fs";

import { siteCurrency, storagePath } from "../constants.js";
import db from "../db/db.js";

const router = express.Router();

// GET /host/properties
router.get("/properties", async (req, res) => {
	const userId = parseInt(req.user.id);
	try {
		const query = `SELECT p.id, p.title, p.city, p.country, p.is_listed,
			pd.price_night AS price_night_local, pd.local_currency, pd.images_url_array
			FROM properties AS p, property_details AS pd
			WHERE p.id = pd.property_id AND pd.host_id = $1`;
		const result = await db.query(query, [userId]);
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

// POST /host/properties/new payload={ field1: val1, ...}
router.post("/property/new", async (req, res) => {
	const {
		title,
		geo,
		city,
		country,
		street,
		street_no,
		building_type_id,
		rental_type_id,
		local_currency
	} = req.body;

	if (!title || !city || !country || !street || !street_no || !building_type_id || !rental_type_id || !local_currency) {
		return res.status(400).send("Bad request");
	}
	if (title === "" || city === "" || country === "" || street === "" || street_no === "" || building_type_id === "" ||
		rental_type_id === "" || local_currency === "") {
		return res.json({ errors: ["Fill in all mandatory fields (marked with *)"]});
	}
	if (geo === []) {
		return res.json({ errors: ["No geolocation identified"]});
	}
	if (title.length > 50) {
		return res.json({ errors: ["Title exceeds 50 characters"]});
	}
	if (city.length > 50) {
		return res.json({ errors: ["City exceeds 50 characters"]});
	}
	if (country.length > 2) {
		return res.json({ errors: ["Country code exceeds 2 characters"]});
	}
	if (street.length > 50) {
		return res.json({ errors: ["Street exceeds 50 characters"]});
	}
	if (street_no.length > 50) {
		return res.json({ errors: ["Street number exceeds 10 characters"]});
	}
	if (local_currency > 3) {
		return res.json({ errors: ["Currency exceeds 3 characters"]});
	}

	try {
		const propQuery = `INSERT INTO properties (title, geo, city, country, is_listed)
			VALUES ($1, POINT($2, $3), $4, $5, $6)
			RETURNING id`;
		const propResult = await db.query(propQuery, [
			title, geo.x, geo.y, city, country, false
		]);
		if (propResult.rows.length > 0) {
			const propId = propResult.rows[0].id;
			const propDetailQuery = `INSERT INTO property_details 
				(property_id, host_id, street, street_no, building_type_id, rental_type_id, created_at, local_currency)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				RETURNING *;`
			const propDetailsResult = await db.query(propDetailQuery, [
				propId, req.user.id, street, street_no, building_type_id, rental_type_id,
				new Date().toISOString().slice(0, 10), local_currency
			]);
			if (propDetailsResult.rows.length > 0) {
				res.status(200).send(propResult.rows[0]);
			}
		}
	} catch (err) {
		console.log(err);
	}
});

async function updatePropertyField(id, field, value) {
	try {
		if (field !== "geo") {
			const result = await db.query(`UPDATE properties SET ${field} = $1 WHERE id = $2`, [
				value, id
			]);
		} else {
			const result = await db.query(`UPDATE properties SET geo = POINT($1, $2) WHERE id = $3`, [
				value.x, value.y, id
			]);
		}
	} catch (err) {
		console.log(err);
	}
}

async function updatePropertyDetailField(id, field, value) {
	try {
		const result = await db.query(`UPDATE property_details SET ${field} = $1 WHERE property_id = $2`, [
			value, id
		]);
	} catch (err) {
		console.log(err);
	}
}

// PATCH /host/property/1 payload={ field1: val1, ...}
router.patch("/property/:id", async (req, res) => {
	const id = req.params.id;
	const {
		title,
		geo,
		city,
		country,
		street,
		street_no,
		description,
		guests,
		beds,
		bedrooms,
		bathrooms,
		features_ids,
		building_type_id,
		rental_type_id,
		images_url_array,
		price,
		currency,
		experiences_ids,
		rating,
		local_currency,
		is_listed
	} = req.body;
	if (title !== undefined) {
		if (title === "") {
			return res.json({ errors: ["Title field cannot be empty"]});
		}
		if (title.length > 50) {
			return res.json({ errors: ["Title exceeds 50 characters"]});
		}
		await updatePropertyField(id, "title", title);
	}
	if (geo !== undefined) {
		await updatePropertyField(id, "geo", geo);
	}
	if (city !== undefined) {
		if (city === "") {
			return res.json({ errors: ["City field cannot be empty"]});
		}
		if (city.length > 50) {
			return res.json({ errors: ["City exceeds 50 characters"]});
		}
		await updatePropertyField(id, "city", city);
	}
	if (country !== undefined) {
		if (country === "") {
			return res.json({ errors: ["Country field cannot be empty"]});
		}
		if (country.length > 2) {
			return res.json({ errors: ["Country code exceeds 2 characters"]});
		}
		await updatePropertyField(id, "country", country);
	}
	if (is_listed !== undefined) {
		await updatePropertyField(id, "is_listed", is_listed);
	}
	if (street !== undefined) {
		if (street === "") {
			return res.json({ errors: ["Street field cannot be empty"]});
		}
		if (street.length > 50) {
			return res.json({ errors: ["Street exceeds 50 characters"]});
		}
		await updatePropertyDetailField(id, "street", street);
	}
	if (street_no !== undefined) {
		if (street_no === "") {
			return res.json({ errors: ["Street number field cannot be empty"]});
		}
		if (street_no.length > 50) {
			return res.json({ errors: ["Street number exceeds 50 characters"]});
		}
		await updatePropertyDetailField(id, "street_no", street_no);
	}
	if (description !== undefined) {
		await updatePropertyDetailField(id, "description", description);
	}
	if (guests !== undefined) {
		await updatePropertyDetailField(id, "guests", guests);
	}
	if (beds !== undefined) {
		await updatePropertyDetailField(id, "beds", beds);
	}
	if (bedrooms !== undefined) {
		await updatePropertyDetailField(id, "bedrooms", bedrooms);
	}
	if (bathrooms !== undefined) {
		await updatePropertyDetailField(id, "bathrooms", bathrooms);
	}
	if (features_ids !== undefined) {
		await updatePropertyDetailField(id, "features_ids", features_ids);
	}
	if (building_type_id !== undefined) {
		await updatePropertyDetailField(id, "building_type_id", building_type_id);
	}
	if (rental_type_id !== undefined) {
		await updatePropertyDetailField(id, "rental_type_id", rental_type_id);
	}
	if (images_url_array !== undefined) {
		// Delete previously stored images
		const result = await db.query("SELECT images_url_array FROM property_details WHERE property_id=$1", [id]);
		if (result.rows.length > 0) {
			deletePhotos(result.rows[0].images_url_array);
		};

		await updatePropertyDetailField(id, "images_url_array", images_url_array);
	}
	if (price !== undefined) {
		await updatePropertyDetailField(id, "price_night", price);
	}
	if (experiences_ids !== undefined) {
		await updatePropertyDetailField(id, "experiences_ids", experiences_ids);
	}
	if (rating !== undefined) {
		await updatePropertyDetailField(id, "rating", rating);
	}
	if (local_currency !== undefined) {
		if (local_currency === "") {
			return res.json({ errors: ["Currency field cannot be empty"]});
		}
		if (local_currency.length > 3) {
			return res.json({ errors: ["Currency exceeds 3 characters"]});
		}
		await updatePropertyDetailField(id, "local_currency", local_currency);
	}
	res.status(200).send("OK");
});

function getDaysDiff(day1, day2) {
	// const diffTime = day2 - day1;
	// return Math.floor(diffTime / (1000 * 60 * 60 * 24));
	const _MS_PER_DAY = 1000 * 60 * 60 * 24;
	const utc1 = Date.UTC(day1.getFullYear(), day1.getMonth(), day1.getDate());
	const utc2 = Date.UTC(day2.getFullYear(), day2.getMonth(), day2.getDate());
	return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function partitionBookings(reservations) {
	const arriving = [];
	const checkingOut = [];
	const current = [];
	const upcoming = [];

	const today = new Date();
	for (let r of reservations) {
		const checkInDate = new Date(r.check_in);
		const checkOutDate = new Date(r.check_out);
		// Skip checked-out bookings
		if (getDaysDiff(today, checkOutDate) < 0) {
			continue;
		}
		const daysUntilCheckIn = getDaysDiff(today, checkInDate);
		const daysUntilCheckOut = getDaysDiff(today, checkOutDate);

		// Arriving today or tomorrow
		if (daysUntilCheckIn >= 0 && daysUntilCheckIn <= 1) {
			arriving.push(r);
			continue;
		}
		// Checking out today or tomorrow
		if (daysUntilCheckOut >= 0 && daysUntilCheckOut <= 1) {
			checkingOut.push(r);
			continue;
		}
		// Upcoming
		if (daysUntilCheckIn > 1) {
			upcoming.push(r);
			continue;
		}
		// Current
		if (today > checkInDate && today <= checkOutDate) {
			current.push(r);
		}
	}

	return {
		arriving,
		checkingOut,
		current,
		upcoming
	}
}

// GET /host/bookings/partitioned
router.get("/bookings/partitioned", async (req, res) => {
	try {
		const query = `SELECT b.id, b.first_name, b.last_name, b.guests, b.check_in, b.check_out, b.pin_code, p.title
			FROM bookings AS b
			JOIN property_details AS pd
			ON b.property_id=pd.property_id
			JOIN properties AS p
			ON b.property_id=p.id
			WHERE pd.host_id=$1 AND b.booking_status_id != 3
			ORDER BY b.check_in`;
		const result = await db.query(query, [req.user.id]);
		res.json(partitionBookings(result.rows));
	} catch(err) {
		console.log(err);
	}
});

// GET /host/bookings/calendar/property/1
router.get("/bookings/calendar/property/:id", async (req, res) => {
	const property_id = req.params.id;
	if (property_id) {
		try {
			const query = `SELECT * FROM bookings WHERE property_id=$1 AND booking_status_id!=3`;
			const result = await db.query(query, [property_id]);
			res.json(result.rows);
		} catch (err) {
			console.log(err);
		}
	}
});

function deletePhotos(fileNameArray) {
	if (fileNameArray) {
		for (let fileName of fileNameArray) {
			const path = storagePath + fileName;
			fs.unlinkSync(path);
		}
	}
}

// DELETE /host/property/1
router.delete("/property/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	try {
		const result = await db.query("SELECT * FROM property_details WHERE property_id=$1", [id]);
		if (result.rows.length === 1) {
			const hostId = result.rows[0].host_id;
			if (hostId === req.user.id) {
				// Check if property_id appears in any bookings. Delete only if no bookings.
				const bookingResult = await db.query("SELECT * FROM bookings WHERE property_id=$1", [id]);
				if (bookingResult.rows.length === 0) {
					// Delete associated entries from wishlist
					await db.query("DELETE FROM wishlist WHERE property_id=$1", [id]);

					await db.query("DELETE FROM property_details WHERE property_id=$1", [id]);
					await db.query("DELETE FROM properties WHERE id=$1", [id]);

					// Delete associated images from storage
					deletePhotos(result.rows[0].images_url_array);

					return res.status(200).send("Success");
				} else {
					return res.status(403).send("Cannot delete property with associated bookings.");
				}
			} else {
				return res.status(401).send("Unauthorized");
			}
		}
		return res.status(404).send("Property not found");
	} catch (err) {
		console.log(err);
	}
});

export default router;