---
title: Troubleshooting
description: A collection of common issues for new developers, and solutions to those problems.
---

# Troubleshooting

This page contains a collection of common issues for new developers, and solutions to those problems.

## I need to use Webpack 4

We recommend using Webpack 5 with your projects. However, some popular tools like create-react-app require Webpack 4 in order to run properly. To get around this issue, add the following import to the top of your `.js` scripts to import the pre-webpack-bundled version of Web3.Storage:

```javascript
import { Web3Storage } from 'web3.storage/dist/bundle.esm.min.js'
```

## The status information for my content doesn't include any Filecoin deals

Content uploaded to Web3.Storage is persisted to Filecoin in batches, and newly uploaded content may take up to 48 hours to be stored on Filecoin. If more than 48 hours have elapsed since upload, and a [status request][howto-query] for your content returns no `deals` information, please [contact us][contact-us] so that we can investigate.



## Files downloaded via an IPFS gateway have awkward names

Depending on the type of URL used to request content from an IPFS HTTP gateway, some web browsers may save downloaded files with generic filenames like `download`, or they may use the CID of the content as the filename. See [Setting the filename for downloads via gateways][howto-retrieve-gateway-filenames] in the [Retrieval guide][howto-retrieve] to learn how to work around this issue.


## The CID returned when uploading doesn't link directly to my file

By default, the CID returned when uploading files to Web3.Storage will be wrapped in a directory listing in order to preserve the original filename. The CID returned by API points to the directory object, which in turn points to the file's content.

See the [Directory Wrapping section](./store.md#directory-wrapping) of the [Storage guide][howto-store] for more information about working with directory CIDs and instructions on changing the default behavior.

[howto-store]: ./store.md
[howto-query]: ./query.md
[howto-retrieve]: ./retrieve.md
[howto-retrieve-gateway-filenames]: ./retrieve.md#setting-the-filename-for-downloads-via-gateways
[contact-us]: ../community/help-and-support.md