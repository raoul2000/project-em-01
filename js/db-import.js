'use strict';

var fs = require("fs");
var parser = require('xml2js');
var Q = require('q');

/**
* Applied on the JSON formatted CTDB, this method modifies the structure
* to make it more simple.
* @return {object} the simplified ctdb that contains only customer information
*/
function normalizeCustomer(customer) {
  /**
  *
  */
  var buildServlet = function(tomcat){
    var result = [];
    if( Array.isArray(tomcat.servlet)) {
        tomcat.servlet.forEach(function(serv){
            result.push({
                "rid"     : serv.$.rid,
                "version" : serv.$.version,
                "label"   : serv.$.label,
                "path"    : serv.$.path
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
    if( Array.isArray(serviceGroup.tomcats) ) {
        serviceGroup.tomcats.forEach(function(tomcats){
          if( Array.isArray(tomcats.tomcat)) {
            tomcats.tomcat.forEach(function(tomcat){
              result.push({
                "name"    : tomcat.$.name,
                "port"    : tomcat.$.port,
                "version" : tomcat.$.version,
                "servlet" : buildServlet(tomcat)
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
  var buildComponent = function(serviceGroup){
    var result = [];
    if( Array.isArray(serviceGroup.serverComponents) ) {
        serviceGroup.serverComponents.forEach(function(serverComponents){
            if( Array.isArray(serverComponents.serverComponent)  ) {
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
  var buildServiceGroup = function(methodeEnvironment) {
    var results = [];
    if( Array.isArray(methodeEnvironment.serviceGroups) && methodeEnvironment.serviceGroups.length !== 0)  {
      methodeEnvironment.serviceGroups[0].serviceGroup.forEach(function(serviceGroup){
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
    }
    return results;
  };
  /**
  *
  */
  var buildEnv = function(infra) {
    var envs = [];
    if( Array.isArray(infra.environments) && infra.environments.length !== 0) {
      infra.environments[0].environment.forEach(function(environment){
        if(Array.isArray(environment.methodeEnvironments) && environment.methodeEnvironments.length !== 0 ) {
          environment.methodeEnvironments[0].methodeEnvironment.forEach(function(methodeEnvironment){
            envs.push({
              "name"          : methodeEnvironment.$.name,
              "label"         : methodeEnvironment.$.label,
              "serviceGroup"  : buildServiceGroup(methodeEnvironment)
            });
          });
        }
      });
    }
    return envs;
  };
  /**
  *
  */
  var buildInfra = function(site){
    var result = [];
    if( Array.isArray(site.infrastructures) && site.infrastructures.length !== 0) {
      site.infrastructures[0].infrastructure.map(function(infra){
        result.push({
          'name' : infra.$.name, // TODO : add cluster
          'env' : buildEnv(infra)
        });
      });
    }
    return result;
  };
  /**
  *
  */
  var buildSite = function(customer){
    var result = [];
    if( Array.isArray(customer.sites) && customer.sites.length !== 0) {
      customer.sites[0].site.map(function(site){
        result.push({
          'name'   : site.$.name,
          'infra'  : buildInfra(site)
        });
      });
    }
    return result;
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

  return buildCustomer(customer);
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
    // TODO : why use defered ? why not Promise ?
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
          if( Array.isArray(arg.jsonData.informations.servlets)
            && arg.jsonData.informations.servlets.length !==0) {

            var servletList = arg.jsonData.informations.servlets[0].servlet;
            for (var i = 0; i < servletList.length; i++) {
              console.log("normalizing servlet (id): "+servletList[i].$.id);
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
          try {
            var customerList = arg.jsonData.informations.customers[0].customer;
            for (var i = 0; i < customerList.length; i++) {
              console.log("normalizing customer : "+customerList[i].$.name);
              var customerOk = normalizeCustomer(customerList[i]);
              arg.store.customer.insert(customerOk);
            }
            resolve(arg);
          } catch (e) {
            reject(e);
          }
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
      'xmlFilename' : __dirname + '/../data/CTDB-merged.xml',
      'store' :  {
        'servlet' : servletDb,
        'customer' : customerDb
      }
    };

    importXMLFile(arg)
    .then(function(result){
      console.log("terminated");
    })
    .fail(function(err){
      console.error(err);
    })
    ;
}

//test1();
