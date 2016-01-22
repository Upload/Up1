upload.load.need('js/download.js', function() { return upload.download })
upload.load.need('js/textpaste.js', function() { return upload.textpaste })
upload.load.need('js/loadencryption.js', function() { return window.crypt })
upload.load.need('js/updown.js', function() { return upload.updown })

upload.modules.addmodule({
    name: 'home',
    // Dear santa, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/template_strings
    template: '\
        <div class="topbar">\
        <div class="viewswitcher">\
            <a id="newpaste" class="btn">New Paste</a>\
        </div>\
        </div>\
        <div class="contentarea" id="uploadview">\
            <div class="centerview">\
            <div id="pastearea" class="boxarea">\
                <h1>Upload</h1>\
            </div>\
            <div class="hidden boxarea" id="uploadprogress">\
                <h1 id="progresstype"></h1>\
                <h1 id="progressamount"></h1>\
                <div id="progressamountbg"></div>\
            </div>\
            <div class="hidden" id="uploadfinish">\
                <h1><a href="" id="finallink">Link</a></h1>\
            </div>\
            <form>\
                <input type="file" id="filepicker" class="hidden" />\
            </form>\
            </div>\
        </div>',
    init: function () {
        upload.modules.setdefault(this)
        $(document).on('change', '#filepicker', this.pickerchange.bind(this))
        $(document).on('click', '#pastearea', this.pickfile.bind(this))
        $(document).on('dragover', '#pastearea', this.dragover.bind(this))
        $(document).on('dragleave', '#pastearea', this.dragleave.bind(this))
        $(document).on('drop', '#pastearea', this.drop.bind(this))
        $(document).on('click', '#newpaste', this.newpaste.bind(this))
        $(document).on('click', this.triggerfocuspaste.bind(this))
        this.initpastecatcher()
        $(document).on('paste', this.pasted.bind(this))
    },
    dragleave: function (e) {
        e.preventDefault()
        e.stopPropagation()
        this._.pastearea.removeClass('dragover')
    },
    drop: function (e) {
        e.preventDefault()
        this._.pastearea.removeClass('dragover')
        if (e.dataTransfer.files.length > 0) {
            this.doupload(e.dataTransfer.files[0])
        }
    },
    dragover: function (e) {
        e.preventDefault()
        this._.pastearea.addClass('dragover')
    },
    pickfile: function(e) {
        this._.filepicker.click()
    },
    pickerchange: function(e) {
        if (e.target.files.length > 0) {
            this.doupload(e.target.files[0])
            $(e.target).parents('form')[0].reset()
        }
    },
    route: function (route, content) {
        if (content && content != 'noref') {
            return upload.download
        }
        return this
    },
    render: function (view) {
        view.html(this.template)
        this._ = {}
        this._.view = view
        this._.filepicker = view.find('#filepicker')
        this._.pastearea = view.find('#pastearea')
        this._.newpaste = view.find('#newpaste')
        this._.progress = {}
        this._.progress.main = view.find('#uploadprogress')
        this._.progress.type = view.find('#progresstype')
        this._.progress.amount = view.find('#progressamount')
        this._.progress.bg = view.find('#progressamountbg')
        $('#footer').show()
    },
    initroute: function () {
        this.focuspaste()
    },
    unrender: function() {
        delete this['_']
    },
    initpastecatcher: function () {
        this.pastecatcher = $('<pre>').prop('id', 'pastecatcher')
        this.pastecatcher.prop('contenteditable', true)
        $('body').append(this.pastecatcher)
    },
    focuspaste: function () {
        setTimeout(function () {
            this.pastecatcher.focus()
        }, 100)
    },
    triggerfocuspaste: function(e) {
        if (e.which != 1) {
            return
        }

        if (e.target == document.body && this._ && !this._.pastearea.hasClass('hidden')) {
            e.preventDefault()
            this.focuspaste()
        }
    },
    progress: function(e) {
        if (e.eventsource != 'encrypt') {
            this._.progress.type.text('Uploading')
        } else {
            this._.progress.type.text('Encrypting')
        }
        var percent = (e.loaded / e.total) * 100
        this._.progress.bg.css('width', percent + '%')
        this._.progress.amount.text(Math.floor(percent) + '%')
    },
    doupload: function (blob) {
        this._.pastearea.addClass('hidden')
        this._.progress.main.removeClass('hidden')
        this._.progress.type.text('Encrypting')
        this._.progress.bg.css('width', 0)
        this._.newpaste.addClass('hidden')
        upload.updown.upload(blob, this.progress.bind(this), this.uploaded.bind(this))
    },
    closepaste: function() {
      this._.pastearea.removeClass('hidden')
      this._.view.find('#uploadview').show()
      this._.view.find('.viewswitcher').show()
    },
    dopasteupload: function (data) {
        this._.pastearea.addClass('hidden')
        this._.view.find('#uploadview').hide()
        this._.view.find('.viewswitcher').hide()
        upload.textpaste.render(this._.view, 'Pasted text.txt', data, 'text/plain', this.closepaste.bind(this))
    },
    uploaded: function (data, response) {
        upload.download.delkeys[data.ident] = response.delkey

        try {
            localStorage.setItem('delete-' + data.ident, response.delkey)
        } catch (e) {
            console.log(e)
        }

        if (window.location.hash == '#noref') {
            history.replaceState(undefined, undefined, '#' + data.seed)
            upload.route.setroute(upload.download, undefined, data.seed)
        } else {
            window.location = '#' + data.seed
        }
    },
    newpaste: function() {
        this.dopasteupload('')
    },
    pasted: function (e) {
        if (!this._ || this._.pastearea.hasClass('hidden')) {
            return
        }

        var items = e.clipboardData.items

        var text = e.clipboardData.getData('text/plain')

        if (text) {
            e.preventDefault()
            this.dopasteupload(text)
        } else if (typeof items == 'undefined') {
            self = this
            setTimeout(function () {
                if (self.pastecatcher.find('img').length) {
                    var src = self.pastecatcher.find('img').prop('src')
                    if (src.startsWith('data:')) {
                        self.doupload(dataURItoBlob(src))
                    } else {
                        // TODO: Firefox
                    }
                }
            }, 0)
        } else if (items.length >= 1) {
            e.preventDefault()

            for (var i = 0; i < items.length; i++) {
                var blob = items[i].getAsFile()
                if (blob) {
                    this.doupload(blob)
                    break
                }
            }

        }
    },
})
