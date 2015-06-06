$(function () {
    var upview = $('#uploadview')
    var downview = $('#downloadview')
    var previewimg = $('#previewimg')
    var previewtext = $('#previewtext')
    var previewfilename = $('#filename')
    var details = $('#downloaddetails')

    var dlbtn = $('#dlbtn')
    var viewbtn = $('#inbrowserbtn')
    
    function hashchanged() {
        if (window.location.hash && window.location.hash != '#') {
            upview.addClass('hidden')
            previewtext.addClass('hidden')
            previewimg.addClass('hidden')
            downview.removeClass('hidden')

            var seed = window.location.hash.substring(1)

            function embed(data) {
                details.find('.preview').addClass('hidden')
                details.find('video.preview').prop('src', '')
                details.find('audio.preview').prop('src', '')
                previewimg.prop('src', '')
                previewtext.find('code').empty()

                previewfilename.text(data.header.name)
               
                var url = URL.createObjectURL(data.decrypted)

                viewbtn.prop('href', url)
                dlbtn.prop('href', url)
                dlbtn.prop('download', data.header.name)

                if (data.header.mime.startsWith('image/')) {
                    previewimg.prop('src', url)
                    previewimg.removeClass('hidden')
                } else if (data.header.mime.startsWith('text/')) {
                    var fr = new FileReader()

                    fr.onload = function () {
                        
                        var text = fr.result

                        previewtext.removeClass('hidden')
                        previewtext.find('code').text(text)
                        hljs.highlightBlock(previewtext.find('code')[0])
                    }
                    fr.readAsText (data.decrypted)
                } else if (data.header.mime.startsWith('video/')) {
                    details.find('video.preview').removeClass('hidden').prop('src', url)
                } else if (data.header.mime.startsWith('audio/')) {
                    details.find('audio.preview').removeClass('hidden').prop('src', url)
                } else {
                    // Unknown, todo
                }

                details.removeClass('hidden')
            }

            function downloaded() {
                crypt.decrypt(this.response, seed).done(embed)
            }

            function downloadfromident(ident) {
                var xhr = new XMLHttpRequest();
                xhr.onload = downloaded
                xhr.open('GET', 'https://e.3d3.ca/i/' + ident.ident);
                xhr.responseType = 'blob';
                xhr.send();
            }

            crypt.ident(seed).done(downloadfromident)
        } else {
            upview.removeClass('hidden')
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