upload.modules.addmodule({
    name: 'updown',
    init: function () {
        // We do this to try to hide the fragment from the referral in IE
        this.requestframe = document.createElement('iframe')
        this.requestframe.src = 'about:blank'
        this.requestframe.style.visibility = 'hidden'
        document.body.appendChild(this.requestframe)
    },
    downloadfromident: function(seed, progress, done, ident) {
        var xhr = new this.requestframe.contentWindow.XMLHttpRequest()
        xhr.onload = this.downloaded.bind(this, seed, progress, done)
        xhr.open('GET', (upload.config.server ? upload.config.server : '') + 'i/' + ident.ident)
        xhr.responseType = 'blob'
        xhr.onerror = this.onerror.bind(this, progress)
        xhr.addEventListener('progress', progress, false)
        xhr.send()
    },
    onerror: function(progress) {
      progress('error')
    },
    downloaded: function (seed, progress, done, response) {
        if (response.target.status != 200) {
          this.onerror(progress)
        } else {
          this.cache(seed, response.target.response)
          progress('decrypting')
          crypt.decrypt(response.target.response, seed).done(done)
        }
    },
    encrypted: function(progress, done, data) {
        var formdata = new FormData()
        formdata.append('api_key', upload.config.api_key)
        formdata.append('ident', data.ident)
        formdata.append('file', data.encrypted)
        $.ajax({
            url: (upload.config.server ? upload.config.server : '') + 'up',
            data: formdata,
            cache: false,
            processData: false,
            contentType: false,
            dataType: 'json',
            xhr: function () {
                var xhr = new XMLHttpRequest()
                xhr.upload.addEventListener('progress', progress, false)
                return xhr
            },
            type: 'POST'
        }).done(done.bind(undefined, data))
    },
    cache: function(seed, data) {
      this.cached = data
      this.cached_seed = seed
    },
    cacheresult: function(data) {
      this.cache(data.seed, data.encrypted)
    },
    download: function (seed, progress, done) {
        if (this.cached_seed == seed) {
          progress('decrypting')
          crypt.decrypt(this.cached, seed).done(done).progress(progress)
        } else {
          crypt.ident(seed).done(this.downloadfromident.bind(this, seed, progress, done))
        }
    },
    upload: function (blob, progress, done) {
        crypt.encrypt(blob).done(this.encrypted.bind(this, progress, done)).done(this.cacheresult.bind(this)).progress(progress)
    }
})
