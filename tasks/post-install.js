function DownloadAndUnzip(URL, path){
    var unzip = require('unzip');
    var https = require('https');
    var request = https.get(URL, function(response) {
        response.pipe(unzip.Extract({"path":path}));
    });
}

console.log('downloading and install JQuery.mmenu 5.6.2');
DownloadAndUnzip('https://codeload.github.com/FrDH/jQuery.mmenu/zip/v5.6.2', './vendor');
