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
   * @param  {[type]} url   [description]
   * @param  {[type]} store [description]
   * @return {[type]}       [description]
   */
  function loadStore(url, store){
    var deferred = Q.defer();

    $.getJSON(url, function(remoteStore){
      store.remove({},{multi:true}, function(err,numRemoved){
        if(err) {
          deferred.reject(new Error(err));
        } else {
          remoteStore.forEach(function(item) {
            console.log(':' + item.name);
            store.insert(item);
          });
          deferred.resolve();
        }
      });
    })
    .fail(function(arg){
      console.error("failed to load store : "+store.filename);
      deferred.reject();
    });
    return deferred;
  }

  return Q.allSettled([
    loadStore('data/customer.db', db),
    loadStore('data/servlet.db', dbServlet)
  ]);
}

/**
 * [loadDB description]
 * @param  {Function} done     [description]
 * @param  {[type]}   progress [description]
 * @return {[type]}            [description]
 */
function loadDB(done, progress) {

  function loadRemoteDB(remoteDBMeta, localDBMeta) {
    console.log('loading db and meta from remote : localDBMeta = ');
    console.log(localDBMeta);
    console.log('remoteDBMeta = ');
    console.log(remoteDBMeta);

    // expected :
    // [ object, object, object ...]
    progress('loading remote db');
    $.getJSON('server/db/data.json', function(remoteDB) {
      // delete local DB and replace with remote
      db.remove({}, {
        multi: true
      }, function(err, numRemoved) {
        if (err) {
          console.error(err);
          throw err;
        }
        console.log('existing db cleared : ' + numRemoved + ' records deleted');
        console.log('inserting rows ..');
        console.log(remoteDB);
        progress('updating local db');
        remoteDB.forEach(function(item) {
          console.log(':' + item.name);
          db.insert(item);
        });

        // update or insert the db meta record
        if( localDBMeta) {
          localDBMeta.version = remoteDBMeta.version;
          dbMeta.update({ _id : localDBMeta._id}, localDBMeta);
          console.log('local DB has been updated');
        } else {
          console.log('local DB has been inserted');
          dbMeta.insert(remoteDBMeta);
        }
        console.log('local DB version is now ' + remoteDBMeta.version);
        progress('db updated');
        done();
      });
    })
    .fail(done);
  }

  // get latest db version from server
  // expected : { version : XXXX }
  console.log('loading remote DB meta...');
  progress('checking latest version');
  $.getJSON('server/db/version.json', function(remoteDBMeta) {
    dbMeta.findOne({}, function(err, localDBMeta) {
      if (err) throw err;

      if (localDBMeta === null) {
        console.log('no local db metadata available');
        loadRemoteDB(remoteDBMeta);
      } else {
        // compare local dbVersion with remote dbVersion
        console.log('DB version : local = ' + localDBMeta.version + ' remote = ' + remoteDBMeta.version);
        if (remoteDBMeta.version > localDBMeta.version) {
          loadRemoteDB(remoteDBMeta, localDBMeta);
        } else {
          done();
        }
      }
    });
  })
  .fail(function(){
    done();
  });
}
