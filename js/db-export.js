'use strict';

var fs = require("fs");
var parser = require('xml2js');
var Q = require('q');

/**
 * Exports all datastores (nedb) to a folder.
 * Each store is saved as a json array, where each item is a nedb record.
 *
 * @param  {string} folderName destination folder where files are created
 * @return {Promise}            [description]
 */
function exportToFolder(folderName) {

  function exportStore(store, filename){
    var deferred = Q.defer();
    store.find({},function(err,docs){
      if(err) {
        deferred.reject(new Error(err));
      } else {
        var result = [];
        for (var i = 0; i < docs.length; i++) {
          result.push(docs[i]);
        }
        fs.writeFile(filename,JSON.stringify(result),'utf8',function(err){
          if(err){
            deferred.reject(new Error(err));
          }else {
            deferred.resolve(filename);
          }
        });
      }
    });
  }

  return Q.allSettled([
    exportStore(db, folderName + '/customer.db'),
    exportStore(dbServlet, folderName + '/servlet.db')
  ])
  .then(function(result){
    console.log('done : ');
    console.log(result);
  }).fail(function(err){
    console.error(err);
  });
}
