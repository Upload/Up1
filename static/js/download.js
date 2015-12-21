upload.modules.addmodule({
    name: 'download',
    delkeys: {},
    // Dear santa, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/template_strings
    template: '\
      <div class="modulecontent" id="dlarea">\
        <div class="topbar">\
        <h1 id="downloaded_filename"></h1>\
        <div class="viewswitcher">\
          <a id="editpaste" class="btn">Edit Paste</a\
          ><a class="btn" id="newupload" href="#">New Upload</a>\
        </div>\
        </div>\
        <div id="downloaddetails"></div>\
        <div id="btnarea">\
                <a class="btn" id="dlbtn" href="#">Download</a\
                ><a class="btn" id="inbrowserbtn" target="_blank" href="#">View In Browser</a\
                ><a class="btn" id="deletebtn" href="#">Delete</a>\
        </div>\
      </div>\
    ',
    init: function () {
      $(document).on('click', '#editpaste', this.editpaste.bind(this))
    },
    route: function (route, content) {
        if (content != 'noref') {
            return this
        }
    },
    render: function (view) {
        view.html(this.template)
        this._ = {}
        this._.view = view
        this._.detailsarea = view.find('#downloaddetails')
        this._.filename = view.find('#downloaded_filename')
        this._.btns = view.find('#btnarea')
        this._.deletebtn = view.find('#deletebtn')
        this._.dlbtn = view.find('#dlbtn')
        this._.viewbtn = view.find('#inbrowserbtn')
        this._.viewswitcher = view.find('.viewswitcher')
        this._.newupload = view.find('#newupload')
        this._.editpaste = view.find('#editpaste')
        this._.dlarea = view.find('#dlarea')
        this._.title = $('title')
        $('#footer').hide()
    },
    initroute: function (content) {
        delete this._['text']
        this._.filename.hide()
        this._.title.text("Up1")
        this._.btns.hide()
        this._.editpaste.hide()
        this._.newupload.hide()
        this._.content = {}
        this._.content.main = this._.content.loading = $('<h1>').prop('id', 'downloadprogress').text('Downloading')
        this._.detailsarea.empty().append(this._.content.main)
        this._.deletebtn.hide()
        upload.updown.download(content, this.progress.bind(this), this.downloaded.bind(this))
    },
    unrender: function () {
        this._.title.text('Up1')
        delete this['_']
    },
    // Only mimes in this assocation list will end up with a "View in browser" button
    assocations: {
      'application/javascript': 'text',
      'application/x-javascript': 'text',
      'application/xml': 'text',
      'image/': 'image',
      // PDF for now only offers 'view in browser'
      'application/pdf': 'pdf',
      'application/x-pdf': 'pdf',
      'text/': 'text',
      'audio/': 'audio',
      'video/': 'video'
    },
    // Mime types to use for "View in browser" for safety reasons such as html we use text/plain
    // Other display types such as PDF and images you want native viewing so we leave those
    safeassocations: {
        'text': 'text/plain'
    },
    getassociation: function(mime) {
        for (var key in this.assocations) {
            if (mime.startsWith(key)) {
                return this.assocations[key]
            }
        }
    },
    downloaded: function (data) {
        this._.filename.text(data.header.name)
        this._.title.text(data.header.name + ' - Up1')

        var stored = this.delkeys[data.ident]

        if (!stored) {
            try {
                stored = localStorage.getItem('delete-' + data.ident)
            } catch (e) {
                console.log(e)
            }
        }

        if (stored && !isiframed()) {
            this._.deletebtn.show().prop('href', (upload.config.server ? upload.config.server : '') + 'del?delkey=' + stored + '&ident=' + data.ident)
        }

        this._.newupload.show()

        var association = this.getassociation(data.header.mime)

        var safemime = this.safeassocations[association]

        var decrypted = new Blob([data.decrypted], { type: safemime ? safemime : data.header.mime })

        var url = URL.createObjectURL(decrypted)

        this._.viewbtn.prop('href', url).hide()
        this._.dlbtn.prop('href', url)
        this._.dlbtn.prop('download', data.header.name)

        delete this._['content']
        this._.detailsarea.empty()

        if (!!association) {
            this._.viewbtn.show()
        }

        if (association == 'image') {
            var imgcontent = $('<div>').prop('id', 'previewimg').addClass('preview').appendTo(this._.detailsarea)

            var previewimg = $('<img>').addClass('dragresize').appendTo(imgcontent).prop('src', url)
      } else if (association == 'text') {
            var textcontent = $('<div>').prop('id', 'downloaded_text').addClass('preview').addClass('previewtext').appendTo(this._.detailsarea)

            var linenos = $('<div>').prop('id', 'linenos').appendTo(textcontent)

            var pre = $('<pre>').appendTo(textcontent)

            var code = $('<code>').appendTo(pre)

            var fr = new FileReader()

            fr.onload = function () {

                var text = fr.result

                this._.text = {}

                this._.text.header = data.header

                this._.text.data = text

                code.text(text)

                hljs.highlightBlock(code[0])

                var length = text.split(/\r\n|\r|\n/).length

                for (var i = 0; i < length; i++) {
                    linenos.append((i + 1) + '<br>')
                }

            }.bind(this)
            fr.readAsText(data.decrypted)

            this._.editpaste.show()
      } else if (association == 'video') {
            $('<video>').addClass('preview').prop('controls', true).prop('autoplay', true).appendTo(this._.detailsarea).prop('src', url)
      } else if (association == 'audio') {
            $('<audio>').addClass('preview').prop('controls', true).prop('autoplay', true).appendTo(this._.detailsarea).prop('src', url)
        } else {
            var dlarea = $('<div>').addClass('preview').addClass('downloadarea').appendTo(this._.detailsarea)
            $('<h1>').text(data.header.name).appendTo(dlarea)
            $('<p>').text('No preview available').appendTo(dlarea)
			var bigdlbtn = $('<a>').addClass('bigbtn').prop('href', url).appendTo(dlarea)
			$('<a>').addClass('linebrBefore').text('Download').appendTo(bigdlbtn)
        }
        this._.filename.show()
        this._.btns.show()
    },
    cldivsepaste: function() {
      this._.dlarea.show()
    },
    editpaste: function() {
      this._.dlarea.hide()
      upload.textpaste.render(this._.view, this._.text.header.name, this._.text.data, this._.text.header.mime, this.closepaste.bind(this))
    },
    progress: function (e) {
        if (e == 'decrypting') {
            this._.content.loading.text('Decrypting')
        } else if (e == 'error') {
          this._.content.loading.text('File not found or corrupt')
          this._.newupload.show()
        } else {
            var text = ''
            if (e.eventsource != 'encrypt') {
                text = 'Downloading'
            } else {
                text = 'Decrypting'
            }
            var percent = (e.loaded / e.total) * 100
            this._.content.loading.text(text + ' ' + Math.floor(percent) + '%')
        }
    }
})
