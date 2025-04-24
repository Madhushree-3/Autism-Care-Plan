
const axios = require('axios');

const autGetCoordinates = async (autAddress) => {
  try {
    const autResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: autAddress,
        key: process.env.AUT_MAPS_API_KEY
      }
    });
    const autLocation = autResponse.data.results[0].geometry.location;
    return { lat: autLocation.lat, lng: autLocation.lng };
  } catch (autError) {
    console.error('Error fetching coordinates:', autError);
    return null;
  }
};

module.exports = autGetCoordinates;
