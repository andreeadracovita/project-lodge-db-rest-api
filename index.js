import bodyParser from "body-parser";
import cors from "cors";
import env from "dotenv";
import express from "express";
import path from "path";
import passport from "passport";
import session from "express-session";

import "./passport.js";
import { initDB } from "./db/db.js";
import authRouter from "./routes/auth.js";
import bookingRouter from "./routes/booking.js";
import hostRouter from "./routes/host.js";
import miscRouter from "./routes/misc.js";
import propertyRouter from "./routes/property.js";
import reviewRouter from "./routes/review.js";
import typesRouter from "./routes/types.js";
import uploadRouter from "./routes/upload.js";
import userRouter from "./routes/user.js";

const app = express();

env.config();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: true
	})
);

app.use(express.static("public/file_storage"));
app.use(express.static("public/images"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/auth", authRouter);
app.use("/booking", bookingRouter);
app.use("/host", passport.authenticate('jwt', {session: false}), hostRouter);
app.use("/misc", miscRouter);
app.use("/property", propertyRouter);
app.use("/review", passport.authenticate('jwt', {session: false}), reviewRouter);
app.use("/types", typesRouter);
app.use("/upload", passport.authenticate('jwt', {session: false}), uploadRouter);
app.use("/user", passport.authenticate('jwt', {session: false}), userRouter);

initDB();

app.listen(port, () => {
	console.log(`Backend server running on port ${port}`);
});