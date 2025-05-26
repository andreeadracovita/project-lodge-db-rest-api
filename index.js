import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import jwt from "jsonwebtoken";
import session from "express-session";
import env from "dotenv";

import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import propertiesRouter from "./routes/properties.js";
import typesRouter from "./routes/types.js";

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

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/properties", propertiesRouter);
app.use("/types", typesRouter);

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
			return cb(err);
		}
	})
);

let opts = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: process.env.SECRET
};
passport.use(new JwtStrategy(opts, function(jwtPayload, cb) {
	User.findOneById(jwtPayload.id)
		.then(user => {
			return cb(null, user);
		})
		.catch(err => {
			return cb(err);
		});
}));

passport.serializeUser((user, cb) => {
	cb(null, user);
});
passport.deserializeUser((user, cb) => {
	cb(null, user);
});

app.listen(port, () => {
	console.log(`Backend server running on port ${port}`);
});