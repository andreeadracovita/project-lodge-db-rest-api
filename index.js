import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import jwt from "jsonwebtoken";
import session from "express-session";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = 3000;
// const saltRounds = 10;
env.config();

app.use(cors());

app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: true
	})
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
	user: process.env.PG_USER,
	host: process.env.PG_HOST,
	database: process.env.PG_DATABASE,
	password: process.env.PG_PASSWORD,
	port: process.env.PG_PORT
});
db.connect();

passport.use("local", new Strategy(
	{
		usernameField: "email",
		passwordField: "password"
	},
	async function verify(username, password, cb) {
		try {
			const result = await db.query("SELECT * FROM users WHERE email = $1", [
				username
			]);
			if (result.rows.length > 0) {
				const user = result.rows[0];
				if (user.password === password) {
					return cb(null, user);
				} else {
					return cb(null, false);
				}
			}
		} catch (err) {
			console.log(err);
		}
	})
);
let opts = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: process.env.SECRET
};
passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
	User.findOne({id: jwt_payload.sub}, function(err, user) {

		if (err) {
			return done(err, false);
		}

		if (user) {
			return done(null, user);
		} else {
			return done(null, false);
		}
	})
}));

passport.serializeUser((user, cb) => {
	cb(null, user);
});
passport.deserializeUser((user, cb) => {
	cb(null, user);
});

// Users
app.get("/user/exists/:email", async (req, res) => {
	const email = req.params.email;
	try {
		const result = await db.query("SELECT * FROM users WHERE email = $1", [
			email
		]);
		if (result.rows.length > 0) {
			res.json({ userExists: true });
		} else {
			res.json({ userExists: false });
		}
	} catch (err) {
		console.log(err);
		res.status(500).send("Error connecting to db");
	}
});

app.post("/user/login", function(req, res, next) {
	passport.authenticate("local", { session: false }, function(err, user, info) {
		if (err || !user) {
			return res.status(400).json({ message: "Something went wrong", user: user });
		}
		req.login(user, { session: false }, function(err) {
			if (err) {
				res.send(err);
			}
			const token = jwt.sign(user, process.env.SECRET, { expiresIn: "1h" });
			return res.json({ user, token });
		});
	})(req, res);
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
app.get("/building_types", async (req, res) => {
	try {
		const result = await db.query("SELECT * FROM property_types");
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

// Rental Types
app.get("/rental_types", async (req, res) => {
	try {
		const result = await db.query("SELECT * FROM rental_types");
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

// Features
app.get("/features", async (req, res) => {
	try {
		const result = await db.query("SELECT * FROM features");
		res.json(result.rows);
	} catch (err) {
		console.log(err);
	}
});

app.listen(port, () => {
	console.log(`Backend server running on port ${port}`);
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

const reviews = [];

const messages = [];

const bookings = [];