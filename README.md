Upload - Client-side Encrypted Image Host
===

Upload is a simple host that client-side encrypts images, text, and other data, and stores them, with the server knowing nothing about the contents. It uses AES-CCM for the encryption.


How it works
---

When an image is uploaded, a "seed" is generated. This seed can be of any length (because really, the server will never be able to tell). When an image is then generated or accessed, the seed is run through SHA512. The first 256 bits are used for the AES key, the next 128 bits are used for the CCM IV, and the last 128 bits are used as an identifier on the server for the encrypted image data.

Image deletion functionality is also available. When an image is uploaded, a delete token is returned. Sending this delete token back to the server will delete the image. On the server side, HMAC-SHA256(key, identifier) is used, where the key is a secret on the server.

There is also a static key that is used between the client and server for uploading - that is, you can't upload if you don't know the static key. The included server allows the option of setting HTTP auth on the upload page, which will protect the static key from external users. This allows outsiders to view images but not upload them.


Technologies
---

The browser-side is written in plain Javascript using SJCL for the AES-CCM encryption. Everything is HTML5 and its associated Javascript APIs, but should work in IE10 and later, plus any decently modern copy of Firefox, Chrome or Safari.

The server-side is written in Go and uses no dependencies outside of the standard library. In order to build it, install the go compiler and run `go build server.go`, then run the `./server` executable.


External tools
---

Currently, there are two external programs adapted to work with EncImg: [ShareX](todo:link-to-sharex) [(relevant code changes)](todo:link-to-commit), and [Scup](todo:link-to-scup) [(relevant code changes)](todo:link-to-commit). At this point in time, these both use hard-coded static keys, and so the source would need to be modified to change this. We hope to fix this in the near future.


Configuration
---

The main place you will find configuration settings are in `server.conf`. It's here that you can set things like listening port, hostname, static key, etc.

If you choose to change the default static key (recommended if you run a private instance), you will also need to change it on the upload page. The configuration settings can be found at the top of `web/upload.html`. Here, you can also change the length of the seed (by default it's 20 characters).

**It is important to make sure the `i/` directory is writable by the server.** This is where image data is stored.

Building
---
To build the server, download the Go language compiler, and run `go build server.go` in the root of this repository. You can then run the server via `./server`. There is no separate compilation step needed for the client side Javascript.


Caveats
---

This application uses Javascript crypto in the browser. There are numerous articles on why this is a bad idea, and numerous reasons why it should not be done. Be aware that while this software has a high probability of being safe, it does not guarantee in any way that your images won't be seen by unintended users, and beyond that is experimental and unaudited software (despite being very little code to audit). Use at your own risk.


License
---

This software is licensed under the MIT license. Do whatever you want with it!
