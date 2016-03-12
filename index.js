'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// module to handle native dialog box
const dialog = require('electron').dialog;
// module to handle IPC Events
const ipcMain = require('electron').ipcMain;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600, frame : true});

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/app.html');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Display the open file dialog box so the user can select the XML
 * file to import.
 * If no file is selected, the value null is returned in the event reply,
 * otherwise the selected file paht is returned.
 */
ipcMain.on('open-file-message', function(event, arg) {
  var filename = dialog.showOpenDialog({
    title : "Select the XML file to import",
    filters : [
      { name : 'XML file', extensions : ['xml']}
    ],
    properties: [ 'openFile' ]
  });

  event.sender.send(
    'open-file-reply',
    Array.isArray(filename) ? filename[0] : null
  );
});
