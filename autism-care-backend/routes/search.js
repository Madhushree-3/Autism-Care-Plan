const express = require('express');
const autAxios = require('axios');
const autSearchHistory = require('../models/SearchHistory'); 
const { protect } = require('../middleware/authMiddleware');
const autRouter = express.Router();
require('dotenv').config();

const AUT_GGL_API_KEY = process.env.AUT_GGL_API_KEY;
const AUT_CX = process.env.CX;

autRouter.get('/searchOnline', protect, async (req, res) => {
  const autQuery = req.query.query;
  const autNumResults = parseInt(req.query.numResults) || 10;
  const autStartIndex = parseInt(req.query.startIndex) || 1;

  if (!autQuery || !AUT_GGL_API_KEY || !AUT_CX) {
    return res.status(400).json({ message: 'Missing required query parameters or API credentials' });
  }
  
  try {
    const autResponse = await autAxios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: AUT_GGL_API_KEY,
        cx: AUT_CX,
        q: autQuery,
        num: autNumResults,
        start: autStartIndex,
      },
    });
    
    const autSearchResults = autResponse.data.items || [];
    const autTotalResults = autResponse.data.searchInformation.totalResults || 0;
    res.json({ searchResults: autSearchResults, totalResults: autTotalResults });
  } catch (autError) {
    console.error('Error fetching search results:', autError.response ? autError.response.data : autError.message);
    res.status(500).json({ message: 'Error fetching search results', error: autError.response ? autError.response.data : autError.message });
  }
});

//---------------------------------save the visited link---------------------------------------------------------
autRouter.post('/saveVisitedPage', protect, async (req, res) => {
  try {
    const { url, title } = req.body;
    const autCaretakerId = req.user._id; 

    const autVisitedPage = new autSearchHistory({
      caretakerId: autCaretakerId,
      query: '', 
      type: 'visited',
      url,
      title,
    });

    await autVisitedPage.save();
    res.status(201).json(autVisitedPage);
  } catch (autError) {
    console.error('Error saving visited page:', autError);
    res.status(500).json({ message: 'Error saving visited page' });
  }
});

// -----------------------fetch recently visited links---------------------------------------------------
autRouter.get('/recentlyVisited', protect, async (req, res) => {
  try {
    const autRecentlyVisited = await autSearchHistory.find({ caretakerId: req.user._id, type: 'visited' }).sort({ timestamp: -1 }).limit(10);
    res.json(autRecentlyVisited);
  } catch (autError) {
    console.error('Error fetching recently visited:', autError);
    res.status(500).json({ message: 'Error fetching recently visited' });
  }
});

//----------------------clear all history -------------------------------------------------------
autRouter.delete('/clearHistory', protect, async (req, res) => {
  try {
    await autSearchHistory.deleteMany({ caretakerId: req.user._id });
    res.status(200).json({ message: 'History cleared successfully' });
  } catch (autError) {
    console.error('Error clearing history:', autError);
    res.status(500).json({ message: 'Error clearing history' });
  }
});

module.exports = autRouter;

