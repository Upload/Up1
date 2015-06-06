$(function () {
    var dragging

    var lastx
    var lasty

    var dragsizew
    var dragsizeh

    var minw
    var minh

    var maxw
    var maxh

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

    $(document).on('mousedown touchstart', '.dragresize', function (e) {
        if (e.which && e.which != 1) {
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
            maxw = dragsizew * 10
            maxh = (dragsizew * 10) * (dragsizeh / dragsizew)
        } else {
            minh = 100
            minw = 100 * (dragsizew / dragsizeh)
            maxh = dragsizeh * 10
            maxw = (dragsizeh * 10) * (dragsizew / dragsizeh)
        }

        lastx = e.pageX
        lasty = e.pageY
    })

    $(document).on('mousemove touchmove', function (e) {
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
            dragging.css({ 'width': Math.min(maxw, Math.max(width + (width * (.0025 * newx)), minw)) + 'px', 'height': 'auto' })
        } else {
            dragging.css({ 'height': Math.min(maxh, Math.max(height + (height * (.0025 * newy)), minh)) + 'px', 'width': 'auto' })
        }


        lastx = e.pageX
        lasty = e.pageY

    })

    $(document).on('mouseup touchend', function (e) {
        if (!dragging) {
            return
        }
        dragging.removeClass('dragging')
        dragging = undefined
    });
})