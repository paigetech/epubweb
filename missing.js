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
  if (dd < 10) {
    dd = "0" + dd;
  }
  return (yy + '-' + mm + '-' + dd);
};

function doIt(){

  //var collection = "mre_paige_test";
  //opps
  var collection = "mre_pps_outpt2015";
  //pfs
  //var collection = "mre_pps_pfs2015";

  var url = "https://www.federalregister.gov/articles/2010/12/30/2010-33169/recruiting-and-hiring-students-and-recent-graduates";

  console.log("Downloading URL: " + url);
  //write out what we're pulling down for testing purposes
  fs.writeFileSync("origional.html", url);

  request(url, function(error, response, html){
    if(!error) {
      var $ = cheerio.load(html);
      var source = $('.article').html();

      var FRVolume = $('.volume').html();
      var edition = $('.page').html();

      //building the doc
      var doc = "";

      //date
      var dateBody = $('.metadata_list').html();
      var date;
      re = /<dt>Publication Date:<\/dt> <dd><a href="\/articles\/(\d+\/\d+\/\d+)">.*?<\/a><\/dd>/g;
      if( (res = re.exec(dateBody)) !== null ){
        date = (res[1].replace(/[\/]/g, "-") );
      }
      var today = dateNow();
      


      //body info for the rest of the build
      var body = $('#content_area').html();

      //adding indexs and alinks
      re = /<span\sclass="printed_page"\sid="page-(\d+)[\S\s]*?<\/span>/g;
      body = body.replace(re, "\n:::index 79p$1\n<a name=\"79p$1\"><\/a>\n");

      //getting rid of back to top
      re = /<a href="[#_\w]+"\sclass="back_to_[\w_]+">Back to Top<\/a>/g;
      body = body.replace(re, "");

      //get rid of divs
      re = /<div\s[\w="_\s]+>/g;
      body = body.replace(re, "");
      re = /<\/div>/g;
      body = body.replace(re, "");

      //get rid of h1s
      re = /<h\d[\S\s]*?>/g;
      body = body.replace(re, "<br><p><b>");
      re = /<\/h\d>/g;
      body = body.replace(re, "<\/b><\/p>");



      //setup for Footnotes
      re = /<p><b>Footnotes/g;
      replace = "\n<h3>Footnotes<\/h3>\n";
      body = body.replace(re, replace);
      re = /<div[\s\w\d=_\-\"]+class="footnote">/g;
      replace = "";
      body = body.replace(re, replace);


      //add the body to the prepared doc
      doc += body;

      //run the find and replace set
      re = /<a href=\"\/citation\/(([\d]+)-FR-[\d]+)\">/g;
      replace = "<!!ln dp_fr$2 $1p$2 #$1p$2>";
      doc = doc.replace(re, replace);

      //get rid of any hrefs
      re = /<a[\S\s]*?>/g;
      replace = "";
      doc = doc.replace(re, replace);
      //get rid of any hrefs
      re = /<\/a>/g;
      replace = "";
      doc = doc.replace(re, replace);

      re = /<a[\s\w\d\-\"#=]+rel=\"footnote\">([\s\n]+\[\d+\][\s\n]+)<\/a>/g;
      replace = "\n$1\n";
      doc = doc.replace(re, replace);

      //take care of any images
      re = /<p\sclass="graphic"><a[\s\w\"\-=]+href="https:\/\/s3\.amazonaws\.com\/images\.federalregister\.gov\/([A-Z0-9\.]+)\/\w+(\.\w{3})\"[\s\w\"\-=]+><img[\s\w\"\-=:\/\.]+><\/a><\/p>/g;
      replace = "<p class=\"graphic\"><!!img><img src=\"$1$2\"><\/a><\/p>";
      doc = doc.replace(re, replace);

      //get rid of classes
      re = /\sclass=\"([\w\d\-_\s]+)?\"/g;
      doc = doc.replace(re, "");
      
      //header id removal
      re = /(<h\d)\s[\w\s\d=\"]+>/g;
      replace = "$1>";
      doc = doc.replace(re, replace);



      //download the images we'll need
      var loadedFile = source;

      re = /src=\"(https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/.*?\/\w+\.\w{3})\"/ig;

      var captures = [];
      while (match = re.exec(loadedFile)) {
            captures.push(match[1]);
      }

      if (captures.length > 0) {
        captures.forEach(function(url) {
          var re = /https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/([\d\w\.]+)\/\w+\.\w{3}/ig;
          var fileVar = re.exec(url);
          if (fileVar) {
            var fileName = "images/" + fileVar[1].toLowerCase() + '.png';
            request(url).pipe(fs.createWriteStream(fileName));
          }

        });
      }
      console.log('complete');
     
      doc += "\n<\/doc>";
      console.log("Done");

      //what is in the doc now
      fs.writeFileSync("missingTest.html", doc);
      //console.log(doc);
  }
});

}

doIt();

