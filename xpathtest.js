var express = require('express');
var router = express.Router();
var fs = require('fs');
var request = require('request');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var cheerio = require('cheerio');
var Peepub   = require('pe-epub');

var dateNow = function() {
  var dateNow = new Date();
  var dd = dateNow.getDate();
  var monthSingleDigit = dateNow.getMonth() + 1,
  mm = monthSingleDigit < 10 ? '0' + monthSingleDigit : monthSingleDigit;
  var yy = dateNow.getFullYear().toString();
  return (yy + '-' + mm + '-' + dd);
};

function doIt(){

  var url = "https://www.federalregister.gov/articles/2013/08/19/2013-18956/medicare-program-hospital-inpatient-prospective-payment-systems-for-acute-care-hospitals-and-the";

  var fileName = 'public/temp.html';

  request(url, function(error, response, html){
    if(!error) {
      var $ = cheerio.load(html);
      $('#content_area .table_of_contents').remove();
      $('#content_area #table_of_contents').remove();
      $('#content_area .table_of_tables').remove();
      $('#content_area #table_of_tables').remove();
      var source = $('#content_area').html();
      console.log(source);
      fs.writeFileSync("xpathTest.html", source);
    }
  });
}

doIt();

