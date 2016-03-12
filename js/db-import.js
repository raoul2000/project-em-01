'use strict';

var fs = require("fs");
var parser = require('xml2js');
var Q = require('q');

/**
* Applied on the JSON formatted CTDB, this method modifies the structure
* to make it more simple.
* @return {object} the simplified ctdb that contains only customer information
*/
function extractCustomers(ctdbJson) {
  /**
  *
  */
  var buildServlet = function(tomcat){
    var result = [];
    if(tomcat.servlet) {
        tomcat.servlet.forEach(function(serv){
            result.push({
                "rid"     : serv.$.rid,
                "version" : serv.$.version
            });
        });
    }
    return result;
  };
  /**
  *
  */
  var buildTomcat = function(serviceGroup){
    var result = [];
    if( serviceGroup.tomcats) {
        serviceGroup.tomcats.forEach(function(tomcats){
            tomcats.tomcat.forEach(function(tomcat){
                result.push({
                    "name"    : tomcat.$.name,
                    "port"    : tomcat.$.port,
                    "version" : tomcat.$.version,
                    "servlet" : buildServlet(tomcat)
                });
            });
        });
    }
    return result;
  };
  /**
  *
  */
  var buildComponent = function(serviceGroup){
    var result = [];
    if( serviceGroup.serverComponents ) {
        serviceGroup.serverComponents.forEach(function(serverComponents){
            if( serverComponents ) {
                serverComponents.serverComponent.forEach(function(serverComponent){
                    result.push({
                        "version" : serverComponent.$.version,
                        "rid"     : serverComponent.$.rid
                    });
                });
            }
        });
    }
    return result;
  };
  /**
  *
  */
  var buildServiceGroup = function(serviceGroups) {
    var results = [];
    serviceGroups.forEach(function(serviceGroups){
        serviceGroups.serviceGroup.forEach(function(serviceGroup){
            results.push( {
                "name"      : serviceGroup.$.name,
                "login"     : serviceGroup.login[0].$.name,
                "host"      : serviceGroup.host[0].$.name,
                "ip"        : (function(serviceGroup){
                        var result = null;
                        try {
                            result=serviceGroup.ip[0].$.value;
                        } catch (e) {
                          console.log('missing ip');
                        }
                        return result;
                })(serviceGroup),
                'component' : buildComponent(serviceGroup),
                'tomcat'    : buildTomcat(serviceGroup)
            });
        });
    });
    return results;
  };
  /**
  *
  */
  var buildGroup = function(infrastructure) {
    if( infrastructure.hasOwnProperty('environments') === false ) return null;
    var groups = [];
    infrastructure.environments[0].environment.forEach(function(environment){
        if(environment.methodeEnvironments) {
            environment.methodeEnvironments.forEach(function(methodeEnvironments){
                methodeEnvironments.methodeEnvironment.forEach(function(methodeEnvironment){
                    groups.push({
                        "name"          : methodeEnvironment.$.name,
                        "label"         : methodeEnvironment.$.label,
                        "serviceGroup"  : buildServiceGroup(methodeEnvironment.serviceGroups)
                    });
                });
            });
        }
    });
    return groups;
  };
  /**
  *
  */
  var buildEnv = function(site){
    if( site.infrastructures == null) return [];
    return site.infrastructures[0].infrastructure.map(function(infrastructure){
      return {
        'name' : infrastructure.$.name, // TODO : add cluster
        'group' : buildGroup(infrastructure)
      };
    });
  };
  /**
  *
  */
  var buildSite = function(customer){
    if( customer.sites === null) return [];
    return customer.sites[0].site.map(function(site){
      return {
        'name' : site.$.name,
        'env'  : buildEnv(site)
      };
    });
  };
  /**
  *
  */
  var buildCustomer = function(customer){
    return {
      'name' :  customer.$.name,
      'site' : buildSite(customer)
    };
  };

  return ctdbJson.informations. customers[0].customer.map(buildCustomer);
}

////////////////////////////////////////////////////////////////////////////

/**
 * Import an XML file representation of the db into json datastore
 * arg : {
 *     'xmlFilename' : full path to the XML filename,
 *     'store' :  {
 *         'servlet' : object nedb instance to store servlet info,
 *         'customer' : object nedb instance to store customer info
 *       }
 * }
 * Note that the property 'jsonData' is added after initialization
 * @param  {object} arg argument
 * @return {Promise}
 */
function importXMLFile(arg){

  /**
   * parse an XML file into a JSON object
   * @param  {string} xmlFilename the filename
   * @return {Promise}
   */
  function parseXML(arg){
    var deferred = Q.defer();
    fs.readFile(arg.xmlFilename, function(err, data) {
      if (err) {
        deferred.reject(new Error(err));
      }
      else {
        parser.parseString(data, function(err, result) {
          if (err) {
            deferred.reject(new Error(err));
          }
          else {
            arg.jsonData = result;
            deferred.resolve(arg);
          }
        });
      }
    });
    return deferred.promise;
  }

  function processServlet(arg){

    return Q.Promise(function(resolve, reject, notify){
      arg.store.servlet.remove({},{multi:true}, function(err, numRemoved){
        if(err) {
          reject(new Error(err));
        } else {
          var servletList = arg.jsonData.informations.servlets[0].servlet;
          for (var i = 0; i < servletList.length; i++) {
            console.log(servletList[i].$.id);
            var servletAttr = servletList[i].$;
            arg.store.servlet.insert({
              '_id'   : servletAttr.id,
              'label' : servletAttr.label,
              'type'  : servletAttr.type,
              'path'  : servletAttr.path,
              'wikiDocumentationPath' : servletAttr.wikiDocumentationPath,
              'wikiVersionsPath' : servletAttr.wikiVersionsPath
            });
          }
          resolve(arg);
        }
      });
    });
  }

  function processCustomer(arg){
    return Q.Promise(function(resolve, reject, notify){

      arg.store.customer.remove({},{multi:true}, function(err, numRemoved){
        if(err) {
          reject(new Error(err));
        } else {

          var customers = extractCustomers(arg.jsonData);
          for (var i = 0; i < customers.length; i++) {
            console.log("importing customer : "+customers[i].name);
            arg.store.customer.insert(customers[i]);
          }
          resolve(arg);
        }
      });
    });
  }

  function forceCompactDb(arg){

    var compactServlet = Q.Promise(function(resolve, reject, notify){
      // use 'once' instead of 'on' because we don't want this handler to
      // be invoked during built-in auto compaction
      arg.store.servlet.once('compaction.done',function(){
        console.log('db compaction (servlet ): done');
        resolve(arg);
      });
      // invoke the db compaction
      arg.store.servlet.persistence.compactDatafile();
    });

    var compactCustomer = Q.Promise(function(resolve, reject, notify){
      arg.store.customer.once('compaction.done',function(){
        console.log('db compaction (customer): done');
        resolve(arg);
      });
      // invoke the db compaction
      arg.store.customer.persistence.compactDatafile();
    });

    return Q.allSettled([compactServlet,compactCustomer]);
  }
  // add 'jsonData' property to the arg object. It will contain
  // the JSON representation of the XML file once parsed and converted
  // by 'parseXML'.
  arg.jsonData = null;

  // returns a promise
  return parseXML(arg)
    .then(processServlet)
    .then(processCustomer)
    .then(forceCompactDb);
}


function test1() {


    var Datastore = require('nedb');
    var servletDb = new Datastore({
      filename: './tmp/servlet.db',
      autoload: true
    });
    var customerDb = new Datastore({
      filename: './tmp/customer.db',
      autoload: true
    });

    var arg = {
      'xmlFilename' : __dirname + '/../CTDB-merged.xml',
      'store' :  {
        'servlet' : servletDb,
        'customer' : customerDb
      }
    };
    importXMLFile(arg)
    .then(function(result){
      console.log("done : "+result.store.servlet.filename);
    });
}

//test1();
