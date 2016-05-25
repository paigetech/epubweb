var fs = require('fs');
var request = require('request');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var cheerio = require('cheerio');
var Peepub   = require('pe-epub');
var mkdirp = require('mkdirp');
var myArgs = process.argv.slice(2);

var url = myArgs[0];

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

function downloadAndConvert(url, articleName){
  var errors = "";

  console.log("Downloading URL: " + url);

  request(url, function(error, response, html){
    if(!error) {
      var $ = cheerio.load(html);
      var source = $('.article').html();

      var FRVolume = $('.volume').html();
      var edition = $('.page').html();
      //finding the index terms
      var sidebar = $('#sidebar').html();
      var re = /Page:<\/dt>\s*<dd>[\s\n]+(\d+)[\s\n]*\-(\d+)/gi;

      var pages = re.exec(sidebar);
      //remove the full matches
      //check for possible single page
      if(!pages) {
        re = /Page:<\/dt>\s*<dd>[\s\n]+(\d+)[\s\n]+\(\d\spage\)/gi;
      }
      if(pages) {
        pages.shift();

        var indexPages = "";

        for (i = pages[0]; i <= pages[1]; i++) {
            indexPages += ":::index " + FRVolume + "p" + i + "\n";
        }
      }

      //download the images we'll need
      var loadedFile = source;

      re = /src=\"(https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/.*?\/\w+\.\w{3})\"/ig;


      mkdirp( 'images/', function (err) {
            if (err) console.error(err);
            else console.log('Added the directory: images');
      });

      //make sure the frvolume directory is available
      var directory = 'images/' + FRVolume + "/";
      mkdirp( directory , function (err) {
            if (err) console.error(err);
            else console.log('Made the directory: ' + directory);
      });

      var captures = [];
      while (match = re.exec(loadedFile)) {
            captures.push(match[1]);
      }

      if (captures.length > 0) {
        captures.forEach(function(url) {
          var re = /https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/([\d\w\.]+)\/\w+\.\w{3}/ig;
          var fileVar = re.exec(url);
          if (fileVar) {
          console.log("Image: " + fileVar);
            var fileName = "images/" + FRVolume + "/" + fileVar[1].toLowerCase() + '.png';
            var r = request(url).pipe(fs.createWriteStream(fileName));
            r.on('finish', function(){
              var fileSize = fs.statSync(fileName)["size"];
              if (fileSize === 0) {
                  r.on('finish', function(){
                    var fileSize = fs.statSync(fileName)["size"];
                    if (fileSize === 0) {
                      errors += "Error downloading: " + fileName + ", File Size: 0 \n";
                    }
                  });
              }
            });
          }

        });
      }

      //building the doc
      var doc = "";

      doc += url + "\n\n :::index " + FRVolume + "p" + edition + "\n\n";
      doc += indexPages;


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
      if (!body) {
        console.log("error, content_area not found");
      }

      //adding indexs and alinks
      re = /<span[\s\S]+?class="printed_page"\sid="page-(\d+)[\S\s]*?<\/span>/g;
      body = body.replace(re, "\n:::index " + FRVolume + "p$1\n<a name=\"" + FRVolume + "p$1\"><\/a>\n");

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

      //add the body to the prepared doc
      doc += body;

      //run the find and replace set

      //convert FR links to rex links
      re = /<a href=\"\/citation\/(([\d]+)-FR-[\d]+)\">([\s\w\"\-=\n]+)<\/a>/g;
      replace = "<!!ln dp_fr$2 $1p$2 #$1p$2>$3<\/!!ln>";
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

      //get rid of classes
      re = /\sclass=\"([\w\d\-_\s]+)?\"/g;
      doc = doc.replace(re, "");
      
      //header id removal
      re = /(<h\d)\s[\w\s\d=\"]+>/g;
      replace = "$1>";
      doc = doc.replace(re, replace);

      //replace the closing ln tages with the proper closing a tag 
      re = /<\/!!ln>/g;
      replace = "<\/a>";
      doc = doc.replace(re, replace);



      doc = doc.replace(/https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/([a-z0-9\.%]+)\/\w+\.\w{3}/ig, function($1) {
            return( $1.toLowerCase() ); 
          });

      var re = /https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/([\d\w\.%]+)\/\w+\.\w{3}([\s\S]+?>)/ig;
      var replace = "http://p.i.mediregs.com/fr" + FRVolume + "/$1.png$2<\/a><\/p>";
      doc = doc.replace(re, replace);

      //take care of any images
      re = /<img /gi;
      replace = "<!!img><img ";
      doc = doc.replace(re, replace);

      console.log('complete');

      doc += "\n<\/doc>";
      console.log("Done");

      fs.writeFileSync( articleName, doc );
      if (errors) {
        errors = "Error Log for: " + url + "\n" + errors;
        fs.writeFileSync( "errors." + FRVolume + "p" + edition + ".txt", errors );
      }
  }
});

}


function setFileNamesAndURL(url) { 
    var articleName = /(20\d\d-\d+)/.exec(url);

    var directory = "missing/";

    mkdirp( directory , function (err) {
          if (err) console.error(err);
          else console.log('Made the directory: ' + directory);
    });

    articleName = "missing/" + articleName[1].toString() + ".html";
    if (!articleName) {
      console.log("Error with: " + url);
    } else {
      downloadAndConvert(url , articleName);
    }
  };

setFileNamesAndURL(url);

