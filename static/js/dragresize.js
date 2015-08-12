$(function () {
    window.dragresize = true

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

    var MIN_WIDTH_PX = 100
    var MAX_WIDTH_RATIO = 100

    $(document).on('mousedown', '.dragresize', function (e) {
        if (e.which && e.which != 1) {
            return
        }
        e.preventDefault();
        dragging = $(e.target)
        dragging.addClass('dragging')
        dragsizew = e.target.naturalWidth
        dragsizeh = e.target.naturalHeight

        if (dragsizew > dragsizeh) {
            minw = MIN_WIDTH_PX
            minh = MIN_WIDTH_PX * (dragsizeh / dragsizew)
            maxw = dragsizew * MAX_WIDTH_RATIO
            maxh = (dragsizew * MAX_WIDTH_RATIO) * (dragsizeh / dragsizew)
        } else {
            minh = MIN_WIDTH_PX
            minw = MIN_WIDTH_PX * (dragsizew / dragsizeh)
            maxh = dragsizeh * MAX_WIDTH_RATIO
            maxw = (dragsizeh * MAX_WIDTH_RATIO) * (dragsizew / dragsizeh)
        }

        lastx = e.clientX
        lasty = e.clientY
    })

    $(document).on('mousemove', function (e) {
        if (!dragging) {
            return
        }

        var px = e.clientX
        var py = e.clientY

        var newx = px - lastx
        var newy = py - lasty

        if (Math.abs(newx) < 1 && Math.abs(newy) < 1) {
            return;
        }

        e.preventDefault();

        var width = dragging.width()
        var height = dragging.height()

        dragging.addClass('dragged')

        if (Math.abs(newx) > Math.abs(newy)) {
            dragging.css({ 'width': Math.min(maxw, Math.max(width + (width * (.0025 * newx)), minw)) + 'px', 'height': 'auto' })
        } else {
            dragging.css({ 'height': Math.min(maxh, Math.max(height + (height * (.0025 * newy)), minh)) + 'px', 'width': 'auto' })
        }


        lastx = px
        lasty = py

    })

    $(document).on('mouseup', function (e) {
        if (!dragging) {
            return
        }
        dragging.removeClass('dragging')
        dragging = undefined
    });
})
