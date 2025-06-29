import express from "express";
import fs from "fs";

import { siteCurrency, storagePath } from "../constants.js";
import db from "../db/db.js";

const router = express.Router();

// GET /host/properties
router.get("/properties", async (req, res) => {
	const userId = parseInt(req.user.id);
	try {
		const query = `SELECT p.id, p.title, p.city, p.country, p.is_listed, pd.images_url_array
			FROM properties AS p, property_details AS pd
			WHERE p.id = pd.property_id AND pd.host_id = $1`;
		const result = await db.query(query, [userId]);
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

// POST /host/properties/new payload
router.post("/properties/new", async (req, res) => {
	try {
		const { title, geo, city, country, is_listed } = req.body;
		const query = `INSERT INTO properties (title, geo, city, country, is_listed)
			VALUES ($1, POINT($2, $3), $4, $5, $6)
			RETURNING id`;
		const result = await db.query(query, [
			title, geo.x, geo.y, city, country, is_listed
		]);
		if (result.rows.length > 0) {
			res.status(200).send(result.rows[0]);
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

// PATCH /host/property/:id payload
router.patch("/property/:id", async (req, res) => {
	const id = req.params.id;
	const { title, geo, city, country, is_listed } = req.body;
	if (title !== undefined) {
		await updatePropertyField(id, "title", title);
	}
	if (geo !== undefined) {
		await updatePropertyField(id, "geo", geo);
	}
	if (city !== undefined) {
		await updatePropertyField(id, "city", city);
	}
	if (country !== undefined) {
		await updatePropertyField(id, "country", country);
	}
	if (is_listed !== undefined) {
		await updatePropertyField(id, "is_listed", is_listed);
	}
	res.status(200).send("OK");
});

// POST /host/property-details/new/base
router.post("/property-details/new/base", async (req, res) => {
	try {
		const {
			property_id,
			street,
			street_no,
			building_type_id,
			rental_type_id,
			local_currency
		} = req.body;
		const queryParams = "property_id, host_id, street, street_no, building_type_id, rental_type_id, created_at, local_currency";
		const result = await db.query(`INSERT INTO property_details (${queryParams}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`, [
			property_id, req.user.id, street, street_no, building_type_id, rental_type_id,
			new Date().toISOString().slice(0, 10), local_currency
		]);
		if (result.rows.length > 0) {
			res.status(200).send("OK");
		}
	} catch (err) {
		console.log(err);
	}
});

async function updatePropertyDetailField(id, field, value) {
	try {
		const result = await db.query(`UPDATE property_details SET ${field} = $1 WHERE property_id = $2`, [
			value, id
		]);
	} catch (err) {
		console.log(err);
	}
}

// PATCH /host/property-details/:id payload
router.patch("/property-details/:id", async (req, res) => {
	try {
		const id = req.params.id;
		const {
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
			local_currency
		} = req.body;
		if (street !== undefined) {
			await updatePropertyDetailField(id, "street", street);
		}
		if (street_no !== undefined) {
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
			await updatePropertyDetailField(id, "local_currency", local_currency);
		}
		res.status(200).send("OK");
	} catch (err) {
		console.log(err);
	}
});

function getDaysDiff(day1, day2) {
	// const diffTime = day2 - day1;
	// return Math.floor(diffTime / (1000 * 60 * 60 * 24));
	const _MS_PER_DAY = 1000 * 60 * 60 * 24;
	const utc1 = Date.UTC(day1.getFullYear(), day1.getMonth(), day1.getDate());
	const utc2 = Date.UTC(day2.getFullYear(), day2.getMonth(), day2.getDate());
	return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function partitionReservations(reservations) {
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
		const query = `SELECT * FROM bookings AS b
			JOIN property_details AS pd
			ON b.property_id=pd.property_id
			JOIN properties AS p
			ON b.property_id=p.id
			WHERE pd.host_id=$1 AND b.booking_status_id != 3
			ORDER BY b.check_in`;
		const result = await db.query(query, [req.user.id]);
		res.json(partitionReservations(result.rows));
	} catch(err) {
		console.log(err);
	}
});

// GET /host/bookings/calendar/property/1
router.get("/bookings/calendar/property/:id", async (req, res) => {
	const property_id = req.params.id;
	if (property_id) {
		try {
			// TODO: Order by check-in, range years
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

// DELETE /host/property/:id
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