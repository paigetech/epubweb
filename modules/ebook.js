var express = require('express');
var router = express.Router();
var fs = require('fs');
var request = require('request');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var cheerio = require('cheerio');
var Peepub   = require('pe-epub');
var getMatches = require('../modules/getMatches.js');
var mkdirp = require('mkdirp');
var myArgs = process.argv.slice(2);

var url = "https://www.federalregister.gov/articles/2016/04/27/2016-09120/medicare-program-hospital-inpatient-prospective-payment-systems-for-acute-care-hospitals-and-the";

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

function doIt(url){


  console.log("Downloading For: " + url);
  //write out what we're pulling down for testing purposes
  fs.writeFileSync("origional.html", url);

  request(url, function(error, response, html){
    if(!error) {
      var $ = cheerio.load(html);
      var source = $('.article').html();
      var FRVolume = $('.volume').html();
      var edition = $('.page').html();
      var filename = FRVolume + "FR" + edition;

      //building the doc
      var doc = "";

      //H2
      //body Summary and Preface
      //uid
      var uid = FRVolume + "FR" + edition; //need to set up

      //date
      var dateBody = $('.metadata_list').html();
      var date;
      re = /<dt>Publication Date:<\/dt> <dd><a href="\/articles\/(\d+\/\d+\/\d+)">.*?<\/a><\/dd>/g;
      if( (res = re.exec(dateBody)) !== null ){
        date = (res[1].replace(/[\/]/g, "-") );
      }
      var today = dateNow();
      

      //sumary and preface
      var header = "<doc>\n" +
        ":::uid " + uid + "\n" +
        ":::date " + date + "\n" +
        ":::wn " + today + "\n" +
        "<h3 id=\"summary_and_preface\">Summary and Preface</h3>\n" +
        "<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\"> \n" +
        "<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n";
        doc = header;

        //build the index list
        var matches = [];
        var index = "";

        //CFRs
        var cfrIndexSource = $('.aside_box dl').html();
        var re = /(\d\d\sCFR\s\d+)/g;
        var CFR = cfrIndexSource.match(re); //so we can use it later
        matches = CFR;


        //input
        var inputIndexSource = $('#related_topics').html();
        re = /\/topics\/([\w\-\d]+)\"/g;
        while( (res = re.exec(inputIndexSource)) !== null ){
          matches.push(res[1]);
        }

        //build the :::index
        matches.forEach(function(item) {
          item = item.replace(/[-\s]/g, "");
          index = index + ":::index " + item + "\n";
        });
        doc = doc + '\n' + index + '\n';

        //title
        var titleText = $('#metadata_content_area h1').html();
        var title = '<p><b>' + titleText + '</b></p>\n';

        doc += '\n' + title + '\n';
        matches = [];

        //body Summary and Preface
        var summBody = $('.metadata_list').html();
        //date
        var publicationDate;
        re = /<dt>Publication Date:<\/dt> <dd><a.*?>(.*?)<\/a><\/dd>/g;
        while( (res = re.exec(summBody)) !== null ){
          publicationDate = res[1];
        }
        publicationDate = "<br><p><b>Publication Date:</b> " + publicationDate + "</p>\n";
        doc += publicationDate + '\n';

        //agencies
        re = /agencies\/.*?">(.*?)<\/a>/g;
        while( (res = re.exec(summBody)) !== null ){
          matches.push(res[1]);
        }
        var agencies = "<br><p><b>Agencies:</b></p>\n";

        matches.forEach(function(item) {
          agencies = agencies + "<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + item + "</p>\n";
        });

        doc += agencies + '\n';

        //Entry Type
        re = /<dt>Entry\sType:<\/dt>[\n\s]+<dd>([\w\s]+)<\/dd>/g;
        var entryType = re.exec(summBody)[1];
        entryType = "\n<br><p><b>Entry Type:</b> " + entryType + "</p>\n";

        doc += entryType + '\n';

        //Document Citation
        re = /<dt>Document Citation.*?\n.*?(\d\d).*?(\d+)<\/span>/g;
        var docCitation = re.exec(summBody);
        var documentCitation = "<br><p><b>Document Citation:</b> " + docCitation[1] + " FR " + docCitation[2] + "</p>\n";

        doc += documentCitation + '\n';
        
        //Page
        re = /<dt>Page[\S\s]*?(\d+[\S\s]*?-\d+[\S\s]*?)\n/g;
        var page = re.exec(summBody)[1];
        page = page.replace(/\n|\s{2,}/g, "");
        var pages = "<br><p><b>Page:</b> " + page + "\n";

        doc += pages + '\n';

        //CFR:
        re = /(\d\d\sCFR\s\d+)/g;
        CFR = cfrIndexSource.match(re); //so we can use it later
        var cfrs = "<br><p><b>CFR:</b></p>\n";
        CFR.forEach(function(item){
          cfrs = cfrs + "<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + item + "<p>\n";
        });

        doc += cfrs + "\n";

        //agency/docet nums
        re = /(CMS-\d+-\w+)/g;
        matches = [];
        while( (res = re.exec(summBody)) !== null ){
          matches.push(res[1]);
        }
        var agencyDocet = "<br><p><b>Agency/Docket Numbers:</b></p>\n";

        matches.forEach(function(item) {
          agencyDocet = agencyDocet + "<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[" + item + "] </p>\n";
        });

        doc += agencyDocet + '\n';

        //setup the short title
        var shortTitle = matches;
        re = /CMS-\d+-(\w+)/g;
        var extension = re.exec(shortTitle);
        if (extension === "FC") {
          shortTitle += " Final Rule for 2015 OPPS & ASC";
        } else if (extension === "P") {
          shortTitle += " Proposed Rule for 2015 OPPS & ASC";
        }
        

        //we now have the info to build the h2
        //we set it to an h1 until the end, when we change it back to h2
        var h2 = "<doc>\n<h1>" + shortTitle + "</h1>\n:::uid " + uid + "0\n</doc>\n";

        doc = h2 + doc;

        //RINs (***needs editing for more than one)
        re = /<dt>Docket RIN<\/dt>[\S\s]*?">([\S\s]*?)<\/a><\/dd>/g;
        matches = [];
        while( (res = re.exec(summBody)) !== null ){
          matches.push(res[1]);
        }
        var RINs = "<br><p><b>RINs:</b>";

        matches.forEach(function(item) {
          RINs = RINs + item + "</p>\n";
        });

        doc += RINs + '\n';
        
        //shorter URL
        var shortURL = $('.shorter_url').html();

        doc += "<br><p><b>Shorter URL:</b> <a href=\"" + shortURL +"\">" + shortURL + "</a></p>";

      //Find the TOC so that we can remove it while saving it for later
      var toc = $('#content_area #table_of_contents').html();
      toc += $('#content_area .table_of_contents').html();

      var tables = $('#content_area #table_of_tables').html();
      tables += $('#content_area .table_of_tables').html();
      //remove the TOC and table of tables
      $('#content_area .table_of_contents').remove();
      $('#content_area #table_of_contents').remove();
      $('#content_area .table_of_tables').remove();
      $('#content_area #table_of_tables').remove();
      //remove the secondary ToC
      //$('#content_area .extract').remove();

      //this is in the wrong stinking place
      var tableOfContents = "\n<doc>\n:::uid tableofcontents" + FRVolume + "\n<h3>Table of Contents</h3>\n<a name=\"table_of_contents\"></a>" + toc + "\n<\/doc>";
      //remove the awkward Back to Top
      re = /Table of Contents <a href="#table_of_contents" class="back_to_top">Back to Top<\/a>/g;
      tableOfContents = tableOfContents.replace(re, "");
      //change the LI out for p's with class
      re = /<li\s/g;
      tableOfContents = tableOfContents.replace(re, "<p ");
      re = /<\/li>/g;
      tableOfContents = tableOfContents.replace(re, "<\/p>");
      //setup the classes for indentation
      re = /class="level_2"/g;
      tableOfContents = tableOfContents.replace(re, "class=\"levela\"");
      re = /class="level_3"/g;
      tableOfContents = tableOfContents.replace(re, "class=\"levelb\"");
      re = /class="level_4"/g;
      tableOfContents = tableOfContents.replace(re, "class=\"levelc\"");


      //body info for the rest of the build
      var body = $('#content_area').html();

      //adding indexs and alinks
      re = /<span\sclass="printed_page"\sid="page-(\d+)[\S\s]*?<\/span>/g;
      body = body.replace(re, "\n:::index 79p$1\n<a name=\"79p$1\"><\/a>\n");

      //getting rid of back to top
      re = /<a href="[#_\w]+"\sclass="back_to_[\w_]+">Back to Top<\/a>/g;
      body = body.replace(re, "");

      //find footnote divs and make links
      re = /<div\sid="(footnote-[\d]+?)"[\w="_\s]+>/g;
      body = body.replace(re, "<a name=\"$1\"><\/a>");

      //get rid of h1s
      re = /<h1[\w="_\s-]+?id=\"(\w\-\d+)\"[\w="_\s-]+?>/g;
      body = body.replace(re, "<br><br><a name=\"$1\"><\/a><p>");
      re = /<h1[ \w="_\s-]+?id=\"([\w\-\d]+)\">/g;
      body = body.replace(re, "<br><br><a name=\"$1\"><\/a><p>");
      re = /<h1[\w="_\s-]+?>/g;
      body = body.replace(re, "<p><b>");
      re = /<\/h1>/g;
      body = body.replace(re, "<\/b><\/p>");
      re = /<h1>/g;
      body = body.replace(re, "<p><b>");


      //new cleanups
      re = /<caption id=\"t\-(\d)\">/g;
      body = body.replace(re, "<a name=\"t\-$1\">");

      re = /<table>/g;
      body = body.replace(re, "<table class=\"fr\">");



      //setup the different docs

      //first get rid of the h4s we don't want
      re = /<h4[\S\s]*?id=\"(\w\-\d+)\"[\S\s]*?>/g;
      body = body.replace(re, "<a name=\"$1\"><\/a><br><p><b>");
      re = /<\/h4>/g;
      body = body.replace(re, "<\/b><\/p>");

      //get rid of the plain h3s
      re = /<h3>([\S\s]*?)<\/h3>/g;
      body = body.replace(re, "<p><b>$1<\/b><\/p>\n");


      //h3s -> h4s for docs
      re = /<h3[\S\s]*?id=\"(\w\-\d+)\"[\S\s]*?>/g;
      replace = "\n<\/doc>\n<doc>\n:::date " + date + "\n:::uid " + uid + "$1\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h4><a name=\"$1\"><\/a>";
      body = body.replace(re, replace);
      re = /<\/h3>/g;
      body = body.replace(re, "<\/h4>\n");

      //look for h3's that should be docs in their own right
      re = /<doc>\n:::uid\s([\w\d]+)\n<h3>([IVX]+\.)([\w\d\s\.\-\:\(\)\\\/]+)<\/h3>[\n\s]+?<p/g;
      replace = "\n<\/doc>\n<doc>\n:::uid " + uid + "head$1\n<h3>$2$3<\/h3>\n\n<\/doc>\n<doc>\n:::date " + date + "\n:::uid $1\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h4>$3<\/h4>\n<p";
      body = body.replace(re, replace);

      //catpture the important h2s
      re = /<h2\sid=\"([\w\d\"\-\s=]+)\"[\w\d\"\-\s=]+\">([IVX]+\.[\S\s]*?)<\/h2>/g;
      replace = "\n<\/doc>\n<doc>\n:::uid " + uid + "$1\n<h3>$2<\/h3>\n<a name=\"$1\"><\/a>\n";
      body = body.replace(re, replace);
      //get rid of the others
      re = /<h2\sid=\"([\w\d\"\-\s=]+)\"[\w\d\"\-\s=]+\">([\S\s]*?)<\/h2>/g;
      replace = "\n<p><b>$2<\/b><\/p>\n<a name=\"$1\"><\/a>\n";
      body = body.replace(re, replace);

      //clean up random h2
      re = /<h2([\s\w\d=\"_]+)?><\/h2>/g;
      body = body.replace(re, "");

      //sec h2's <h2 id="sec-410-29">
      re = /<h2\sid=\"[\w\d\"\-\s=]+\">([\S\s]*?)<\/h2>/g;
      replace = "\n<p><b>$1<\/b><\/p>\n";
      body = body.replace(re, replace);

      re = /<h2/g;
      body = body.replace(re, "<h3");
      re = /<\/h2>/g;
      body = body.replace(re, "<\/h3>");

      //setup for Footnotes
      re = /<p><b>Footnotes/g;
      replace = "\n<\/doc>\n<doc>\n:::date " + date +  "\n:::uid " + uid + "footnotes\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h3>Footnotes<\/h3>\n<a name=\"footnotes\"><\/a>\n";
      body = body.replace(re, replace);
      //fix the footnotes
      re = /<sup><a rel="footnote" id="(citation-\d+)"/g;
      replace = "<sup><a rel=\"footnote\" name=\"$1\"";
      body = body.replace(re, replace);

      //level tags
      //<a name="h-35"></a><br><p><b>1. **indicates level a** Database Construction</b></p>
      //</a><br><p class="levela"><i>1. Database Construction</i></p>
      re = /<\/a><br><p><b>(\d{1,3}\. )<\/b>/g;
      replace = "</a><br><p class=\"levela\"><i>$1</i>";
      body = body.replace(re, replace);
      //</a><br><p><b>a. **indicates level b** Database Source and Methodology</b></p>
      //             To:           <a name="h-36"></a><br><p class="levelb"><i>a. Dat
      re = /<\/a><br><p><b>([a-z]{1,3}\. )<\/b>/g;
      replace = "</a><br><p class=\"levelb\"><i>$1</i>";
      body = body.replace(re, replace);

      //get rid of divs
      re = /<div\s[\w="_\s]+>/g;
      body = body.replace(re, "");
      re = /<div>/g;
      body = body.replace(re, "");
      re = /<\/div>/g;
      body = body.replace(re, "");

      //setup for List of Subjects
      re = /<p><b>List of Subjects/g;
      replace = "\n<\/doc>\n<doc>\n:::uid " + uid + "headlistofsubject\n<h3>List of Subjects<\/h3>\n\n<\/doc>\n<doc>\n:::date " + date +  "\n:::uid " + uid + "listofsubjects\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h4>List of Subjects<\/h4>\n";
      body = body.replace(re, replace);

      //clean up the rest of the h's
      re = /<h5[\S\s]*?>/g;
      body = body.replace(re, "<br><p><b>");
      re = /<\/h5>/g;
      body = body.replace(re, "<\/b><\/p>");

      //setup the PARTS
      re = /<p><b>(PART\s(\d+)[\S\s]*?)<\/b><\/p>/g;
      replace = "\n<\/doc>\n<doc>\n:::date " + date + "\n:::uid " + uid + "part$2\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h4>$1<\/h4>";
      body = body.replace(re, replace);

      //clean up double end docs
      re = /<\/doc>\n+<\/doc>/g;
      body = body.replace(re, "<\/doc>");


      //add the toc
      doc += tableOfContents;

      //add the body to the prepared doc
      doc += body;
      //fix uids
      re = /(:::uid\s[\w\d]+)\-([\w\d]+)/g;
      doc = doc.replace(re, "$1$2"); 

      //run the find and replace set

      re = /<a href=\"\/citation\/([\d]+)-FR-([\d]+)\">([\s\w\"\-=\n]+)<\/a>/g;
      replace = "<!!ln dp_fr$1 $1p$2 #$1p$2>$3<\/!!ln>";
      doc = doc.replace(re, replace);

      //take care of any images
      re = /<p\sclass="graphic"><a[\s\w\"\-=]+href="https:\/\/s3\.amazonaws\.com\/images\.federalregister\.gov\/([A-Z0-9\.]+)\/\w+(\.\w{3})\"[\s\w\"\-=]+><img[\s\w\"\-=:\/\.]+><\/a><\/p>/g;
      replace = "<p class=\"graphic\"><!!img><img src=\"$1$2\"><\/a><\/p>";
      doc = doc.replace(re, replace);


      //header id removal
      re = /(<h\d)\s[\w\s\d=\"]+>/g;
      replace = "$1>";
      doc = doc.replace(re, replace);

      //replace the closing ln tages with the proper closing a tag 
      re = /<\/!!ln>/g;
      replace = "<\/a>";
      doc = doc.replace(re, replace);

      //pull out page numbers
      re = /<span[ \w="_\s-]+?data-page=\"([\w\-\d]+)\"[ \w="_\s-]+?> <\/span>/g;
      matches = doc.match(re);
      if (matches !== null) {
        matches.forEach(function(value) {
          re = new RegExp('<a href="#' + value + '">([\\s\\S]*?)<\\/a><\\/p>');
          replace = "$1</p>";
          doc = doc.replace(re, replace);
        });
      }

      //additional changes 5.25.2016

      //get rid of h3s in List of Subjects
      console.log("new section is running");
      re = /<h3 class="cfr_section".*?>(.*?)<\/h3>/g;
      doc = doc.replace(re, "<p><b>$1<\/p><\/b>");

      re = /<caption class="table_title" id="t\-(\d+)">/g;
      doc = doc.replace(re, '<caption class="table_title"><a name="t-$1"></a>');


      //may also need to run this on the body
      re = /<a class="cfr external".*?>((\d+) CFR (?:part )?(\d+)\.?(\d+)?)<\/a>/gi;
      doc = doc.replace(re, '<!ln dp_ecfr$2 $2cfr$3x$4>$1</a>');

      //replace href with hrex and add target="_blank"
      re = /<a href="http:/gi;
      doc = doc.replace(re, '<a target="_blank" hrex="http:');

      //replace class="level[\w]" with level[\d]
      re = /<p class="levela"/gi;
      doc = doc.replace(re, '<p class="level1"');
      re = /<p class="levelb"/gi;
      doc = doc.replace(re, '<p class="level2"');
      re = /<p class="levelc"/gi;
      doc = doc.replace(re, '<p class="level3"');
      re = /<p class="leveld"/gi;
      doc = doc.replace(re, '<p class="level4"');

      //add back to top in sections with captial letters
      re = /(<h4><a name="([\w\d\-]+)"><\/a>[A-Z]\..*?<\/h4>)/gi;
      doc = doc.replace(re, '$1\n<p><a href="#table_of_contents">Back to TOC</a></p>');



      //end new changes
      
      //change h1 to h2 for final process
      re = /h1>/g;
      replace = "h2>";
      doc = doc.replace(re, replace);


      //download the images we'll need
      var loadedFile = source;

      re = /src=\"(https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/.*?\/\w+\.\w{3})\"/ig;

      var captures = [];
      while (match = re.exec(loadedFile)) {
            captures.push(match[1]);
      }
      mkdirp( "images/", function (err) {
            if (err) console.error(err);
            else console.log('Made the directory images/');
      });

      captures.forEach(function(url) {
        var re = /https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/([\d\w\.]+)\/\w+\.\w{3}/ig;
        var fileVar = re.exec(url);
        var fileName = "images/" + fileVar[1].toLowerCase() + '.png';

        request(url).pipe(fs.createWriteStream(fileName));

      });
      console.log('complete');
     
      doc += "\n<\/doc>";
      console.log("Done");

      fs.writeFileSync(filename + ".html", doc);
      console.log("Wrote: " + filename);
  }
});

}

doIt(url);

