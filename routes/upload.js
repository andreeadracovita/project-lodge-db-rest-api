import express from "express";
import multer from "multer";
import uniqueFilename from "unique-filename";
import imageType, { minimumBytes } from "image-type";
import { readChunk } from "read-chunk";

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
	storage,
	limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
    	// TODO: improve security
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            cb(null, true);
        } else {
            cb(null, false);
            const err = new Error("Only .png, .jpg and .jpeg format allowed!");
            err.name = "ExtensionError";
            return cb(err);
        }
    }
});

router.post("/photos", upload.array("photos", 12), function (req, res, next) {
  // req.files is array of `photos` files
  // req.body will contain the text fields, if there were any
	if (!req.files) {
		return res.status(400).json({ error: "No file uploaded" });
	}
	res.json({ message: "File uploaded successfully", filenames: req.files.map(file => file.filename) });
});

router.post("/avatar", upload.single("avatar"), (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: "No file uploaded" });
	}
	res.json({ message: "File uploaded successfully", filename: req.file.filename });
});

export default router;