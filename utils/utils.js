import db from "../db/db.js";

export async function getCompletedBookingStatusId() {
	try {
		const result = await db.query("SELECT * FROM booking_status");
		if (result.rows.length > 0) {
			const confirmedEntry = result.rows.find(entry => entry.name === "confirmed");
			if (confirmedEntry) {
				return confirmedEntry.id;
			}
			// It is a serious implementation problem if there is no confirmed booking status.
			return res.status(501).send("Confirmed booking status not implemented");

		}
		// It is a serious implementation problem if there are no entries in the table.
		return res.status(501).send("Booking status table contains no entries");
	} catch (err) {
		console.log(err);
	}
}

export function generateCode() {
	return `${Math.floor(Math.random() * 10000)}`.padStart(4, '0');
}

export function getNightsCount(checkIn, checkOut) {
	const diffTime = checkOut - checkIn;
	const diffNights = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	return diffNights;
}