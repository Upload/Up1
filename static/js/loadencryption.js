var crypt = {}

$(function () {
    function getEntropy() {
        var entropy = new Uint32Array(64)
        window.crypto.getRandomValues(entropy)
        return entropy
    }

    function getSeed() {
        var seed = new Uint8Array(16)
        window.crypto.getRandomValues(seed)
        return seed
    }

    var worker = new Worker("/static/js/encryption.js")


    var promises = {}

    function str2ab(str) {
        var buf = new ArrayBuffer(str.length * 2);
        var bufView = new DataView(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView.setUint16(i * 2, str.charCodeAt(i), false)
        }
        return buf;
    }

    worker.onmessage = function (e) {
        promises[e.data.id].resolve(e.data)
        delete promises[e.data.id]
    }

    var counter = 0

    function getpromise() {
        var promise = $.Deferred()
        var promiseid = counter
        counter += 1
        promise.id = promiseid
        promises[promiseid] = promise;
        return promise
    }

    crypt.encrypt = function (file) {

        var header = JSON.stringify({
            'mime': file.type,
            'name': file.name ? file.name : ('Pasted ' + (file.type.startsWith('text/') ? 'text' : 'file'))
        })

        var length = new ArrayBuffer(2);

        var dv = new DataView(length).setUint16(0, header.length, false)

        var blob = new Blob([length, str2ab(header), file])

        var promise = getpromise()

        var fr = new FileReader()

        fr.onload = function () {
            worker.postMessage({
                'data': this.result,
                'entropy': getEntropy(),
                'seed': getSeed(),
                'id': promise.id
            })
        }

        fr.readAsArrayBuffer(blob)

        return promise
    }


    crypt.ident = function (seed) {
        var promise = getpromise()

        worker.postMessage({
            'seed': seed,
            'action': 'ident',
            'id': promise.id
        })

        return promise
    }


    crypt.decrypt = function (file, seed) {
        var promise = getpromise()

        var fr = new FileReader()

        fr.onload = function () {
            worker.postMessage({
                'data': this.result,
                'action': 'decrypt',
                'seed': seed,
                'id': promise.id
            })
        }

        fr.readAsArrayBuffer(file)

        return promise
    }
})