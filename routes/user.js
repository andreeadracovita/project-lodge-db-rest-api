import express from "express";
import db from "../db/db.js";

const router = express.Router();

router.get("/config/:email", (req, res) => {
	res.json({ img_url: "00000001.jpg", currency: "CHF", language: "de-CH" });
});

export default router;