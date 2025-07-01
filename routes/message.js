import express from "express";

import db from "../db/db.js";

const router = express.Router();

// GET all bookings associated with current user:
// Select on bookings where
// guests are identifies by id
// hosts are identified by email
// include last message (to be trimmed), property first image
// router.get("/conversations");

// GET all messages for a booking id

// POST message associated with booking id

// PATCH message content

// DELETE message

export default router;