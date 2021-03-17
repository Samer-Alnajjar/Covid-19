'use strict';

// Import packages
const express = require("express");
const superagent = require("superagent");
const cors = require("cors");
const pg = require("pg"); 
const methodOverride = require("method-override");
require("dotenv").config();

// Configure packages
const app = express();
const PORT = process.env.PORT;
app.use(cors());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });


// Routes

app.get("/", handleHome);

app.get("/getCountryResult", handleCountryData);
// This sometimes doesn't work :(.
app.get("/AllCountries", handleCountriesData);

app.post("/MyRecords", handleStore);

app.get("/MyRecords", handleRecords);

app.get("/RecordDetails/:id", handleDetails);

app.delete("/RecordDetails/:id", handleDelete);


// Functions

function handleHome(req, res) {
  let url = "https://api.covid19api.com/world/total";

  superagent.get(url)
    .then(data => {
      let worldData = data.body;
      let object = new World(worldData)
      res.render("index", {data : object});

     })
    .catch(error => {
      console.log('ERROR WHILE GETTING WORLD STATISTICS', error)
    })
}

function handleCountryData(req, res) {
  let searchQuery = req.query;

  let query = {
    from: searchQuery.start, 
    to: searchQuery.end
  }

  let url =`https://api.covid19api.com/country/${searchQuery.country}/status/confirmed`;

  superagent.get(url).query(query)
    .then(data => {
      let countryData = data.body;
      let arrayOfObject = [];

      arrayOfObject =  countryData.map(data => {
        return new Country(data);
      })
      res.render("pages/getCountryResult", {data : arrayOfObject});
     })
    .catch(error => {
      console.log('ERROR WHILE GETTING THE COUNTRY DATA', error)
    })
}

function handleCountriesData(req, res) {
  let url ="https://api.covid19api.com/summary";

  superagent.get(url)
    .then(data => {
      let countriesData = data.body.Countries;
      let arrayOfObject = [];

      arrayOfObject = countriesData.map(data => {
        return new AllCountries(data)
      });
      res.render("pages/All Countries", {data : arrayOfObject});
     })
    .catch(error => {
      console.log('ERROR WHILE GETTING THE ALL COUNTRIES API DATA', error)
    })
}

function handleStore(req, res) {
  let data = req.body;
  
  let query = "INSERT INTO covid(country, totalconfirmed, totaldeaths, totalrecovered, date) VALUES ($1, $2, $3, $4, $5) returning *;";
  let safeValues = [data.country, data.totalconfirmed, data.totaldeaths, data.totalrecovered, data.date];

  client.query(query, safeValues)
      .then(data => {
        res.redirect("/MyRecords");
      })
      .catch(error => {
      console.log('ERROR WHILE STORING DATA INTO DATABASE ', error)
      })
}

function handleRecords(req, res) {
  let query = "select * from covid;";

  client.query(query)
      .then(data => {
        res.render("pages/My Records", {data: data.rows});
      })
      .catch(error => {
      console.log('', error)
      })
}

function handleDetails(req, res) {
  let id = req.params.id;

  let query = "select * from covid where id=$1;";

  client.query(query, [id])
      .then(data => {
        res.render("pages/Record Details", {data : data.rows[0]});
      })
      .catch(error => {
      console.log('ERROR WHILE GETTING DETAILS', error)
      })
}

function handleDelete(req, res) {
  let id = req.params.id;

  let query = "DELETE FROM covid WHERE id=$1;";

  client.query(query, [id])
      .then(data => {
        res.redirect("/MyRecords");
      })
      .catch(error => {
      console.log('ERROR WHILE DELETING FROM DATABASE', error)
      })
}

// Constructors


function World(data) {
  this.TotalConfirmed = data.TotalConfirmed;
  this.TotalDeaths = data.TotalDeaths;
  this.TotalRecovered = data.TotalRecovered;
}

function Country(data) {
  this.date = data.Date;
  this.cases = data.Cases;
}

function AllCountries(data) {
  this.country = data.Country;
  this.totalconfirmed = data.TotalConfirmed;
  this.totaldeaths = data.TotalDeaths;
  this.totalrecovered = data.TotalRecovered;
  this.date = data.Date;
}






















// Server listening 

client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log("THE SERVER IS LISTENING TO PORT ", PORT);
    })
  })
  .catch(error => {
    console.log("ERROR WHILE CONNECTING TO DATABASE", error);
  })
