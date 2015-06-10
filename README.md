Upload: A Client-side Encrypted Image Host
===

Upload is a simple host that client-side encrypts images, text, and other data, and stores them, with the server knowing nothing about the contents.
It has the ability to view images, text with syntax highlighting, short videos, and arbitrary binaries as downloadables.

Demo
---
We currently run a public demo server at https://up1.ca.

Example image: https://up1.ca/#blah - [(source)](http://www.fanpop.com/clubs/colors/images/29701480/title/colourful-stripes-wallpaper). Try dragging around the image to zoom in and out, RES-style!

Example text paste: https://up1.ca/#blah - [(source)](https://github.com/Upload/Upload/server.go)

Example short video: https://up1.ca/#blah - [(source)](https://youtu.be/O6Xo21L0ybE)

Example download file: https://up1.ca/#blah - [(source)](https://github.com/Upload/Upload/archive/master.zip)

This server is open to all users, so feel free to upload your own files.

Quick start
---
To install and run the server with default settings:

    apt-get install golang
    git clone https://github.com/upload/upload
    cd upload
    go build server.go
    ./server

Configuration is done through the `server.conf` file:

    {
      "listen": ":9000",
      "static_key": "c61540b5ceecd05092799f936e27755f",
      "static_delete_key": "bb77e727aefe632fb21ab857b98577c6",
      "maximum_file_size": 50000000
    }

`listen` is an address:port-formatted string, where either one are optional. Some examples include `":9000"` to listen on any interface, port 9000; `"1.2.3.4"` to listen on localhost port 80; `"1.1.1.1:8080"` to listen on 1.1.1.1 port 8080; or even `""` to listen on any interface, port 80.

`static_key` is a very basic security measure, requiring any client making an upload to know this key. This doesn't seem very useful and should be revamped; replace it with HTTP auth maybe?

`static_delete_key` is a key used to secure the deletion keys. Set this to something that only the server knows.

`maximum_file_size` is the largest file, in bytes, that's allowed to be uploaded to the server. The default here is a decimal 50MB.

External Tools
---

Currently, there are two external programs adapted to work with Upload: [ShareX](https://github.com/Upload/ShareX) [(relevant code changes)](https://github.com/Upload/ShareX/commits/uploadcrypt), and [upclient](https://github.com/Upload/upclient).

ShareX is a popular screenshot tool which supports tons of upload services, not just for images but also for text, video, documents, etc. This adapted version of ShareX includes a service which can send files to any Upload server. It uses .NET BouncyCastle for the crypto.

Upclient is a CLI tool which can send files or data to Upload servers either via unix pipe (`ps aux | up`), or via argument (`up image.png`), and returns a URL to the uploaded file on stdout. It runs on nodejs and uses SJCL for the crypto.

How it works
---

Before an image is uploaded, a "seed" is generated. This seed can be of any length (because really, the server will never be able to tell), but has a length of 25 characters by default. The seed is then run through SHA512, giving the AES key in bytes 0-255, the CCM IV in bytes 256-383, and the server's file identifier in bytes 384-511. Using this output, the image data is then encrypted using said AES key and IV using SJCL's AES-CCM methods, and sent to the server with an identifier. Within the encryption, there is also a prepended JSON object that contains metadata (currently just the filename and mime-type). The (decrypted) blob format starts with 2 bytes denoting the JSON character length, the JSON data itself, and then the file data at the end.

Image deletion functionality is also available. When an image is uploaded, a delete token is returned. Sending this delete token back to the server will delete the image. On the server side, `HMAC-SHA256(static_delete_key, identifier)` is used, where the key is a secret on the server.

Technologies
---

The browser-side is written in plain Javascript using SJCL for the AES-CCM encryption, with entropy obtained using the WebCrypto APIs and encryption performed within a Web Worker. The video and audio players just use the HTML5 players hopefully built into the browser. The paste viewer uses highlight.js for the syntax highlighting and line numbers.

Additionally, the repository copy of SJCL comes from the source at https://github.com/bitwiseshiftleft/sjcl, commit `fb1ba931a46d41a7c238717492b66201b2995840` (Version 1.0.3), built with the command line `./configure --without-all --with-aes --with-sha512 --with-codecBytes --with-random --with-codecBase64 --with-ccm`, and compressed using Closure Compiler. If all goes well, a self-built copy should match up byte-for-byte to the contents of `static/deps/sjcl.min.js`.

The server-side is written in Go and uses no dependencies outside of the standard library. The only cryptography it uses is for generating deletion keys, using HMAC and SHA256 in the built-in `crypto/hmac` and `crypto/sha256` packages, respectively.

Caveats
---

* **Encryption/Decryption are not streamed or chunked.** This means that (at the time) any download must fit fully in memory, or the browser may crash. This is not a problem with sub-10MB images, but may be a problem if you want to share an hour-long game video. We would love help and contributions, even if they break backwards compatibilty. As this project is still relatively new, the API is not sacred, so break away!

* **CCM is kinda slow.** Compared to other authenticated encryption modes out there such as GCM or OCB, CCM is considered one of the slower modes (slightly slower than GCM, and almost twice as slow as OCB), isn't parallelizable and [didn't make the best design decisions](http://crypto.stackexchange.com/a/19446). The reason that we chose this algorithm, however, is twofold: primarily, this is the most-audited, oldest and most commonly used algorithm contained in SJCL; as this is used for viewing data, security there is important - and secondly, the other two mentioned algorithms in SJCL were actually *slower* than CCM. There are other crypto libraries which may be allegedly faster, such as [asmcrypto.js](https://github.com/vibornoff/asmcrypto.js/), but it seems new, we don't know anything about it and currently prefer SJCL for its familiarity. With an audit from a trusted party, we may take a second look at asmcrypto.js.

* **By its very nature, this uses cryptography in Javascript.** There have been many reasons given as to why it's bad to use cryptography in Javascript, and some may be more valid than others. We're working on browser extensions to mitigate some of these reasons (and non-Javascript clients are always welcome!), but safe to say that if you unconditionally believe that Javascript crypto is bad, you probably won't want to use this.

* **As a new project, this code hasn't been audited by a trusted party.** Since this is brand new, there have been (to date) very few eyes on the code, and even fewer trusted eyes on the code. While we've put as much effort as possible into offloading the hard crypto stuff to SJCL, we still might have made a mistake somewhere (reading over `static/js/encryption.js` and letting us know if you find issues would be very helpful to us!), and so for that reason, using this software is at your own risk. 

Contributing
---
Any contributions, whether to our existing code or as separate applications, are very welcome! Additionally, as we're in the early stages of this project, we don't mind breaking the API if it's for a good reason.

We don't ask for any CLAs - you don't have to give up copyright on your code - however we prefer that you contribute under the MIT license, just for consistency.

Some of us idle on Freenode in `#upload`, if you would like to chat!

Thank you for you contributions!

License
---

The Upload server and browser code are both licensed under MIT.

ShareX's base code is licensed under GPLv2, however the modifications (namely, the C# encryption code) is licensed under MIT.

Upclient is licensed fully under MIT.
