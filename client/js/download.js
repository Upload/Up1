upload.load.need('js/dragresize.js', function() { return window.dragresize })

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
                ><a class="btn" id="deletebtn" href="#">Delete</a\
                ><div class="right"><a class="btn" id="prevbtn" href="#">Prev</a\
                ><a class="btn" id="nextbtn" href="#">Next</a></div>\
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
        this._.nextbtn = view.find('#nextbtn')
        this._.prevbtn = view.find('#prevbtn')
        this._.viewbtn = view.find('#inbrowserbtn')
        this._.viewswitcher = view.find('.viewswitcher')
        this._.newupload = view.find('#newupload')
        this._.editpaste = view.find('#editpaste')
        this._.dlarea = view.find('#dlarea')
        this._.title = $('title')
        $('#footer').hide()
    },
    initroute: function (content, contentroot) {
        contentroot = contentroot ? contentroot : content
        this._.nextbtn.hide()
        this._.prevbtn.hide()
        if (contentroot.indexOf('&') > -1) {
          var which = 0
          var values = contentroot.split('&')
          var howmany = values.length
          if (content != contentroot) {
            which = parseInt(content) - 1
          }
          content = values[which]
          this._.nextbtn.attr('href', '#' + contentroot + '/' + (which + 2))
          this._.prevbtn.attr('href', '#' + contentroot + '/' + (which))
          if (!(which >= howmany - 1)) {
            this._.nextbtn.show()
          }
          if (!(which <= 0)) {
            this._.prevbtn.show()
          }
        }
        console.log(contentroot)
        delete this._['text']
        this._.filename.hide()
        this._.title.text("Up1")
        this._.btns.hide()
        this._.editpaste.hide()
        this._.newupload.hide()
        this._.content = {}
        this._.content.main = this._.content.loading = $('<h1>').prop('id', 'downloadprogress').addClass('centertext centerable').text('Downloading')
        this._.detailsarea.empty().append(this._.content.main)
        this._.deletebtn.hide()
        upload.updown.download(content, this.progress.bind(this), this.downloaded.bind(this))
    },
    unrender: function () {
        this._.title.text('Up1')
        delete this['_']
    },
    /* These mimes are trusted, anything not on this list will not embed
       nor provide view in browser links.  Some embed exceptions apply
       like svg will embed but will not directly link and pdf vice versa.
       ALl text mime types support view in browser and translate to text/plain */
    assocations: {
      'application/javascript': 'text',
      'application/x-javascript': 'text',
      'application/xml': 'text',
      'image/svg+xml': 'svg',
      // PDF for now only offers 'view in browser'
      'application/pdf': 'pdf',
      'application/x-pdf': 'pdf',
      'text/plain': 'text',
      'audio/aac': 'audio',
      'audio/mp4': 'audio',
      'audio/mpeg': 'audio',
      'audio/ogg': 'audio',
      'audio/wav': 'audio',
      'audio/webm': 'audio',
      'video/mp4': 'video',
      'video/ogg': 'video',
      'video/webm': 'video',
      'audio/wave': 'audio',
      'audio/wav': 'audio',
      'audio/x-wav': 'audio',
      'audio/x-pn-wav': 'audio',
      'audio/vnd.wave': 'audio',
      'image/tiff': 'image',
      'image/x-tiff': 'image',
      'image/bmp': 'image',
      'image/x-windows-bmp': 'image',
      'image/gif': 'image',
      'image/x-icon': 'image',
      'image/jpeg': 'image',
      'image/pjpeg': 'image',
      'image/png': 'image',
      'image/webp': 'image',
      'text/': 'text'
    },
    // Mime types to use for "View in browser" for safety reasons such as html we use text/plain
    // Other display types such as PDF and images you want native viewing so we leave those
    // SVG can be unsafe for viewing in a browser directly
    safeassocations: {
        'text': 'text/plain',
        'svg': 'text/plain'
    },
    getassociation: function(mime) {
        for (var key in this.assocations) {
            if (mime.startsWith(key)) {
                return this.assocations[key]
            }
        }
    },
    setupLineNumbers: function(ele) {
      var markup = ele.html()
      ele.html('<div class="line">' + markup.replace(/\n/g, '</div><div class="line">') + '</div>')
      ele.find('.line').each(function(i, e) {
        $(e).prepend($('<span>').addClass('linenum').text(i + 1))
      })
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

        var decrypted = new Blob([data.decrypted], { type: data.header.mime })

        var safedecrypted = new Blob([decrypted], { type:  safemime ? safemime : data.header.mime })

        var url = URL.createObjectURL(decrypted)

        var safeurl = URL.createObjectURL(safedecrypted)

        this._.viewbtn.prop('href', safeurl).hide()
        this._.dlbtn.prop('href', url)
        this._.dlbtn.prop('download', data.header.name)

        delete this._['content']
        this._.detailsarea.empty()

        if (!!association) {
            this._.viewbtn.show()
        }

        if (association == 'image' || association == 'svg') {
            var imgcontent = $('<div>').prop('id', 'previewimg').addClass('preview centerable').appendTo(this._.detailsarea)

            var previewimg = $('<img>').addClass('dragresize').appendTo(imgcontent).prop('src', url)
      } else if (association == 'text') {
            var textcontent = $('<div>').prop('id', 'downloaded_text').addClass('preview').addClass('previewtext').appendTo(this._.detailsarea)

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

                this.setupLineNumbers(code)

            }.bind(this)
            fr.readAsText(data.decrypted)

            this._.editpaste.show()
      } else if (association == 'video') {
            $('<div>').addClass('preview centerable').append($('<video>').prop('controls', true).prop('autoplay', true).prop('src', url)).appendTo(this._.detailsarea)
      } else if (association == 'audio') {
            $('<div>').addClass('preview centerable').append($('<audio>').prop('controls', true).prop('autoplay', true).prop('src', url)).appendTo(this._.detailsarea)
        } else {
            $('<div>').addClass('preview').addClass('downloadexplain centerable centertext').text("Click the Download link in the bottom-left to download this file.").appendTo(this._.detailsarea)
        }
        this._.filename.show()
        this._.btns.show()
    },
    closepaste: function() {
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
