import express from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import db from "../db/db.js";

const router = express.Router();

router.get("/exists/:email", async (req, res) => {
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

router.post("/login", function(req, res, next) {
	passport.authenticate("local", { session: false }, (err, user, info) => {
		if (err || !user) {
			return res.status(400).json({ message: "Something went wrong", user: user });
		}
		req.login(user, { session: false }, (err) => {
			if (err) {
				res.send(err);
			}
			const token = jwt.sign(user, process.env.SECRET); // { expiresIn: "1h" }
			const userResponse = {
				email: user.email
			}
			return res.json({ userResponse, token });
		});
	})(req, res);
});

router.post("/signup", async (req, res) => {
  try {
		const resultUsers = await db.query("INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *", [
			req.body.email, req.body.password
		]);
		if (resultUsers.rows.length) {
			const userId = resultUsers.rows[0].id;
			const resultUserDetails = await db.query("INSERT INTO user_details (user_id, first_name, last_name, created_at) VALUES ($1, $2, $3, $4)", [
				userId, req.body.first_name, req.body.last_name, new Date().toISOString().slice(0, 10)
			]);

			return res.status(200).send("Sign up successful");
		}
	} catch (err) {
		console.log(err);
		res.status(500).send("Error connecting to db");
	}

  // const token = jwt.sign(user, process.env.SECRET, { expiresIn: "1h" });
  // res.json(token);

  // ...
});

export default router;