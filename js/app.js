
var isElectron = (window && window.process && window.process.type) !== undefined;

var currentSelection = null;
/**
 * Handlebars helper used to create an url for group selection. this
 * url is used in the main menu (left sliding mmenu)
 */
Handlebars.registerHelper('create_url_group', function( customer, site , env, group) {

  var url = encodeURI([customer, site, env, group].join('/'));
  return new Handlebars.SafeString(url);
});
/**
 * Register handlebars helper to generate the url to the serviceGroup. this
 * url is used in the tab appearing on the group view template.
 */
Handlebars.registerHelper('create_url_service_group', function( customer, site , env, group, serviceGroup) {

  var url = encodeURI([customer, site, env, group, serviceGroup].join('/'));
  return new Handlebars.SafeString(url);
});

/**
 * Register handlebars helper to display the colored box that contains
 * the env and group name currenty selected. This box is displayed in the
 * group view template
 */
Handlebars.registerHelper('env_group_alert', function() {
  var alertClass = {
    'PROD': 'alert-danger',
    'QA': 'alert-info',
    'DEV': 'alert-success'
  };
  var cssClass = "alert-warning";
  if (alertClass.hasOwnProperty(this.env)) {
    cssClass = alertClass[this.env];
  }
  return new Handlebars.SafeString(
    '<div class="alert ' + cssClass + '" role="alert" style="float: right; position: relative; top: 17px; right: 0px;margin-bottom:0px;">' +
    '<b>' + this.env + '</b> / ' + this.group.label +
    '</div>'
  );
});

function getGroup(customer, selectedGroup) {

  for (var i = 0; i < customer.site.length; i++) {
    if( customer.site[i].name === selectedGroup.site) {
      for (var j = 0; j < customer.site[i].env.length; j++) {
        if( customer.site[i].env[j].name == selectedGroup.env) {
          for (var k = 0; k < customer.site[i].env[j].group.length; k++) {
            if( customer.site[i].env[j].group[k].name == selectedGroup.group.name) {
              return customer.site[i].env[j].group[k];
            }
          }
        }
      }
    }
  }
  return null;
}
/**
 * Helper function to resolve a template and insert it into the DOM
 * @param  {string} tmplId   the template id
 * @param  {string} targetId the id of the DOM element tht will
 * receive the resolved template markup
 * @param  {object} context  hash object used to resolve the template
 */
function resolveTemplate(tmplId, targetId, context) {
  template = Handlebars.compile(
    $('#' + tmplId).html()
  );
  result = template(context);
  $('#' + targetId).html(result);
}
/**
 * Attach live filter handlers that are applied to servlet
 * and components
 */
function enableLiveFilter() {

  var fnFilterHandler = function(selText, selCount) {
    return function() {
      var filter = $(this).val(),
        count = 0;
      var targets = $(selText);
      if (filter.length === 0) {
        targets.removeClass('success');
        targets.show();
      } else {
        targets.each(function() {
          if ($(this).text().search(new RegExp(filter, "i")) < 0) {
            $(this).hide();
            //$(this).addClass('active');
          } else {
            $(this).show();
            $(this).addClass('success');
            count++;
          }
        });
        $(selCount).text("" + count);
      }
    };
  };

  // attach handler
  $("#filter-servlet").keyup(fnFilterHandler(".servlet-info-tr", "#filter-servlet-count"));
  $("#filter-comp").keyup(fnFilterHandler(".comp-info-tr", "#comp-servlet-count"));

  $('#btn-servlet-search').on('click', function(ev) {
    $('#filter-servlet-wrapper').toggle();
  });

  $('#btn-comp-search').on('click', function(ev) {
    $('#filter-comp-wrapper').toggle();
  });
}

/**
 * [function description]
 *
 * @param  {[type]} type  [description]
 * @param  {[type]} ip    [description]
 * @param  {[type]} port  [description]
 * @param  {[type]} rid   [description]
 * @param  {object} local [description]
 * @return {[type]}       [description]
 */
var openURL = function(type, ip, port, rid, local) {
    console.log('openURL : type = '+type+' ip = '+ip+' port = '+port+' rid = '+rid+' local = '+JSON.stringify(local));

    if( type === 'tomcat-manager'){
      doOpenUrl('http://'+ip+':'+port+'/manager/html');
    } else {
      if( local.path !== undefined) {

      }
      dbServlet.findOne({ _id : rid}, function(error, doc){
        if(error){
          alert(error);
        } else {
          var url = '';
          switch (type) {
            case "servlet-page":
              url = 'http://'+ip+':'+port+ (local.path === undefined ? doc.path : local.path);
              break;
            case "servlet-doc":
              url = doc.wikiDocumentationPath;
              break;
            case "servlet-change":
              url = doc.wikiVersionsPath;
              break;
            default:
            alert('Adress not found');
            url = null;
          }
          if(url !== null) {
            console.log('opening url = '+url);
            doOpenUrl(url);
          }
        }
      });

    }
};


/**
* initialize the menu template and MMenu plugin
*/
function initGUI(){

  $('#app').on('click',function(ev){
    var target = $(ev.target);
    if( target.prop('tagName') === 'A' && target.hasClass('open-url-external')){
      console.log("opening external url");
      ev.preventDefault();
      ev.stopPropagation();
      try {
        openURL(
          target.data('type'),
          target.data('ip'),
          target.data('port'),
          target.data('rid'),
          {
            path : target.data('path'),
            label : target.data('label')
          }
        );
      } catch (e) {
        console.error("failed to invoke openUrl");
      }
    }
  });
  var deferred = Q.defer();

  var createMenu = function(docs){
    resolveTemplate("tmpl-menu", "my-menu", {
      customer: docs
    });

    $('nav#my-menu').mmenu({
      "iconPanels": true,
      "searchfield": true,
      "navbar": {
        "title": 'Customers'
      },
      "onClick": {
        "close": true,
        "preventDefault": false
      },
      "extensions": ["pagedim-black", "pageshadow"]
    });
    // get a reference to the MMenu instance
    var api = $("nav#my-menu").data( "mmenu" );

    // update menu icon depending on open/close action
    api.bind('opened',function($panel){
      $('#icon-menu')
        .removeClass('glyphicon-menu-hamburger')
        .addClass('glyphicon-remove');
    }).bind('closed',function($panel){
      $('#icon-menu')
        .removeClass('glyphicon-remove')
        .addClass('glyphicon-menu-hamburger');
    });

  };

  // load all record (customers) from db as we need them to be
  // able to build the MMenu widget. The returned document array
  // is sorted on the cusomer name field.

  db.find({}).sort({name : 1 }).exec(function(err,docs){
    if(err) {
      deferred.reject(new Error(err));
    } else {
      createMenu(docs);
      deferred.resolve();
    }
  });

  return deferred;
}

function doOpenUrl(url){
  if( isElectron ) {
    var shell = require('electron').shell;
    shell.openExternal(url);
  } else {
    window.open(url,"_blank");
  }
}
/**
 * Initialize the router library
 */
function initRouter() {

  var showGroupView = function(customer, site, env, group) {
    /**
     * Resolve the template that displays the group selected
     * by the user from the left main menu and attache event
     * handlers to this template.
     * @param  {object} context the data context used to resolve the template
     */
    var createGroupView = function(context){
      //resolveTemplate("tmpl-group", "content", selectedGroup);
      resolveTemplate("tmpl-group", "content", context);

      $('.tab-group').on('click', function(ev) {
        $('#tabs-row > li').removeClass('active');
        $(ev.target).parent().addClass('active');
      });

      var defaultTab = $('.tab-group').first();
      defaultTab.trigger('click');
      document.location = defaultTab.attr('href');
    };

    // prepare function arguments
    currentSelection = {
      'customer' : decodeURI(customer),
      'site'     : decodeURI(site),
      'env'      : decodeURI(env),
      'group'    : {
        'name' : decodeURI(group)
      }
    };

    db.find({
      $and : [
        { 'name'                : currentSelection.customer },
        { 'site.name'           : currentSelection.site },
        { 'site.env.name'       : currentSelection.env },
        { 'site.env.group.name' : currentSelection.group.name }
      ]
    }, function(err,docs){
      if(docs.length === 1 ){
        var selectedGroup = getGroup(docs[0],currentSelection);
        currentSelection.group = selectedGroup;
        createGroupView(currentSelection);
      } else {
        alert('Error : unkown group');
      }
    });
  };

  /**
   * Displays a service Group.
   * To do so, a sub template is resolved when the user click on a service
   * group tab.
   * @param  {string} customer     the customer name
   * @param  {string} site         the site name
   * @param  {string} env          the environment name
   * @param  {string} group        the group name
   * @param  {string} serviceGroup the service group name
   */
  var showServiceGroupView = function(customer, site, env, group, serviceGroup) {
    // currentSelection is global
    currentSelection = {
      'customer' : decodeURI(customer),
      'site'     : decodeURI(site),
      'env'      : decodeURI(env),
      'group'    : {
        'name' : decodeURI(group)
      },
      'serviceGroup' : decodeURI(serviceGroup)
    };

    db.find({
      $and : [
        { 'name'                : currentSelection.customer },
        { 'site.name'           : currentSelection.site },
        { 'site.env.name'       : currentSelection.env },
        { 'site.env.group.name' : currentSelection.group.name }
      ]
    }, function(err,docs){
      if(docs.length === 1 ){
        var selectedGroup = getGroup(docs[0],currentSelection);
        currentSelection.group = selectedGroup;

        for (var i = 0; i < currentSelection.group.serviceGroup.length; i++) {
          if (currentSelection.group.serviceGroup[i].name == currentSelection.serviceGroup) {
            resolveTemplate("tmpl-group-detail", "tab-content", currentSelection.group.serviceGroup[i]);
            enableLiveFilter();
            break;
          }
        }
      } else {
        alert('Error : failed to get the group selected');
      }
    });
  };


  var router = Router();

  var fragmentRE = /([\w '\+\-%]+)/;
  router.param('customer',fragmentRE);
  router.param('site',fragmentRE);
  router.param('env',fragmentRE);
  router.param('group',fragmentRE);
  router.param('serviceGroup',fragmentRE);
/*
  router.on('/group/:customer/:site/:env/:group', function(customer, site, env, group){
    alert('group : '+group);
  });
*/
  router.on("/group/:customer/:site/:env/:group", showGroupView);
  router.on("/serviceGroup/:customer/:site/:env/:group/:serviceGroup" , showServiceGroupView);
  //router.on("/openURL/:type/:ip/:port/:rid", openURL);

  // start router listen
  //var router = Router(routes);
  router.init();
  return true;
}
/**
 *
 */
 function main(cb) {

   var progress = function(msg){
     $('#txt-progress').html(msg);
   };

   var done = function(){
     initRouter();
     initGUI(progress);
     if( cb ) cb();
   };

   //loadDB(done,progress);
   loadAllStores()
   .then(initRouter)
   .then(initGUI)
   .then(function(result){
     console.log("Data loaded and ready");
     // we are all done : show main view
     $('#btn-start-app').on('click',function(){
       $('#splash').fadeOut(function(){
         $('#page').fadeIn(100);
       });
     });
     $('#btn-start-app').prop('disabled',false);
     $('#btn-start-app').html('Enter');

   })
   .fail(function(error){
     alert(error);
   });
 }
