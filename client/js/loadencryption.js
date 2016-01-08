window.crypt = {}

var crypto = window.crypto || window.msCrypto;

function getEntropy() {
    var entropy = new Uint32Array(256)
    crypto.getRandomValues(entropy)
    return entropy
}

function getSeed() {
    var seed = new Uint8Array(16)
    crypto.getRandomValues(seed)
    return seed
}

var worker = new Worker("./js/encryption.js")


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
    if (e.data.type == 'progress') {
        promises[e.data.id].notify(e.data)
    } else {
        promises[e.data.id].resolve(e.data)
        delete promises[e.data.id]
    }
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

crypt.encrypt = function (file, name) {

    var extension = file.type.split('/')

    var header = JSON.stringify({
        'mime': file.type,
        'name': name ? name : (file.name ? file.name : ('Pasted ' + extension[0] + '.' + (extension[1] == 'plain' ? 'txt' : extension[1])))
    })

    var zero = new Uint8Array([0, 0]);

    var blob = new Blob([str2ab(header), zero, file])

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
