const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

const properties = require('./json/properties.json');
// const users = require('./json/users.json');

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
  .query(`SELECT * FROM users WHERE email = $1;`, [email])
  .then((result) => {
    return Promise.resolve(result.rows[0]);
    })
    .catch((err) => {
      return null;
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
  .query(`SELECT * FROM users WHERE id = $1;`, [id])
  .then((result) => {
    return Promise.resolve(result.rows[0]);
    })
    .catch((err) => {
      return null;
    });
}
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
  .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`, [user.name, user.email, user.password])
  .then((result) => {
    return Promise.resolve(result.rows[0]);
    })
    .catch((err) => {
      return null;
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`SELECT * FROM reservations WHERE guest_id = $1 LIMIT $2;`, [guest_id, limit])
    .then((result) => {
      return Promise.resolve(result.rows);
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getAllReservations = getAllReservations;

/// Properties
/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  // Request from My Listing
  if (options.owner_id) {
    return pool
      .query(`SELECT * FROM properties WHERE owner_id = $1 LIMIT $2;`, [options.owner_id, limit])
      .then((result) => {
        return Promise.resolve(result.rows);
      })
      .catch((err) => {
        console.log(err.message);
      });
  }

  // Request from Search
  const queryParams = [];
  
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} 
    `;

    if (options.minimum_price_per_night) {
      const minPrice = options.minimum_price_per_night * 100;
      queryParams.push(`${minPrice}`);
      queryString += `AND cost_per_night BETWEEN $${queryParams.length} 
      `;
    }
  
    if (options.maximum_price_per_night) {
      const maxPrice = options.maximum_price_per_night * 100;
      queryParams.push(`${maxPrice}`);
      queryString += `AND $${queryParams.length} 
      `;
    }
  
    queryString += `GROUP BY properties.id 
    `;
  
    if (options.minimum_rating) {
      queryParams.push(`${options.minimum_rating}`);
      queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
    }
  } else {
    queryString += `GROUP BY properties.id `;
  }
  queryParams.push(limit);
  queryString += `
  LIMIT $${queryParams.length}; 
  `;
  
  return pool.query(queryString, queryParams)
    .then((res) => res.rows)
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryParams = [];
  
  let queryString = `INSERT INTO properties (title, description, number_of_bedrooms, number_of_bathrooms, parking_spaces, cost_per_night, thumbnail_photo_url, cover_photo_url, street, country, city, province, post_code, owner_id) VALUES (`;

  for (const [key, value] of Object.entries(property)) {
    queryParams.push(`${value}`);
    queryString += `$${queryParams.length}, `;
  }

  queryString = queryString.substring(0, queryString.length - 2);
  queryString += `) RETURNING *;`;

  return pool.query(queryString, queryParams)
  .then((res) => res.rows)
  .catch((err) => {
    console.log(err.message);
  });  
};
exports.addProperty = addProperty;