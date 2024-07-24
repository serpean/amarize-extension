# <img src="public/icons/icon_48.png" width="45" align="left"> Amarize Extension

Ama(Summa)rize is a Chrome extension that summarizes Amazon reviews using Perplexity API.

## Features

- Configure Perplexity API Key
- Summarize Amazon Reviews

## Install in Chrome

[**Chrome** extension]() <!-- TODO: Add chrome extension link inside parenthesis -->


### Local Installation

```sh
cd amarize-extension
```

Inside the newly created project, you can run some built-in commands:

#### `npm run watch`

Runs the app in development mode.<br>
Then follow these instructions to see your app:
1. Open **chrome://extensions**
2. Check the **Developer mode** checkbox
3. Click on the **Load unpacked extension** button
4. Select the folder **amarize-extension/build**

### Publish to Chrome Web Store

#### `npm run build`

Builds the app for production to the build folder.<br>
Run `npm run pack` to
zip the build folder and your app is ready to be published on Chrome Web Store.<br>
Or you can zip it manually.

#### `npm run pack`

Packs the build folder into a zip file under release folder.

#### `npm run repack`

Rebuilds and packs the app into a zip file.
It is a shorthand for `npm run build && npm run pack`.


### Miscellaneous

#### `npm run format`

Formats all the HTML, CSS, JavaScript, TypeScript and JSON files.

#### Project Structure



It will create a directory called `my-extension` inside the current folder.<br>
Inside that directory, it will generate the initial project structure and install the transitive dependencies:

```
amarize-extension
├── README.md
├── node_modules
├── package.json
├── .gitignore
├── config                    // Webpack with minimal configurations
│   ├── paths.js
│   ├── webpack.common.js
│   └── webpack.config.js
├── public
│   ├── icons
│   │   ├── icon_16.png
│   │   ├── icon_32.png
│   │   ├── icon_48.png
│   │   ├── icon_128.png
│   ├── *.html                // HTML files will vary depending on extension type
│   └── manifest.json
└── src
    ├── *.css                 // CSS files will vary depending on extension type
    └── *.js                  // JS files will vary depending on extension type
```

## Contribution

Suggestions and pull requests are welcomed!.

---

This project was bootstrapped with [Chrome Extension CLI](https://github.com/dutiyesh/chrome-extension-cli)
