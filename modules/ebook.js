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
//  fs.readFile(fileName, function(error, html){
    if(!error) {
      var $ = cheerio.load(html);
      var source = $('.article').html();

      //building the doc
      var doc = "";
      var uid = "uid";
      var date = "date";
      var today = dateNow();

      //sumary and preface
      var header = "<doc>\n" +
        ":::uid " + uid + "\n" +
        ":::date " + date + "\n" +
        ":::wn " + today + "\n" +
        "<h3>Summary and Preface</h3>\n" +
        "<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\"> \n" +
        "<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n";
        doc = header;

        //build the index list
        var matches = [];
        var index = "";

        //CFRs
        var cfrIndexSource = $('dl #metadata_list').html();
        var re = /(\d\d\sCFR\d+)<\/a>/g;
        while( (res = re.exec(inputIndexSource)) !== null ){
          matches.push(res[1]);
        }
        matches.forEach(function(item) {
          item.replace(/-/, "");
          index = index + ":::index " + item + "\n";
        });

        //input
        var inputIndexSource = $('#related_topics').html();
        re = /\/topics\/([\w\-\d]+)\"/g;
        while( (res = re.exec(inputIndexSource)) !== null ){
          matches.push(res[1]);
        }
        matches.forEach(function(item) {
          item.replace(/-/, "");
          index = index + ":::index " + item + "\n";
        });
        doc = doc + '\n' + index;

        //title
        var title = '<p><b>' + $('div[id=metadata_content_area]').html() + '</b></p>\n';

        doc = doc + '\n' + title;


        //what is in the doc now
        console.log(doc);
    }
  });

}

doIt();

