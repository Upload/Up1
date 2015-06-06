$(function () {
    var dragging

    var lastx
    var lasty

    $(document).on('dblclick', '.dragresize', function (e) {
        var target = $(e.target)
        target.toggleClass('full')
        if (target.hasClass('full')) {
            target.addClass('dragged')
            target.width(e.target.naturalWidth)
            target.height(e.target.naturalHeight)
        } else {
            target.removeClass('dragged')
            target.width('auto')
            target.height('auto')
        }
    })

    $(document).on('mousedown', '.dragresize', function(e) {
        if (e.which != 1) {
            return
        }
        e.preventDefault();
        dragging = $(e.target)
        dragging.addClass('dragging')
        lastx = e.pageX
        lasty = e.pageY
    })

    $(document).on('mousemove', function (e) {
        if (!dragging) {
            return
        }
        
        e.preventDefault();
        var newx = e.pageX - lastx
        var newy = e.pageY - lasty

        
        var width = dragging.width()
        var height = dragging.height()

        dragging.addClass('dragged')

        if (Math.abs(newx) > Math.abs(newy)) {
            dragging.width(width + newx)
            dragging.height('auto')
        } else {
            dragging.height(height + newy)
            dragging.width('auto')
        }


        lastx = e.pageX
        lasty = e.pageY

    })

    $(document).on('mouseup', function (e) {
        if (!dragging) {
            return
        }
        dragging.removeClass('dragging')
        dragging = undefined
    });
})