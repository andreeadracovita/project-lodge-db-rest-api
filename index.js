import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import cors from "cors";
import env from "dotenv";
import express from "express";
import passport from "passport";
import session from "express-session";

import "./passport.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import propertyRouter from "./routes/property.js";
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

// app.use(passport.initialize());
// app.use(passport.session());

app.use("/auth", authRouter);
app.use("/user", passport.authenticate('jwt', {session: false}), userRouter);
app.use("/property", propertyRouter);
app.use("/types", typesRouter);

app.listen(port, () => {
	console.log(`Backend server running on port ${port}`);
});