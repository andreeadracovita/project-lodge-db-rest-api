import express from "express";
import multer, { MulterError } from "multer";
import path from "path";
import uniqueFilename from "unique-filename";
import imageType, { minimumBytes } from "image-type";
import { readChunk } from "read-chunk";
import sharp from "sharp";

import { storagePath } from "../constants.js";

const router = express.Router();

// Multer Configuration
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, storagePath);
	},
	filename: (req, file, cb) => {
		cb(null, uniqueFilename("") + "-" + Date.now() + ".jpg");
	}
});

const upload = multer({
	fileFilter: (req, file, cb) => {
		if (file.mimetype !== "image/png" && file.mimetype !== "image/jpg" && file.mimetype !== "image/jpeg") {
			return cb(new MulterError("LIMIT_INVALID_TYPE"));
		}
		cb(null, true);
	},
	limits: { fileSize: 6 * 1024 * 1024 },
	// storage,
	storage: multer.memoryStorage(),
});

router.post("/photos", upload.array("photos", 12), function (req, res) {
  // req.files is array of `photos` files
  // req.body will contain the text fields, if there were any
	if (!req.files) {
		return res.status(400).json({ error: "No file uploaded" });
	}
	res.json({ message: "File uploaded successfully", filenames: req.files.map(file => file.filename) });
});

const uploadAvatarHandler = (req, res, next) => {
	const foo = upload.single("avatar");
	foo(req, res, async (err) => {
		if (err) {
			try {
				switch (err.code) {
					case "LIMIT_INVALID_TYPE":
						throw new Error("Invalid file type! Only PNG and JPEG are allowed");

					case "LIMIT_FILE_SIZE":
						throw new Error("File size is too large! Max size is 2MB");

					default:
						throw new Error("Something went wrong!");
				}
			} catch (err) {
				res.status(400).json({ message: err.message });
				return;
			}
		}

		try {
			const filename = uniqueFilename("") + "-" + Date.now() + ".jpg";
			const saveTo = storagePath;
			const filePath = saveTo + filename;

			await sharp(req.file.buffer)
				.resize({ height: 600, fit: "contain" })
				.jpeg({ quality: 30 })
				.toFile(filePath);

			req.file.filename = filename;
			next();
		} catch (err) {
			res.status(400).json({ message: err.message });
			return;
		}
	})
}

router.post("/avatar", uploadAvatarHandler, (req, res) => { // upload.single("avatar")
	if (!req.file) {
		return res.status(400).json({ error: "No file uploaded" });
	}
	res.json({ message: "File uploaded successfully", filename: req.file.filename });
});

export default router;