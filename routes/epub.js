var express = require('express');
var router = express.Router();
var fs = require('fs');
var request = require('request');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var cheerio = require('cheerio');
var Peepub   = require('pe-epub');
//modules
var scrape = require('../modules/scrape');
var writeJSON = require('../modules/writeJson');
var epub = require('../modules/epub');
var xpathSelect = require('../modules/xpath');

var dateNow = function() {
  var dateNow = new Date();
  var dd = dateNow.getDate();
  var monthSingleDigit = dateNow.getMonth() + 1,
  mm = monthSingleDigit < 10 ? '0' + monthSingleDigit : monthSingleDigit;
  var yy = dateNow.getFullYear().toString();
  return (yy + '-' + mm + '-' + dd);
};

/* GET users listing. */
router.get('/', function(req, res) {
  res.render('epub', { title: 'epub' });
});

router.post('/', function(req, res) {
  //var url = req.body.url;
  var url = "https://www.federalregister.gov/articles/2013/08/19/2013-18956/medicare-program-hospital-inpatient-prospective-payment-systems-for-acute-care-hospitals-and-the";
  var fileName = 'public/' + req.body.fileName + '.html';

  request(url, function(error, response, html){

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

      //build the index list
      var indexSource = $('#related_topics').html();
      var index = "";
      var re = /\/topics\/([\w\-\d]+)\"/g;
      var matches = [];
      while( (res = re.exec(indexSource)) !== null ){
        matches.push(res[1]);
      }
      matches.forEach(function(item) {
        item.replace(/-/, "");
        index = index + ":::index " + item + "\n";
      });
      console.log("Index: " + index);

      fs.writeFileSync(fileName, doc);
      console.log("wrote html: " + fileName);

      //build the book json
//    var book = {
//          "title" : "The Peoples E-Book",
//          "cover" : "http://placekitten.com/600/800",
//          "pages" : [{
//            "title" : "PE-EPUB",
//            "body" : result
//          }]
//        };
//    var myPeepub = new Peepub(book);
//    myPeepub.create( 'public/epub/' + req.body.fileName + '.epub')
//    .then(function(filePath){
//    console.log("Wrote Epub: " + filePath);
//    });
    setTimeout(res.render('epubpost', { title: 'epub', epubLink: '/epub/' + req.body.fileName + '.epub' , htmlLink: '/' + req.body.fileName + '.html' }), 5000);
    }

  });

});

module.exports = router;
