import express from "express";
import multer from "multer";
import uniqueFilename from "unique-filename";

const router = express.Router();

// Multer Configuration
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "file_storage/");
	},
	filename: (req, file, cb) => {
		cb(null, uniqueFilename("") + ".jpg");
	}
});

const upload = multer({ storage });

router.post("/", upload.single("file"), (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: "No file uploaded" });
	}
	console.log(req.file.filename);
	res.json({ message: "File uploaded successfully", filename: req.file.filename });
});

export default router;