#! /perl/bin/perl

use WWW::Mechanize;

$handle11 =  $ARGV[0];
$dvol     =  $ARGV[1];
$temp2in  =  "temp.htm"l;
$temp2out =  "ebook\\".$handle11.".htm";

$handle12 =  $handle11;
$handle12 =~ s/-/x/g;

open(handlein,"< $temp2in");
@text = <handlein>;
close(handlein);

open(handleout,"> $temp2out");
open(handleout2,"> temphtm2.img");
open(handleout3,"> temphtm2.lnk");

$css = "<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n";

$frline = 0;
$docnum = 0;
$hdrflg = 0;
$ttlflg = 1;
print handleout "\n<doc>\n";
print handleout $css;

foreach $text(@text)
  {
#    print $text;
    $text =~ s/\0//g;
    $text =~ s/^ *\n//;
    $text =~ s/>Back to Top</>Jump to Table of Contents</;

    if (index($text,"dd><a class=\"cfr external\"",0) > 0)
      {
        $text2 = $text;
        $text2 =~ s/\n//;
        $text2 =~ s/ //g;
        $text2 =~ s/<[^\n>]*>//g;
        $text2 = ":::index ".$text2."\n";
        print handleout $text2;
      }
    if (index($text,"<li><a href=\"/topics/",0) > 0)
      {
        $text2 = $text;
        $text2 =~ s/\n//;
        $text2 =~ s/ //g;
        $text2 =~ s/-/x/g;
        $text2 =~ s/\(/x/g;
        $text2 =~ s/\)/x/g;
        $text2 =~ s/<[^\n>]*>//g;
        $text2 = ":::index topic".$text2."\n";
        print handleout $text2;
      }
    if (index($text,"span class=\"volume\"",0) > 0)
      {
        $text2 = $text;
        $text2 =~ s/\n//;
        $text2 =~ s/ //g;
        $text2 =~ s/<[^\n>]*>//g;
        $text2 = ":::index ".$text2."\n";
        print handleout $text2;
      }
    if (index($text,"\"doc_number\"",0) > 0)
      {
        $text2 = $text;
        $text2 =~ s/\n//;
        $text2 =~ s/ //g;
        $text2 =~ s/DocumentNumber://;
        $text2 =~ s/<[^\n>]*>//g;
        $text2 =~ s/-/x/g;
        $text2 = ":::index frn".$text2."\n";
        print handleout $text2;
      }
    if (index($text,"div class=\"title\"",0) > 0)
      {
        $text  = "";
        $frline = 1;
      }
    if (index($text,"<h1>Unified Agenda</h1>",0) > 0)
      {
        $text  = "";
        $frline = 0;
      }
    if (index($text,"div class=\"timeline_control\"",0) > 0)
      {
        $frline = 0;
      }
    if (index($text,"div class=\"metadata_share_bar\"",0) > 0)
      {
        $frline = 0;
      }
    if (index($text,"end article tag",0) > 0)
      {
        $text  = "";
        $frline = 0;
      }
    if (index($text,"end document tag",0) > 0)
      {
        $text  = "";
        $frline = 0;
      }
    if (index($text,"end aside tag",0) > 0)
      {
        $text  = "";
        $frline = 1;
      }
    if (index($text,"fulltext_content_area",0) > 0)
      {
        $text  = "";
        $frline = 1;
      }


    if ($frline > 0)
      {
         $text =~ s/ class=\"\"//g;
         $text =~ s/ class=\"part\"//g;
         $text =~ s/ class=\"subpart\"//g;
         $text =~ s/ class=\"cfr_section\"//g;
         $text =~ s/ class=\"signature_header\"//g;
         $text =~ s/ class=\"subject_list_header\"//g;
         $text =~ s/<h([0-9]) data-page=\"[0-9]*\"/<h$1/g;
         $text =~ s/<h([0-9]) id=\"([^\"]*)\">/<h$1><a name=\"$2\"><\/a>/g;

         $text =~ s/<h1>/<hr>\n<p><b><center>/g;
         $text =~ s/<\/h1>/<\/center><\/b><\/p>/g;
         $text =~ s/<h2>/<p><b>/g;;
         $text =~ s/<\/h2>/<\/b><\/p>/g;;
         $text =~ s/<h3>/<p><u>/g;;
         $text =~ s/<\/h3>/<\/u><\/p>/g;;
         $text =~ s/<h4>/<p><i>/g;;
         $text =~ s/<\/h4>/<\/i><\/p>/g;;

         if (index($text,"<center>",0) > 0)
            {
               if ($ttlflg == 1)
                  {
                     $text   =~ s/<[^\>]*>//g;
                     $text   =~ s/\n//g;
                     $text   = "<h2>".$text."</h2>";
                     $text   =~ s/<h2> *([^ ])/<h2>$1/;
                     print handleout $text."\n";
                     print handleout ":::uid ".$docid.$docnum."\n";
                     $text = "";
                     $docnum = $docnum + 1;
                     print handleout "</doc>\n";
                     print handleout "<doc>\n";
                     print handleout $css;
                     print handleout "<h3>Introduction and Title Page</h3>\n";
                     $ttlflg = 0;
                  }
               elsif (index($text,"</a>PART",0) > 0)
                  {
                     print handleout ":::uid ".$docid.$docnum."\n";
                     $docnum = $docnum + 1;
                     print handleout "</doc>\n";
                     print handleout "<doc>\n";
                     print handleout $css;
                     $anc1  =  index($text,"a name=",0);
                     $anc2  =  index($text,"\"",($anc1+8));
                     $anchor=  substr($text,($anc1+8),($anc2-$anc1-8));
                     $text  =~ s/<[^\>]*>//g;
                     $text  =~ s/Jump to Table of Contents\n//g;
                     $text  =~ s/Back to Top\n//g;
                     $text  =~ s/\n//g;
                     $text  =  "<a name=\"".$anchor."\"></a>\n<h4>".$text."</h4>\n<br><a href=\"#table_of_contents\" class=\"back_to_top\">Jump to Table of Contents</a>";
                     $text   =~ s/<h4> *([^ ])/<h4>$1/;
                  }
            }

         if (index($text,"data-internal-id",0) > 0)
            {
               $docid1 = index($text,"data-internal-id",0);
               $docid2 = index($text,"\"",($docid1+18));
               $docid  = substr($text,($docid1+18),($docid2-$docid1-18));
               $text   = "";
            }
         if (index($text,"data-internal-id",0) > 0)
            {
               $docid1 = index($text,"data-internal-id",0);
               $docid2 = index($text,"\"",($docid1+18));
               $docid  = substr($text,($docid1+18),($docid2-$docid1-18));
               $text   = "";
            }
         if (index($text,"iv class=\"header_column\"><hr>",0) > 0)
            {
               $text2  = $text;
            }
         if ($hdrflg == 1)
            {
               $text   = "";
               $hdrflg = 0;
            }
         if (index($text,"name=\"table_of_contents",0) > 0)
            {
               $hdrflg = 1;
               print handleout ":::uid ".$docid.$docnum."\n";
               $docnum = $docnum + 1;
               print handleout "</doc>\n";
               print handleout "<doc>\n";
               print handleout $css;
               print handleout "<a name=\"".$docid."table_of_contents\"></a>\n";
               $text  =~ s/<a href=\"\#[^\n]*\n/\n/;
               $text  =~ s/<[^\n]*>//g;
               $text  =~ s/\n//g;
               $text  =  "<h3>".$text."</h3>\n";
            }
         if (index($text,"</a>Regulation Text",0) > 0)
            {
               $hdrflg = 1;
               print handleout ":::uid ".$docid.$docnum."\n";
               $docnum = $docnum + 1;
               print handleout "</doc>\n";
               print handleout "<doc>\n";
               print handleout $css;
               $anc1  =  index($text,"a name=",0);
               $anc2  =  index($text,"\"",($anc1+8));
               $anchor=  substr($text,($anc1+8),($anc2-$anc1-8));
               $text  =~ s/<[^\>]*>//g;
               $text  =~ s/Jump to Table of Contents\n//g;
               $text  =~ s/Back to Top\n//g;
               $text  =~ s/\n//g;
               $text  =  "<a name=\"$anchor\">.</a>\n<h3>".$text."</h3>\n<a href=\"#table_of_contents\" class=\"back_to_top\">Jump to Table of Contents</a>";
               $hdrflg = 2;
            }
         if (index($text,"</a>Acronyms",0) > 0)
            {
               if (index($text,"<a name=",0) > 0) {$hdrflg = 2;}
            }
         if (index($text,"</a>List of Subjects",0) > 0)
            {
               print handleout ":::uid ".$docid.$docnum."\n";
               $docnum = $docnum + 1;
               print handleout "</doc>\n";
               print handleout "<doc>\n";
               print handleout $css;
               $anc1  =  index($text,"a name=",0);
               $anc2  =  index($text,"\"",($anc1+8));
               $anchor=  substr($text,($anc1+8),($anc2-$anc1-8));
               $text  =~ s/<[^\>]*>//g;
               $text  =~ s/Jump to Table of Contents\n//g;
               $text  =~ s/Back to Top\n//g;
               $text  =~ s/\n//g;
               $text  =  "<a name=\"$anchor\">.</a>\n<h3>".$text."</h3>\n<br><a href=\"#table_of_contents\" class=\"back_to_top\">Jump to Table of Contents</a>";
               $hdrflg = 0;
            }
         if (index($text,"</a>Footnotes",0) > 0)
            {
               print handleout ":::uid ".$docid.$docnum."\n";
               $docnum = $docnum + 1;
               print handleout "</doc>\n";
               print handleout "<doc>\n";
               print handleout $css;
               $anc1  =  index($text,"a name=",0);
               $anc2  =  index($text,"\"",($anc1+8));
               $anchor=  substr($text,($anc1+8),($anc2-$anc1-8));
               $text  =~ s/<[^\>]*>//g;
               $text  =~ s/Jump to Table of Contents\n//g;
               $text  =~ s/Back to Top\n//g;
               $text  =~ s/\n//g;
               $text  =  "<a name=\"$anchor\">.</a>\n<h3>".$text."</h3>\n<br><a href=\"#table_of_contents\" class=\"back_to_top\">Jump to Table of Contents</a>";
               $hdrflg = 0;
            }
         if (index($text,"begin regulatory text",0) > 0)
            {
               $text  =  "";
               $hdrflg = 0;
            }

         $text =~ s/<\/a>([I|V|X]+\. )/<\/a>é$1/;
         $text =~ s/<\/a>([A-Z]+\. )/<\/a>$1/;
         if (index($text,"<\/a>é",0) > 0)
            {
               if ($hdrflg == 2)
                  {
                     print handleout ":::uid ".$docid.$docnum."\n";
                     $docnum = $docnum + 1;
                     print handleout "</doc>\n";
                     print handleout "<doc>\n";
                     print handleout $css;
                     $anc1  =  index($text,"a name=",0);
                     $anc2  =  index($text,"\"",($anc1+8));
                     $anchor=  substr($text,($anc1+8),($anc2-$anc1-8));
                     $text  =~ s/<[^\>]*>//g;
                     $text  =~ s/Jump to Table of Contents\n//g;
                     $text  =~ s/Back to Top\n//g;
                     $text  =~ s/\n//g;
                     $text  =  "<a name=\"$anchor\">.</a>\n<h3>".$text."</h3>\n<br><a href=\"#table_of_contents\" class=\"back_to_top\">Jump to Table of Contents</a>";
                     $text  =~ s/<h3> *([^ ])/<h3>$1/;
                     $text  =~ s/é//;
                  }
            }
         if (index($text,"<\/a>",0) > 0)
            {
               if ($hdrflg == 2)
                  {
                     print handleout ":::uid ".$docid.$docnum."\n";
                     $docnum = $docnum + 1;
                     print handleout "</doc>\n";
                     print handleout "<doc>\n";
                     print handleout $css;
                     $anc1  =  index($text,"a name=",0);
                     $anc2  =  index($text,"\"",($anc1+8));
                     $anchor=  substr($text,($anc1+8),($anc2-$anc1-8));
                     $text  =~ s/<[^\>]*>//g;
                     $text  =~ s/Jump to Table of Contents\n//g;
                     $text  =~ s/Back to Top\n//g;
                     $text  =~ s/\n//g;
                     $text  =  "<a name=\"$anchor\">.</a>\n<h4>".$text."</h4>\n<br><a href=\"#table_of_contents\" class=\"back_to_top\">Jump to Table of Contents</a>";
                     $text  =~ s/<h4> *([^ ])/<h4>$1/;
                     $text  =~ s///;
                  }
            }
#         $text =~ s/<\/a>é/<\/a>/;
#         $text =~ s/<\/a>/<\/a>/;

#<p class="graphic"><a class="entry_graphic_link" href="https://s3.amazonaws.com/images.federalregister.gov/ER15NO12.000/original.gif" id="g-1"><img class="entry_graphic" width="459" src="https://s3.amazonaws.com/images.federalregister.gov/ER15NO12.000/large.gif"></a></p>
#11href="https://s3.amazonaws.com/images.federalregister.gov22/ER10DE13.261/original.png ER10DE13.261/original.png" class="entry_graphic_link"><img width="459" src="http.gif
         if (index($text,"entry_graphic_link",0) > 0)
            {
               $textimg = $text;

               $imgwid1 = index($textimg,"width=",0);
               $imgwid2 = index($textimg," ",($imgwid1+7));
               $imgwid0 = substr($textimg,($imgwid1+7),($imgwid2-$imgwid1-8));

               $anchor1 = index($textimg," id=\"",0);
               $anchor2 = index($textimg,">",($anchor1+5));
               $anchor0 = substr($textimg,($anchor1+5),($anchor2-$anchor1-6));

               $imgpos1 = index($textimg,"href=",0);
               $imgpos2 = index($textimg,"\.gov",($imgpos1 + 6));
               $imgpos3 = index($textimg,"original.gif",($imgpos2));
               if ($imgpos3 < 1) 
                  {
                      $imgpos3 = index($textimg,"original.png",($imgpos2));
                      $imgpos4 = index($textimg,"\"",($imgpos1 + 6));
                      $imgnme1 = substr($textimg,($imgpos1 + 6),($imgpos4 - $imgpos1 - 6));
                      $imgnme2 = substr($textimg,($imgpos2 + 5),($imgpos3 - $imgpos2 - 6));
                      $imgnme2 = $imgnme2.".png";
                  }
               else
                  {
                      $imgpos4 = index($textimg,"\"",($imgpos1 + 6));
                      $imgnme1 = substr($textimg,($imgpos1 + 6),($imgpos4 - $imgpos1 - 6));
                      $imgnme2 = substr($textimg,($imgpos2 + 5),($imgpos3 - $imgpos2 - 6));
                      $imgnme2 = $imgnme2.".gif";
                  }

               print handleout2 $imgnme1." ".$imgnme2."\n";
               $textimg = "<p class=\"graphic\"><a name=\"".$anchor0."\"><\/a><!!img><img src=\"".$imgnme2."\" width=\"".$imgwid0."\"><\/p>\n";
               $text    = $textimg;
            }

#         $text =~ s/a name=\"/a name=\"$handle12/g;

         $text =~ s/<span class=\"printed_page\" data-page=\"[0-9]*\" id=\"page-([0-9]*)\">/\n:::index $dvol.p$1\n<a name=\"$dvol.p$1\"><\/a>\n<br><br><b>[Page $1]<\/b>\n<br><br>/g;
         $text =~ s/<span id=\"page-[0-9]*\" class=\"printed_page\"/<span/g;
#         $text =~ s/<span data-page=\"([0-9]*)\">/\n:::index $dvol.p$1\n/g;

         $text =~ s/<p id=\"(p-[0-9]*)\" data-page=\"([0-9]*)\">/<p><a name=\"$1\"><\/a><a name=\"$dvol.p$2$1\"><\/a>/g;

         $text =~ s/<a id=\"(p-[0-9]*)\" [^>]*>/<a name=\"$1\"><\/a><a name=\"$dvol.p$2$1\"><\/a>/g;
         $text =~ s/<a href=\"\/topics[^>]*>//g;

         $text =~ s/<li id=\"(p-[0-9]*)\" data-page=\"([0-9]*)\">/<li><a name=\"$1\"><\/a><a name=\"$dvol.p$2$1\"><\/a>/g;
         $text =~ s/<li data-page=\"([0-9]*)\" id=\"(p-[0-9]*)\">/<li><a name=\"$1\"><\/a><a name=\"$dvol.p$1$2\"><\/a>/g;
         $text =~ s/<p data-page=\"([0-9]*)\" id=\"(p-[0-9]*)\">/<p><a name=\"$1\"><\/a><a name=\"$dvol.p$1$2\"><\/a>/g;

         $text =~ s/class=\"entry_graphic_link\" href=\"[^ ]*\" /<li><a name=\"$1\"><\/a><a name=\"$dvol.p$2$1\"><\/a>/g;
         $text =~ s/<image class=\"entry_graphic\" src=\"https:\/\/s3.amazonaws.com\/images.federalregister.gov\/([^ ]*) /<img src=\"$1 /g;
         $text =~ s/\/large.gif\" /.png /g;
         $text =~ s/>end regulatory text</></g;

         $text =~ s/<p id=\"(p-[0-9]*)\">/<p><a name=\"$1\"><\/a>/g;

         $text =~ s/<li class=\"level_4[^>]*><a href[^>]*>\([^\n]*\n//;
         $text =~ s/<li class=\"level_4[^>]*><a href[^>]*>[a-z][^\n]*\n//;

         $text =~ s/<li (class=\"level_1)/<p style='margin-left:0.25in;margin-top:0em;margin-bottom:0em' $1/;
         $text =~ s/<li (class=\"level_2)/<p style='margin-left:0.45in;margin-top:0em;margin-bottom:0em' $1/;
         $text =~ s/<li (class=\"level_3)/<p style='margin-left:0.65in;margin-top:0em;margin-bottom:0em' $1/;
         $text =~ s/<li (class=\"level_4)/<p style='margin-left:0.85in;margin-top:0em;margin-bottom:0em' $1/;
         $text =~ s/<p ([^\n]*)<\/li>/<p $1<\/p>/;

         $text =~ s/:::index ([0-9]*)\.p/:::index $1p/;
         $text =~ s/a name=\"([0-9]*)\.p/a name=\"$1p/g;

         $text =~ s/<div class=\"footnote\" id=\"footnote-([0-9]*)\">/<div class=\"footnote\" id=\"footnote-$1\">\n<table border=on rules=none width='100%'>\n<tr><td>\n/;
         $text =~ s/^ *<a class=\"back\" href=\"(\#citation-[^\>]*)*>/\n<\/td><\/tr>\n<tr><td align='right'>\n<a class=\"back\" href=\"$1)*>/g;
         $text =~ s/Back to Context\n/Back to Context<\/td><\/tr>\n<\/table>\n<br>\n/g;

         $text =~ s/<a class=\"cfr external\" href=\"\/select-citation\/[0-9]*\/[0-9]*\/[0-9]*\/42-CFR-([^\"]*)\">/<!!ln dp_ecfr42 42cfr$1>/g;
         $text =~ s/<a class=\"usc external\" href=\"[^\"]*title=42[^\"]*section=([^\&]*)\&amp;[^\>]*>/<!!ln mre_usc42 42usc$1>/g;
         $text =~ s/<a href=\"\/citation\/([7-9][0-9])-FR-([0-9]*)\">/<!!ln dp_fr$1 $1p$2 #$1p$2>/g;
         $text =~ s/<a href=\"\/citation\/(6[0-4])-FR-([0-9]*)\">/<!!ln dp_fr$1 $1p$2 #$1p$2>/g;
         $text =~ s/<a href=\"\/citation\/(65)-FR-(1[0-5][0-9][0-9][0-9])\">/<!!ln dp_fr$1 $1p$2 #$1p$2>/g;
         $text =~ s/<a href=\"\/citation\/(65)-FR-(1[6-9][0-9][0-9][0-9])\">/<!!ln dp_fr$1a $1p$2 #$1p$2>/g;
         $text =~ s/<a href=\"\/citation\/(65)-FR-(2[0-9][0-9][0-9][0-9])\">/<!!ln dp_fr$1a $1p$2 #$1p$2>/g;
         $text =~ s/<a href=\"\/citation\/(65)-FR-(3[0-9][0-9][0-9][0-9])\">/<!!ln dp_fr$1a $1p$2 #$1p$2>/g;
         $text =~ s/<a href=\"\/citation\/(65)-FR-([0-9]+)\">/<!!ln dp_fr$1 $1p$2 #$1p$2>/g;
         $text =~ s/<a href=\"\/citation\/(6[6-9])-FR-([0-9]*)\">/<!!ln dp_fr$1 $1p$2 #$1p$2>/g;

         $text =~ s/<a href=\"\/citation\/[1-5][0-9]-FR-[0-9]*\">//g;
         $text =~ s/<a class=\"cfr external\" href=[^\>]*>//g;
         $text =~ s/<a class=\"usc external\" href=[^\>]*>//g;

         $text =~ s/<a class=\"external\" href=\"([^\n\">]*)\">/<a class=\"external\" href=\"$1\" target=\"_new\">/g;

         $text =~ s/<!!ln ([^>]*)\./<!!ln $1x/g;
         $text =~ s/<!!ln ([^>]*)\./<!!ln $1x/g;
         $text =~ s/<!!ln ([^>]*)\-/<!!ln $1x/g;
         $text =~ s/<!!ln ([^>]*)\-/<!!ln $1x/g;

         $text =~ s/<p>/<p style='margin-left:0.25in'>/;

         if (index($text,"/citation/",0) > 0)
            {
               print handleout3 $text;
            }
         if (index($text,"cfr external",0) > 0)
            {
               print handleout3 $text;
            }
         if (index($text,"usc external",0) > 0)
            {
               print handleout3 $text;
            }
         if (index($text,"class=\"external",0) > 0)
            {
               print handleout3 $text;
            }

         $text =~ s/<div [^\>]*>//;
         $text =~ s/<\/div>//;
         if ($text eq "</b></p>") {$text = "";}
         $text =~ s/(<p style='margin-left[^\n]*<\/a>[A-Z][\/|A-Z]+)([A-Z][a-z])/$1 $2/;
         $text =~ s/(<p style='margin-left[^\n]*<\/a>[A-Z]+\-[A-Z]+)([A-Z][a-z])/$1 $2/;
         $text =~ s/(<p style='margin-left[^\n]*<\/a>[a-z][A-Z][\/|A-Z]+)([A-Z][a-z])/$1 $2/;
         $text =~ s/ <a href=\"#table_of_contents/\n<br><a href=\"#table_of_contents/;
         $text =~ s/ <a href=\"#table_of_tables/\n<br><a href=\"#table_of_tables/;

         $text =~ s/<caption id=\"([^\.\"]*)\" class=\"table_title\">/<a name=\"$1\"><\/a>\n<caption>/;
         $text =~ s/ class=\"back_to_table_index\"//;
         $text =~ s/ class=\"back_to_top\"//;
         $text =~ s/<a href=\"\/articles[^\n\>]* class=\"missing_graphic\">[^\n\<]*<\/a>//;
         $text =~ s/ class=\"back\"//;
         $text =~ s/<a name=\"/<a name=\"$docid/g;
         $text =~ s/<a href=\"\#/<a href=\"\#$docid/g;
         $text =~ s/<table/<table class="fr"/g;
         $text =~ s/<th/<th class="fr"/g;
         $text =~ s/<td/<td class="fr"/g;
         print handleout $text;
         if (index($text,"<doc>",0) > -1)
            {
               print handleout $css;
            }
      }
  }

print handleout ":::uid ".$docid.$docnum."\n";
print handleout "\n</doc>\n";

close(handleout);
close(handleout2);
close(handleout3);

