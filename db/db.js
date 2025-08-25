import env from "dotenv";
import fs from "fs";
import pg from "pg";

env.config();

const db = new pg.Client({
	user: process.env.PG_USER,
	host: process.env.PG_HOST,
	database: process.env.PG_DATABASE,
	password: process.env.PG_PASSWORD,
	port: process.env.PG_PORT
});

db.connect();

export async function initDB() {
	// Check if any table exists
	const existsQuery = `
		SELECT EXISTS (
		    SELECT 1
		    FROM information_schema.tables
		    WHERE table_schema = 'public'
		    AND table_name = 'properties'
		);
	`;
	const result = await db.query(existsQuery, []);
	if (result.rows.length === 1 && result.rows[0].exists === false) {
		console.log("Initiate tables because they do not exist...");
		const createTablesQuery = fs.readFileSync("db/createTables.sql", "utf8");
		await db.query(createTablesQuery, []);
	} else {
		console.log("Tables exist, nothing to do.");
	}
}

export default db;