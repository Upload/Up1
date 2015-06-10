$(function () {
    var upview = $('#uploadview')
    var viewswitcher = $('#viewswitcher')
    var footer = $('#footer')
    var downview = $('#downloadview')
    var previewimg = $('#previewimg')
    var previewtext = $('#downloaddetails>#previewtext')
    var previewfilename = $('#downloaddetails>#filename')
    var details = $('#downloaddetails')
    var linenos = $('#downloaddetails #linenos')

    var dlbtn = $('#dlbtn')
    var deletebtn = $('#deletebtn')
    var viewbtn = $('#inbrowserbtn')

    function hashchanged() {
        if (window.location.hash && window.location.hash != '#') {
            upview.addClass('hidden')
            viewswitcher.addClass('hidden')
            footer.addClass('hidden')
            previewtext.addClass('hidden')
            previewimg.addClass('hidden')
            downview.removeClass('hidden')
            deletebtn.hide()

            var seed = window.location.hash.substring(1)

            function embed(data) {
                console.log("bbb");

                previewfilename.text(data.header.name)

                console.log(data.header.name)

                var url = URL.createObjectURL(data.decrypted)

                viewbtn.prop('href', url)
                dlbtn.prop('href', url)
                dlbtn.prop('download', data.header.name)

                if (data.header.mime.startsWith('image/')) {
                    previewimg.find('img').prop('src', url)
                    previewimg.removeClass('hidden')
                } else if (data.header.mime.startsWith('text/')) {
                    var fr = new FileReader()

                    fr.onload = function () {

                        var text = fr.result

                        previewtext.removeClass('hidden')
                        previewtext.find('code').text(text)
                        hljs.highlightBlock(previewtext.find('code')[0])

                        var linenumbers = linenos.empty()

                        var length = text.split(/\r\n|\r|\n/).length

                        for (var i = 0; i < length; i++) {
                            linenumbers.append((i + 1) + '<br>')
                        }

                    }
                    fr.readAsText(data.decrypted)
                } else if (data.header.mime.startsWith('video/')) {
                    details.find('video.preview').removeClass('hidden').prop('src', url)
                } else if (data.header.mime.startsWith('audio/')) {
                    details.find('audio.preview').removeClass('hidden').prop('src', url)
                } else {
                    // Unknown, todo
                }
                $('#downloadprogress').text('').hide()
                details.removeClass('hidden')
            }

            function downloaded() {
                console.log("aaa");
                $('#downloadprogress').text('Decrypting')
                crypt.decrypt(this.response, seed).done(embed)
            }

            function downloadprogress(e) {
                var percent = (e.loaded / e.total) * 100
                $('#downloadprogress').text(Math.floor(percent) + '%')
            }

            function failed() {
                window.location = '#'
            }

            function downloadfromident(ident) {


                var stored = localStorage.getItem('delete-' + ident.ident)

                if (stored) {
                    deletebtn.show().prop('href', (g.config.server ? g.config.server : '') + 'del?delkey=' + stored + '&ident=' + ident.ident)
                }

                var xhr = new XMLHttpRequest()
                xhr.onload = downloaded
                xhr.open('GET', (g.config.server ? g.config.server : '') + 'i/' + ident.ident)
                xhr.responseType = 'blob'
                xhr.onerror = failed
                xhr.addEventListener('progress', downloadprogress, false)
                xhr.send()
            }

            details.find('.preview').addClass('hidden')
            details.find('img').removeClass('dragged').removeClass('dragging').width('auto').height('auto')
            details.find('video.preview').prop('src', '')
            details.find('audio.preview').prop('src', '')
            previewimg.prop('src', '')
            previewtext.find('code').empty()
            details.addClass('hidden')
            upview.addClass('hidden')
            viewswitcher.addClass('hidden')
            footer.addClass('hidden')
            $('#downloadprogress').show().text('Loading')

            crypt.ident(seed).done(downloadfromident)
        } else {
            upview.removeClass('hidden')
            viewswitcher.removeClass('hidden')
            footer.removeClass('hidden')
            details.find('.preview').addClass('hidden')
            details.addClass('hidden')
            downview.addClass('hidden')
            details.find('video.preview').prop('src', '')
            details.find('audio.preview').prop('src', '')
            previewimg.prop('src', '')
            previewtext.find('code').empty()
            g.focusPaste()
        }
    }

    $(window).on('hashchange', hashchanged)
    hashchanged();

});
