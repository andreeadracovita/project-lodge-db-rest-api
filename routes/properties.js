import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
	// Dummy data simulating table join
	const responseData = [];
	properties.forEach(p => {
		const foundPropertyDetail = property_details.find(pd => pd.property_id === p.id);
		if (p.is_listed) {
			responseData.push({
				...p,
				price: foundPropertyDetail ? foundPropertyDetail.price_per_night_eur : 0,
				img_url: foundPropertyDetail ? foundPropertyDetail.images_url_array[0] : null,
				rating: foundPropertyDetail ? foundPropertyDetail.rating : 0
			});
		}
	});
	res.json(responseData);
});

// GET property with id
router.get("/:id", (req, res) => {
	const id = parseInt(req.params.id);
	const foundProperty = properties.find(p => p.id === id);
	const foundPropertyDetail = property_details.find(pd => pd.property_id === id);
	let responseData = {};
	if (foundProperty && foundPropertyDetail) {
		responseData = {
			...foundProperty,
			price: foundPropertyDetail.price_per_night_eur,
			street: foundPropertyDetail.street,
			street_no: foundPropertyDetail.street_no,
			description: foundPropertyDetail.description,
			guests: foundPropertyDetail.guests,
			beds: foundPropertyDetail.beds,
			bathrooms: foundPropertyDetail.bathrooms,
			features_ids: foundPropertyDetail.features_ids,
			images_url_array: foundPropertyDetail.images_url_array,
			rating: foundPropertyDetail.rating
		}
	}
	res.json(responseData);
});

const properties = [
	{
		id: 1,
		title: "Sea Voyager Villa",
		geo: [40.62617383681707, 14.498273742410621],
		city: "Positano",
		country: "Italy",
		is_listed: true
	},
	{
		id: 2,
		title: "Aurora Cottage",
		geo: [65.54850691798407, -19.436812415122823],
		city: "Varmahlíð",
		country: "Iceland",
		is_listed: true
	},
	{
		id: 3,
		title: "Chalet Edelweiss",
		geo: [46.628050423092084, 8.03273395337422],
		city: "Grindelwald",
		country: "Switzerland",
		is_listed: true
	}
];

const property_details = [
	{
		property_id: 1,
		host_id: 1,
		created_at: "2023-09-01",
		street: "Via Arienzo",
		street_no: "74",
		description: "A gorgeous cosy villa by the sea. Offers seafront views, a fully equipped kitchen and spacious patio to enjoy the sunset.",
		guests: 5,
		beds: 3,
		bathrooms: 2,
		features_ids: [1, 2, 3, 4],
		building_type_id: 7,
		rental_type_id: 2,
		price_per_night_eur: 270,
		images_url_array: [
			"00000001_1.jpg",
			"00000001_2.jpg",
			"00000001_3.jpg",
			"00000001_4.jpg",
			"00000001_5.jpg"
		],
		rating: 4.65
	},
	{
		property_id: 2,
		host_id: 2,
		created_at: "2024-09-01",
		street: "Vegamót",
		street_no: "560",
		description: "Enjoy the northern lights in this spacious wooden cabin. Features a heated pool in nature.",
		guests: 3,
		beds: 2,
		bathrooms: 1,
		features_ids: [3, 5, 6, 7],
		building_type_id: 1,
		rental_type_id: 2,
		price_per_night_eur: 190,
		images_url_array: [
			"00000002_1.jpg",
			"00000002_2.jpg",
			"00000002_3.jpg",
			"00000002_4.jpg",
			"00000002_5.jpg"
		],
		rating: 5.00
	},
	{
		property_id: 3,
		host_id: 1,
		created_at: "2025-02-17",
		street: "Terrassenweg",
		street_no: "52",
		description: "A dream chalet in the Alps. Excellent location for hike starts and relaxing vacations.",
		guests: 6,
		beds: 4,
		bathrooms: 2,
		features_ids: [1, 4, 6],
		building_type_id: 5,
		rental_type_id: 2,
		price_per_night_eur: 220,
		images_url_array: [
			"00000003_1.jpg",
			"00000003_2.jpg",
			"00000003_3.jpg",
			"00000003_4.jpg",
			"00000003_5.jpg"
		],
		rating: 4.95
	},
];

export default router;