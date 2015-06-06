$(function () {
    var dragging

    var lastx
    var lasty

    var dragsizew
    var dragsizeh

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
        dragsizew = e.target.naturalWidth
        dragsizeh = e.target.naturalHeight

        if (dragsizew > dragsizeh) {
            minw = 100
            minh = 100 * (dragsizeh / dragsizew)
        } else {
            minh = 100
            minw = 100 * (dragsizew / dragsizeh)
        }

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
            dragging.css({ 'width': Math.max(width + newx, minw) + 'px', 'height': 'auto' })
        } else {
            dragging.css({ 'height': Math.max(height + newy, minh) + 'px', 'width': 'auto' })
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