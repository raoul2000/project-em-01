var db = new Nedb({
  filename: 'ctdb',
  autoload: true
});
var dbMeta = new Nedb({
  filename: 'ctdb_meta',
  autoload: true
});
var dbServlet = new Nedb({
  filename: 'servlet',
  autoload: true
});

if( Q === undefined ){
  Q = require('q');
}

function loadAllStores(){

  /**
   * [loadStore description]
   * @param  {[type]} url   data store url
   * @param  {[type]} store Nedb instance representing the store
   * @return {Promise}
   */
  function loadStore(url, store){

    return Q.Promise(function(resolve,reject) {
      console.log("loading store : "+store.filename);
      $.getJSON(url, function(remoteStore){
        store.remove({},{multi:true}, function(err,numRemoved){
          if(err) {
            reject(new Error(err));
          } else {
            remoteStore.forEach(function(item) {
              store.insert(item);
            });
            console.log("store loaded : "+store.filename+ " ("+remoteStore.length+" rows)");
            resolve();
          }
        });
      })
      .fail(function(arg){
        console.error("failed to load store : "+store.filename);
        reject();
      });
    });
  }
  
  // TODO : before loading store, check if remote data is more recent than
  // local and if not, don't dowload.
  // TODO : if stores have been imported from local XML file, there should not
  // be upload from server

  return Q.allSettled([
    loadStore('data/customer.db', db),
    loadStore('data/servlet.db', dbServlet)
  ]);
}
