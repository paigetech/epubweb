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

  //OPPS
  var url = "https://www.federalregister.gov/articles/2014/11/10/2014-26146/medicare-and-medicaid-programs-hospital-outpatient-prospective-payment-and-ambulatory-surgical";
  //PFS
  //var url = "https://www.federalregister.gov/articles/2014/11/13/2014-26183/medicare-program-revisions-to-payment-policies-under-the-physician-fee-schedule-clinical-laboratory";
  console.log("Downloading URL: " + url);
  var fileName = 'public/temp.html';

  request(url, function(error, response, html){
    if(!error) {
      var $ = cheerio.load(html);
      var source = $('.article').html();

      var FRVolume = $('.volume').html();
      var edition = $('.page').html();

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
        re = /<dt>Entry\sType:<\/dt>\s+<dd>(\w+)<\/dd>/g;
        var entryType = re.exec(summBody)[1];
        entryType = "\n<br><p><b>Entry Type:</b> " + entryType + "</p>\n";

        doc += entryType + '\n';

        //Action
        re = /<dt>Action:\s?<\/dt>\s+<dd>([\w\s\.]+)<\/dd>/g;
        var action = re.exec(summBody)[1];
        action = "<br><p><b>Action:</b> " + action + "</p>\n";

        doc += action + '\n';

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
        var extension = re.exec(shortTitle)[1];
        if (extension === "FC") {
          shortTitle += " Final Rule for 2015 OPPS & ASC";
        } else if (extension === "P") {
          shortTitle += " Proposed Rule for 2015 OPPS & ASC";
        }

        //we now have the info to build the h2
        var h2 = "<doc>\n<h2>" + shortTitle + "</h2>\n:::uid " + uid + "0\n</doc>\n";

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

      //this is in the wrong stinking place
      var tableOfContents = "\n<doc>\n:::uid tableofcontents" + FRVolume + "\n<h3>Table of Contents</h3>" + toc + "\n<\/doc>";
      //remove the awkward Back to Top
      re = /Table of Contents <a href="#table_of_contents" class="back_to_top">Back to Top<\/a>/g;
      tableOfContents = tableOfContents.replace(re, "");
      //change the LI out for p's with class
      re = /<li\s/g;
      tableOfContents = tableOfContents.replace(re, "<p ");
      re = /<\/li>/g;
      tableOfContents = tableOfContents.replace(re, "<\/p>");

      //change the a links into uids
      re = /<a\shref=\"#(\w+)-(\d+)\">/g;
      //replace = "<!!uf " + collection + " " + FRVolume + edition + "$1$2\">";
      replace = "<a href=\"" + FRVolume + edition + "$1$2\"><\/a>";
      tableOfContents = tableOfContents.replace(re, replace);

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
      re = /<h1[\S\s]*?>/g;
      body = body.replace(re, "<br><br><p><b>");
      re = /<\/h1>/g;
      body = body.replace(re, "<\/b><\/p>");

      //setup the different docs

      //first get rid of the h4s we don't want
      re = /<h4[\S\s]*?>/g;
      body = body.replace(re, "<br><p><b>");
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
      replace = "\n<\/doc>\n<doc>\n:::uid " + uid + "$1\n<h3>$2<\/h3>\n";
      body = body.replace(re, replace);
      //get rid of the others
      re = /<h2\sid=\"([\w\d\"\-\s=]+)\"[\w\d\"\-\s=]+\">([\S\s]*?)<\/h2>/g;
      replace = "\n<p><b>$2<\/b><\/p>\n";
      body = body.replace(re, replace);


      //setup for Footnotes
      re = /<p><b>Footnotes/g;
      replace = "\n<\/doc>\n<doc>\n:::date " + date +  "\n:::uid " + uid + "footnotes\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h3>Footnotes<\/h3>\n";
      body = body.replace(re, replace);
      re = /<div[\s\w\d=_\-\"]+class="footnote">/g;
      replace = "";
      body = body.replace(re, replace);

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

      //clean up random h2
      re = /<h2([\s\w\d=\"_]+)?><\/h2>/g;
      body = body.replace(re, "");

      //add the toc
      //doc += tableOfContents;
      //add the body to the prepared doc
      doc += body;
      //fix uids
      re = /(:::uid\s[\w\d]+)\-([\w\d]+)/g;
      doc = doc.replace(re, "$1$2"); 

      //run the find and replace set
      re = /<a href=\"\/citation\/(([\d]+)-FR-[\d]+)\">/g;
      replace = "<!!ln dp_fr$2 $1p$2 #$1p$2>";
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

      //change the alinks in headers
      re = /(<h\d>)<a\sname=\"(\w)-(\d+)\"><\/a>([\S\s]*?<\/h\d>)/g;
      replace = "$1$4\n<a name=\"" + FRVolume + edition + "$2$3\"><\/a>";
      doc = doc.replace(re, replace);

      //header id removal
      re = /(<h\d)\s[\w\s\d=\"]+>/g;
      replace = "$1>";
      doc = doc.replace(re, replace);


      //add in the toc
      re = /(<\/doc>)\n(<doc>\n:::uid\s[\w\d]+\n<h3>I\.[\w\d\s]+\n<\/h3>)/;
      replace = "$1\n" + tableOfContents + "\n$2";
      doc = doc.replace(re, replace);



      //download the images we'll need
      var loadedFile = source;

      re = /src=\"(https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/.*?\/\w+\.\w{3})\"/ig;

      var captures = [];
      while (match = re.exec(loadedFile)) {
            captures.push(match[1]);
      }

      captures.forEach(function(url) {
        var re = /https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/([\d\w\.]+)\/\w+\.\w{3}/ig;
        var fileVar = re.exec(url);
        var fileName = "images/" + fileVar[1].toLowerCase() + '.png';

        request(url).pipe(fs.createWriteStream(fileName));

      });
      console.log('complete');
     
      doc += "\n<\/doc>";
      console.log("Done");

      //what is in the doc now
      fs.writeFileSync("xpathTest.html", doc);
      //console.log(doc);
  }
});

}

doIt();

