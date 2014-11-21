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

/* GET users listing. */
router.get('/', function(req, res) {
  res.render('epub', { title: 'epub' });
});

router.post('/', function(req, res) {
  var url = req.body.url;
  var fileName = 'public/' + req.body.fileName + '.html';
  var selector = req.body.div;

  request(url, function(error, response, html){

    if(!error) {
      var $ = cheerio.load(html);

      var selection = $(selector).html();
      var book = {
            "title" : "The Peoples E-Book",
            "cover" : "http://placekitten.com/600/800",
            "pages" : [{
              "title" : "PE-EPUB",
              "body" : selection
            }]
          };
      fs.writeFileSync(fileName, selection);
      console.log("wrote html: " + fileName);
      
      var myPeepub = new Peepub(book);
      myPeepub.create( 'public/epub/' + req.body.fileName + '.epub')
      .then(function(filePath){
      console.log("Wrote Epub: " + filePath);
      });
    }

    setTimeout(res.render('epubpost', { title: 'epub', epubLink: '/epub/' + req.body.fileName + '.epub' , htmlLink: '/' + req.body.fileName + '.html' }), 2000);
  });

});

module.exports = router;
