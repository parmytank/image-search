var express = require('express');
var request = require('request');
var app = express();
var encodedAppKey = new Buffer(':' + process.env.AppKey).toString('base64');
var perPage = 10;
var start = 0;
var path = require('path');

//connect to database
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var mongourl = process.env.MONGOLAB_URI;

MongoClient.connect(mongourl, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    console.log('Connection established to', mongourl);

    var searches = db.collection('searches');

    app.get('/', function(req,res){
        res.sendFile(path.join(__dirname +'/intro.html'));
    })
    app.get('/api/imagesearch/:input', function(req, res){
        var searchTerms = req.params.input;
        if(req.query.offset > 0){
            start = parseInt(req.query.offset);
        } else {start = 0;}
        
        var display = req.query.display;
        
        searches.insert({'term':searchTerms,'when': new Date()}, function(){
        });
        
        var options = {
            url: "https://api.datamarket.azure.com/Data.ashx/Bing/Search/Image?Query='" + searchTerms + 
            "'&$top=" + (start + perPage) + "&$format=JSON",
            headers: {
            "Authorization": "Basic " + encodedAppKey
          }
        };
        
        var resultArray = [];
        
        request(options, function (error, response, body) {
            if(error) console.log('error' + error);
            if (!error) {
                var images = JSON.parse(response.body).d.results;
                
                for(var i = start; i < (start + perPage); i++){
                    if (i >= images.length){break;}
                    resultArray.push({'index':i,'url':images[i].MediaUrl, 
                        'snippet':images[i].Title,
                        'thumbnail':images[i].Thumbnail.MediaUrl,
                        'context':images[i].DisplayUrl
                    });
                }
                
                if(display){
                    res.write('<style type=text/css>img{width:100px;height:100px;margin:1px}</style>');
                    res.write('<html><body>');
                    for(var i = 0; i < resultArray.length; i++){
                        res.write('<img src="' + resultArray[i].url + '">');
                    }
                    res.end('</body></html>');
                }else {
                    res.end(JSON.stringify(resultArray));
                }
            }
        })
    });
    
    app.get('/api/latest/imagesearch/', function(req, res){
        searches.find(
            {},
            {term:1,when:1,_id:0}
            ).toArray(function(err,item){
                if(err) throw err;
                res.end(JSON.stringify(item));
            });
    });
    
    app.listen(process.env.PORT, process.env.IP);
  }
});


