$(function () {
    var viewswitcher = $('#viewswitcher');
    var vs_text = $('#viewswitcher>#text');
    var vs_save = $('#viewswitcher>#save');

    var uploadview = $('#uploadview');
    var textview = $('#textview');
    var textarea = $('#create_text textarea');
    var filename = $('#create_filename');

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
            url: (g.config.server ? g.config.server : '') + 'up',
            data: formdata,
            cache: false,
            processData: false,
            contentType: false,
            dataType: 'json',
            xhr: function () {
                var xhr = new XMLHttpRequest()
                xhr.upload.addEventListener('progress', progressdo, false)
                return xhr
            },
            type: 'POST'
    }).done(function (response) {
      progressbg.css('width', 0);
      pastearea.removeClass('hidden')
      uploadprogress.addClass('hidden')
      localStorage.setItem('delete-' + data.ident, response.delkey)
      window.location = '#' + data.seed
    })
  }
  
  function doupload(file) {
    viewswitcher.addClass('hidden');
    textview.addClass('hidden');
    vs_save.addClass("hidden");
    vs_text.removeClass("hidden");
    textarea.val('');
    
    uploadprogress.removeClass('hidden');
    progress.text('Encrypting');
    crypt.encrypt(file, filename.val() || "Pasted text.txt").done(encrypted);
  }
  
  viewswitcher.click(function() {
    console.log(filename.val());
    if (vs_text.hasClass("hidden")) {
        alert(textarea.val())
      if (textarea.val() != "")
        doupload(new Blob([textarea.val()], { type: 'text/plain' }))
    } else {
      vs_text.addClass("hidden");
      uploadview.addClass("hidden");
      
      vs_save.removeClass("hidden");
      textview.removeClass("hidden");
      
      textarea.select();
    }
  });
})
