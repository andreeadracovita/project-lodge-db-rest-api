import express from "express";
import db from "../db/db.js";

const router = express.Router();

// GET /user/properties
router.get("/properties", async (req, res) => {
	const userId = parseInt(req.user.id);
	try {
		const result = await db.query("SELECT p.id, p.title, p.city, p.country, p.is_listed, pd.images_url_array FROM properties AS p, property_details AS pd WHERE p.id = pd.property_id AND pd.host_id = $1", [userId]);
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

router.post("/properties/new", async (req, res) => {
	try {
		const { title, geo, city, country, is_listed } = req.body;
		const result = await db.query("INSERT INTO properties (title, geo, city, country, is_listed) VALUES ($1, POINT($2, $3), $4, $5, $6) RETURNING id", [
			title, geo.x, geo.y, city, country, is_listed
		]);
		if (result.rows.length > 0) {
			console.log("Successfully added!");
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

router.post("/property-details/new/base", async (req, res) => {
	try {
		console.log(req.body);
		const {
			property_id,
			street,
			street_no
		} = req.body;
		const queryParams = "property_id, host_id, street, street_no, created_at";
		const result = await db.query(`INSERT INTO property_details (${queryParams}) VALUES ($1, $2, $3, $4, $5) RETURNING *;`, [
			property_id, req.user.id, street, street_no, new Date().toISOString().slice(0, 10)
		]);
		if (result.rows.length > 0) {
			console.log("Successfully added!");
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
			experiences_ids,
			rating
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
			await updatePropertyDetailField(id, "images_url_array", images_url_array);
		}
		if (price !== undefined) {
			await updatePropertyDetailField(id, "price_per_night_eur", price);
		}
		if (experiences_ids !== undefined) {
			await updatePropertyDetailField(id, "experiences_ids", experiences_ids);
		}
		if (rating !== undefined) {
			await updatePropertyDetailField(id, "rating", rating);
		}
		res.status(200).send("OK");
	} catch (err) {
		console.log(err);
	}
});

export default router;