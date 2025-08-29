CREATE TABLE IF NOT EXISTS features (
	id SERIAL PRIMARY KEY,
	name VARCHAR(50) NOT NULL
);
INSERT INTO features
VALUES (1, 'free WiFi'), (2, 'free parking'), (3, 'garden'), (4, 'kitchen'), (5, 'AC'), (6, 'hot tub/Jacuzzi'),
(7, 'tea/coffee maker'), (8, 'refrigerator'), (9, 'TV'), (10, 'free parking'), (11, 'garden view'), (12, 'sea view'),
(13, 'lake view'), (14, 'mountain view'), (15, 'gym equipment'), (16, 'dedicated workspace'), (17, 'BBQ facilities'),
(18, 'pets allowed');

CREATE TABLE IF NOT EXISTS experiences (
	id SERIAL PRIMARY KEY,
	name VARCHAR(50)
);
INSERT INTO experiences
VALUES (1, 'adventure'), (2, 'beach'), (3, 'culture'), (4, 'entertainment'), (5, 'nature'), (6, 'sports'),
(7, 'social'), (8, 'food');

CREATE TABLE IF NOT EXISTS rental_types (
	id SERIAL PRIMARY KEY,
	name VARCHAR(50) NOT NULL
);
INSERT INTO rental_types
VALUES (1, 'room'), (2, 'entire place');

CREATE TABLE IF NOT EXISTS property_types (
	id SERIAL PRIMARY KEY,
	name VARCHAR(50) NOT NULL,
	img_url VARCHAR(50) NOT NULL
);
INSERT INTO property_types
VALUES (1, 'hotel', 'hotel.jpg'), (2, 'apartment', 'apartment.jpg'), (3, 'villa', 'villa.jpg'), (4, 'cabin', 'cabin.jpg'),
(5, 'chalet', 'chalet.jpg'), (6, 'ryokan', 'ryokan.jpg'), (7, 'bnb', 'bnb.jpg');

CREATE TABLE IF NOT EXISTS booking_status (
	id SERIAL PRIMARY KEY,
	name VARCHAR(20) NOT NULL
);
INSERT INTO booking_status
VALUES (1, 'pending'), (2, 'confirmed'), (3, 'cancelled');

CREATE TABLE IF NOT EXISTS users (
	id SERIAL PRIMARY KEY,
	email VARCHAR(50) NOT NULL,
	password VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_details (
	user_id INTEGER REFERENCES users(id),
	first_name VARCHAR(50) NOT NULL,
	last_name VARCHAR(50) NOT NULL,
	created_at DATE NOT NULL,
	img_url VARCHAR(50),
	experiences_ids INTEGER[],
	currency VARCHAR(3),
	language VARCHAR(5),
	country_code VARCHAR(2)
);

CREATE TABLE IF NOT EXISTS properties (
	id SERIAL PRIMARY KEY,
	title VARCHAR(50) NOT NULL,
	geo POINT NOT NULL,
	city VARCHAR(50) NOT NULL,
	country VARCHAR(2) NOT NULL,
	is_listed BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS property_details (
	property_id INTEGER NOT NULL REFERENCES properties(id),
	host_id INTEGER NOT NULL REFERENCES users(id),
	created_at DATE NOT NULL,
	street VARCHAR(50) NOT NULL,
	street_no VARCHAR(10) NOT NULL,
	local_currency VARCHAR(3) NOT NULL,
	description TEXT,
	guests INTEGER,
	beds INTEGER,
	bedrooms INTEGER,
	bathrooms INTEGER,
	features_ids INTEGER[],
	building_type_id INTEGER REFERENCES property_types(id),
	rental_type_id INTEGER REFERENCES rental_types(id),
	images_url_array VARCHAR[],
	price_night NUMERIC(10,2),
	experiences_ids INTEGER[],
	rating FLOAT,
	reviews_no INTEGER
);

CREATE TABLE IF NOT EXISTS bookings (
	id SERIAL PRIMARY KEY,
	email VARCHAR(50) NOT NULL,
	property_id INTEGER NOT NULL REFERENCES properties(id),
	first_name VARCHAR(50) NOT NULL,
	last_name VARCHAR(50) NOT NULL,
	guest_address VARCHAR(50) NOT NULL,
	guest_city VARCHAR(50) NOT NULL,
	guest_country VARCHAR(50) NOT NULL,
	guest_phone_no VARCHAR(50) NOT NULL,
	check_in DATE NOT NULL,
	check_out DATE NOT NULL,
	guests INTEGER NOT NULL,
	booking_status_id INTEGER NOT NULL REFERENCES booking_status(id),
	pin VARCHAR(4) NOT NULL,
	amount NUMERIC(10,2) NOT NULL,
	currency VARCHAR(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
	id SERIAL PRIMARY KEY,
	booking_id INTEGER REFERENCES bookings(id),
	property_id INTEGER REFERENCES properties(id),
	user_id INTEGER REFERENCES users(id),
	title VARCHAR(80),
	body TEXT,
	rating INTEGER NOT NULL CHECK (rating > 0 AND rating < 6),
	created_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist (
	user_id INTEGER REFERENCES users(id),
	property_id INTEGER REFERENCES properties(id)
);

CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $dist$
    DECLARE
        dist float = 0;
        radlat1 float;
        radlat2 float;
        theta float;
        radtheta float;
    BEGIN
        IF lat1 = lat2 AND lon1 = lon2
            THEN RETURN dist;
        ELSE
            radlat1 = pi() * lat1 / 180;
            radlat2 = pi() * lat2 / 180;
            theta = lon1 - lon2;
            radtheta = pi() * theta / 180;
            dist = sin(radlat1) * sin(radlat2) + cos(radlat1) * cos(radlat2) * cos(radtheta);

            IF dist > 1 THEN dist = 1; END IF;

            dist = acos(dist);
            dist = dist * 180 / pi();
            dist = dist * 60 * 1.1515;
			dist = dist * 1.609344;
            RETURN dist;
        END IF;
    END;
$dist$ LANGUAGE plpgsql;

CREATE EXTENSION IF NOT EXISTS unaccent;