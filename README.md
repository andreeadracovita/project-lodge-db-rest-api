# Lodge Backend REST API

Backend service used by [Lodge Frontend](https://github.com/andreeadracovita/project-lodge) to interact with the database and external APIs.

## Project Setup

`npm install && node index.js` 

## Database Diagram

[Link to database diagram](docs/db-diagram.pdf)

## Additional APIs

- [Geocode](https://geocode.maps.co/) - to extract GPS coordinates from addresses
- [FreeCurrencyAPI](https://freecurrencyapi.com/) - to fetch the latest currency exchange rate, in order to show users prices in their preferred currency

## Temporary use for storage

The `public` folder is used to store images from user uploads and permanent images for database registered urls. This is a temporary, non-scalable approach for demo purposes.

## API documentation
[Link](https://project-lodge-backend.onrender.com/)