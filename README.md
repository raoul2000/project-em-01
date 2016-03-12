**This is a work in progress**

# CTDB Explorer

## Install

```
git clone [repo]
cd repo
npm install
```

## Usage

### desktop app
```
npm start
```

To build the desktop app for windows (platform=win32 arch=x64) you may use :
```
npm run package
```

Once built, the result of the package is available in the folder `ctdb-explorer-win32-x64`.

### web app

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
