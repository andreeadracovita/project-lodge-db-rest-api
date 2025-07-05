import express from "express";
import jwt from "jsonwebtoken";
import passport from "passport";

import db from "../db/db.js";
import { validateEmail, validatePassword } from "../utils/utils.js";

const router = express.Router();

// POST /auth/exists
router.post("/exists", async (req, res) => {
	const email = req.body.email;
	if (!email || email === "") {
		return res.json({ errors: ["Email field cannot be empty"]});
	}

	if (validateEmail(email) === false) {
		return res.json({ errors: ["Input is not an email"]});
	}

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

// POST /auth/login
router.post("/login", function(req, res, next) {
	passport.authenticate("local", { session: false }, (err, user, info) => {
		if (err || !user) {
			return res.status(400).json({ message: "Authentication failed", user: user });
		}
		req.login(user, { session: false }, (err) => {
			if (err) {
				res.send(err);
			}
			const token = jwt.sign(user, process.env.SECRET);
			const userResponse = {
				email: user.email
			}
			return res.json({ userResponse, token });
		});
	})(req, res);
});

// POST /auth/signup
router.post("/signup", async (req, res) => {
	const { email, password, first_name, last_name } = req.body;
	// Validate input
	if (!email || !password || !first_name || !last_name) {
		return res.json({ errors: ["Fill in all mandatory fields (marked with *)"]});
	}
	if (email.length > 50) {
		return res.json({ errors: ["Email exceeds 50 characters"]});
	}
	if (validateEmail(email) === false) {
		return res.json({ errors: ["Input is not an email"]});
	}
	if (password.length > 50) {
		return res.json({ errors: ["Password exceeds 50 characters"]});
	}
	if (first_name.length > 50) {
		return res.json({ errors: ["First name exceeds 50 characters"]});
	}
	if (last_name.length > 50) {
		return res.json({ errors: ["Last name exceeds 50 characters"]});
	}

	const passwordValidationErrors = validatePassword(password, first_name, last_name);
	if (passwordValidationErrors.length > 0) {
		return res.json({ errors: passwordValidationErrors });
	}

  try {
		const resultUsers = await db.query("INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *", [
			email, password
		]);
		if (resultUsers.rows.length === 1) {
			const userId = resultUsers.rows[0].id;
			const resultUserDetails = await db.query("INSERT INTO user_details (user_id, first_name, last_name, created_at) VALUES ($1, $2, $3, $4)", [
				userId, first_name, last_name, new Date().toISOString().slice(0, 10)
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