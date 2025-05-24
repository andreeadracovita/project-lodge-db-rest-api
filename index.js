import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
// import pg from "pg";

const app = express();
const port = 3000;
// const saltRounds = 10;

app.use(cors()); // Enable CORS

app.use(
	session({
		secret: "MYSECRET",
		resave: false,
		saveUninitialized: true
	})
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(passport.initialize());
app.use(passport.session());

// Users
app.get("/user/:email", (req, res) => {
	const email = req.params.email;
	if (users.find(user => user.email === req.params.email)) {
		res.status(200).send("OK");
		return;
	}
	res.status(404).send("User does not exist");
});

app.post(
	"/user/login",
	passport.authenticate("local", {
		failWithError: true
	}), function(req, res, next) {
		// Handle success
		res.status(200).send("OK");
	},
	function(err, req, res, next) {
		res.status(401).send("Unauthorized");
	}
);

passport.use("local", new Strategy(
	{
		usernameField: "email",
		passwordField: "password"
	},
	 function verify(username, password, cb) {
		const foundUser = users.find(user => user.email === username);
		if (foundUser) {
			if (foundUser.password === password) {
				return cb(null, foundUser);
			} else {
				return cb(null, false);
			}
		} else {
			return cb("User not found.");
		}
	})
);

passport.serializeUser((user, cb) => {
	cb(null, user);
});
passport.deserializeUser((user, cb) => {
	cb(null, user);
});

// Properties
// GET properties
app.get("/properties", (req, res) => {
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
app.get("/properties/:id", (req, res) => {
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

// Building Types
app.get("/building_types", (req, res) => {
	res.json(building_types);
});

// Rental Types
app.get("/rental_types", (req, res) => {
	res.json(rental_types);
});

// Features
app.get("/features", (req, res) => {
	res.json(features);
});

app.listen(port, () => {
	console.log(`Backend server running on port ${port}`);
});

const users = [
	{
		id: 1,
		email: "abc@abc.com",
		password: "pass"
	},
	{
		id: 2,
		email: "def@def.com",
		password: "password"
	}
];

const user_details = [
	{
		user_id: 1,
		first_name: "Sweeney",
		last_name: "Todd",
		created_at: "2025-01-01",
		img_url: null
	},
	{
		user_id: 2,
		first_name: "Jane",
		last_name: "Doe",
		created_at: "2024-09-05",
		img_url: "00000002_1.jpg"
	}
];

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

const building_types = [
	{
		id: 1,
		name: "Cabin"
	},
	{
		id: 2,
		name: "Hotel"
	},
	{
		id: 3,
		name: "Apartment"
	},
	{
		id: 4,
		name: "Villa"
	},
	{
		id: 5,
		name: "Chalet"
	},
	{
		id: 6,
		name: "Ryokan"
	},
	{
		id: 7,
		name: "Bnb"
	}
];

const rental_types = [
	{
		id: 1,
		name: "Room"
	},
	{
		id: 2,
		name: "Entire place"
	}
];

const features = [
	{
		id: 1,
		name: "Free WiFi"
	},
	{
		id: 2,
		name: "Free parking"
	},
	{
		id: 3,
		name: "Kitchen"
	},
	{
		id: 4,
		name: "Lake view"
	},
	{
		id: 5,
		name: "Sea view"
	},
	{
		id: 6,
		name: "Mountain view"
	},
	{
		id: 7,
		name: "BBQ grill"
	},
	{
		id: 8,
		name: "Gym equipment"
	},
	{
		id: 9,
		name: "TV"
	}
];

const reviews = [];

const messages = [];

const bookings = [];