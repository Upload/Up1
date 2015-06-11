upload.modules.addmodule({
    name: 'textpaste',
    init: function () {
      $(document).on('submit', '#textview', this.save.bind(this))
      $(document).on('click', '#retbtn', this.closethis.bind(this))
      $(document).on('keydown', this.keypress.bind(this))
    },
    keypress: function(e) {
      if (!this.current) {
        return
      }

      if (!(e.keyCode == 83 && (e.ctrlKey || e.metaKey))) {
        return
      }

      this.current[0].submit()
      event.preventDefault()
    },
    save: function(e) {
      e ? e.preventDefault() : undefined
      upload.route.setroute(upload.home)
      upload.home.doupload(new File([$(e.target).find('textarea').val()],
      $(e.target).find('#create_filename').val(),
        {
          type: $(e.target).find('#create_mime').val()
        }
      ))
    },
    closethis: function(closeback) {
      var closeback = this.closeback
      delete this['closeback']
      this.current.remove()
      delete this['current']
      closeback()
    },
    render: function(view, filename, data, mime, closeback) {
      var main = $('<form>').prop('id', 'textview').prop('autocomplete', 'off')

      main.appendTo(view)

      this.closeback = closeback
      this.current = main

      main.append($('<div>').addClass('viewswitcher').append(
        $('<button>').prop('type', 'submit').text('Save').addClass('btn')
      ).append(
        $('<a>').prop('id', 'retbtn').text('Return').addClass('btn')
      ))

      var filenamefield = $('<input>').prop('id', 'create_filename').val(filename)

      var mimefield = $('<input>').prop('hidden', true).prop('id', 'create_mime').val(mime)

      main.append(filenamefield).append(mimefield)

      var area = $('<textarea>')

      var text  = $('<div>').prop('id', 'create_text').addClass('previewtext preview')
        .append($('<div>').prop('id', 'create_linenos').append("&gt;"))
        .append(area)

        main.append(text)


        area.val(data).focus()[0].setSelectionRange(0, 0)

        area.scrollTop(0)
    }
})
