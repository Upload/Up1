var g = {}

$(function () {
    var pastearea = $('#pastearea')
    var uploadprogress = $('#uploadprogress')
    var filepicker = $('#filepicker')
    var progress = $('#progressamount')
    var progressbg = $('#progressamountbg')

    function progressdo(e) {
        var percent = (e.loaded / e.total) * 100
        progressbg.css('width', percent + '%');
        progress.text(Math.floor(percent) + '%')
    }

    function encrypted(data) {
        var formdata = new FormData()
        formdata.append('privkey', 'c61540b5ceecd05092799f936e27755f')
        formdata.append('ident', data.ident)
        formdata.append('file', data.encrypted)
        $.ajax({
            url: 'https://e.3d3.ca/up',
            data: formdata,
            cache: false,
            processData: false,
            contentType: false,
            xhr: function () {
                var xhr = new XMLHttpRequest()
                xhr.upload.addEventListener('progress', progressdo, false)
                return xhr
            },
            type: 'POST'
        }).done(function () {
            progress.text('Encrypting')
            progressbg.css('width', 0);
            pastearea.removeClass('hidden')
            uploadprogress.addClass('hidden')
            window.location  = '#' + data.seed
        })
    }

    function doupload(file) {
        pastearea.addClass('hidden')
        uploadprogress.removeClass('hidden')
        crypt.encrypt(file).done(encrypted)
    }

    pastearea.on('drop', function (e) {
        e.preventDefault()
        pastearea.removeClass('dragover')
        doupload(e.originalEvent.dataTransfer.files[0])
    })

    pastearea.on('dragleave', function (e) {
        e.preventDefault()
        e.stopPropagation()
        pastearea.removeClass('dragover')
    })

    pastearea.on('dragover', function (e) {
        e.preventDefault()
        e.stopPropagation()
        pastearea.addClass('dragover')
    })

    pastearea.click(function () {
        $('#filepicker').click()
    })

    function dataURItoBlob(dataURI) {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
        var byteString = atob(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        // write the ArrayBuffer to a blob, and you're done
        return new Blob([ab], { type: mimeString });
    }

    // Hack to make firefox catch pastes
    var pasteCatcher = $('<pre>').prop('id', 'pastecatcher')
    pasteCatcher.prop('contenteditable', true)
    $('body').append(pasteCatcher)

    g.focusPaste = function() {
        setTimeout(function () {
            pasteCatcher.focus();
            pasteCatcher.click()
        }, 100);
    }

    $(document).on('click', function (e) {
        if (e.target == document.body) {
            e.preventDefault()
            g.focusPaste();
        }
    })

    g.focusPaste();


    $(document).on('paste', function (e) {
        if (!pastearea.is(':visible')) {
            e.preventDefault()
            return
        }
        var items = e.originalEvent.clipboardData.items

        if (typeof items == 'undefined') {
            var text = e.originalEvent.clipboardData.getData('text/plain')
            if (!text) {
                setTimeout(function () {
                    if (pasteCatcher.find('img').length) {
                        var src = pasteCatcher.find('img').prop('src')
                        if (src.startsWith('data:')) {
                            doupload(dataURItoBlob(src))
                        } else {
                            alert("Firefox (I assume) basically pasted that as a direct embed to the image, we could download then upload it maybe like imgur does")
                        }
                    }
                }, 0)
            } else {
                doupload(new Blob([text], { type: 'text/plain' }))
            }
        } else if (items.length >= 1) {
            e.preventDefault()

            for (var i = 0; i < items.length; i++) {
                var blob = items[i].getAsFile()

                if (!blob && i == items.length - 1) {
                    items[0].getAsString(function (d) {
                        doupload(new Blob([d], { type: 'text/plain' }))
                    })
                    break
                } else if (blob) {
                    doupload(blob)
                    break;
                }
            }

        }
    })

    filepicker.on('change', function (e) {
        doupload(e.target.files[0])
    })

});