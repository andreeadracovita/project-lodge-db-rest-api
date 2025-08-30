import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import env from "dotenv";
import db from "./db/db.js";

env.config();

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
				const storedHashedPassword = user.password;
				bcrypt.compare(password, storedHashedPassword, (err, valid) => {
					if (err) {
						console.error("Error comparing passwords:", err);
						return cb(err);
					} else {
						if (valid) {
							return cb(null, user);
						} else {
							return cb(null, false);
						}
					}
				});
			}
		} catch (err) {
			return cb(err);
		}
	})
);

let opts = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // ExtractJwt.fromHeader("authorization")
	secretOrKey: process.env.SECRET
};
passport.use(new JwtStrategy(opts, async function(jwtPayload, cb) {
	try {
		const result = await db.query("SELECT * FROM users WHERE id = $1", [
			jwtPayload.id
		]);
		if (result.rows.length > 0) {
			const user = result.rows[0];
			return cb(null, user);
		}
	} catch (err) {
		return cb(err);
	}
}));

passport.serializeUser((user, cb) => {
	cb(null, user);
});
passport.deserializeUser((user, cb) => {
	cb(null, user);
});