**This is a work in progress**

A desktop application and a web app to navigate into a simple embeded database.

*warning* : Before running this app you must ensure that native DB data are available as XML file (they are not committed in this repo).

## Install

```
git clone https://github.com/raoul2000/project-em-01.git
cd project-em-01
npm install
```

## Usage

### Desktop app
```
npm start
```

To build the desktop app for windows (platform=win32 arch=x64) you may use :
```
npm run package
```

Once built, the result of the package is available in the folder `ctdb-explorer-win32-x64`.

### Web app

The *web app* has been tested on Firefox and Chrome.

To run it from the working folder you must have an HTTP server available and navigate to `webapp.html`.

Here we are going to use **http-server**. If not done, install is globally with :
```
npm install http-server -g
```
Then start the server :
```
http-server . -o webapp.html
```
