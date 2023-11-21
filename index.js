const express = require('express');
const cheerio = require('cheerio');
const countryStateCity = require('country-state-city');
const cors = require('cors');
const { json } = require('body-parser');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.get('/extract-values', async (req, res) => {
  // get search parameters
  try {
    let url = `https://livingcost.org/cost/`;
    const { country, state, city } = req.query;
    if (country) {
      url += `${country}/`;
    }
    if (state && country) {
      const countryCode = countryStateCity.Country.getAllCountries().find(c => country.toLowerCase() === c.name.toLowerCase()).isoCode;


      const stateCode = countryStateCity.State.getStatesOfCountry(countryCode).find(s => state.toLowerCase() === s.name.toLowerCase())?.isoCode;

      if (stateCode)
        url += `${stateCode}/`; 
    }
    if (city && state && country) {
      url += `${city}/`;
    }
    console.log("***************************************", country)
    const response = await axios.get(url);
    const html = await response.data;
    


    if (!html) {
      return res.status(400).json({ error: 'HTML is required in the request body' });
    }

    const $ = cheerio.load(html);

    async function extractValue(selector) {
      const valueString = $(selector).text().trim();
      let numericValue = parseFloat(valueString.replace(/[^\d.]/g, '')) * (valueString.includes('K')? 1000: 1);
      // to inr from usd
      const response = (await fetch(`https://v6.exchangerate-api.com/v6/${process.env.API_LINK}/latest/USD`));
      // const curr = response 
      // console.log(numericValue,response)
      return isNaN(numericValue) ? null : numericValue * 80; 
    } 

    const result = {
      totalWithRent: {  
        onePerson: await extractValue('td[headers="col total one-person"] span'),
        familyOf4: await extractValue('td[headers="col total family"] span'),
      },
      withoutRent: {
        onePerson: await extractValue('td[headers="col without-rent one-person"] span'),
        familyOf4: await extractValue('td[headers="col without-rent family"] span'),
      },
      rentAndUtilities: {
        onePerson: await extractValue('td[headers="col rent one-person"] span'),
        familyOf4: await extractValue('td[headers="col rent family"] span'),
      },
      food: {
        onePerson: await extractValue('td[headers="col food one-person"] span'),
        familyOf4: await extractValue('td[headers="col food family"] span'),
      },
      transport: {
        onePerson: await extractValue('td[headers="col transport one-person"] span'),
        familyOf4: await extractValue('td[headers="col transport family"] span'),
      },
      monthlySalaryAfterTax: await extractValue('td[headers="salary"] span'),
      qualityOfLife: await extractValue('td[headers="quality"] span'),
      population: await extractValue('td[headers="population"] span'),
    };

    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.port || port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
