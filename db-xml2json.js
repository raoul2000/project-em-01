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


function test1(){
  var xmlFilename = "C:\\Users\\Utilisateur\\Dropbox\\EidosMedia\\ctdb-data\\CTDB-merged.xml";
  fs.readFile(xmlFilename, function(err, data) {
    parser.parseString(data, function(err, json) {
      if (err) {
        console.error(err);
      } else {
        var customerArray = json.informations.customers[0].customer;
        for (var i = 0; i < customerArray.length; i++) {
          var resultCust = normalizeCustomer(customerArray[i]);
          if( i == 2 ) {
            console.log(JSON.stringify(resultCust));
          }
        }
      }
    });
  });
}

test1();
