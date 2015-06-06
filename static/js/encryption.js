importScripts('/static/deps/sjcl.min.js')

function parametersfrombits(seed) {
    var out = sjcl.hash.sha512.hash(seed)
    return {
        'seed': seed,
        'key': sjcl.bitArray.bitSlice(out, 0, 256),
        'iv': sjcl.bitArray.bitSlice(out, 256, 384),
        'ident': sjcl.bitArray.bitSlice(out, 384, 512)
    }
}

function parameters(seed) {
    if (typeof seed == 'string') {
        seed = sjcl.codec.base64url.toBits(seed)
    } else {
        seed = sjcl.codec.bytes.toBits(seed)
    }
    return parametersfrombits(seed)
}

function encrypt(file, seed, id) {
    var params = parameters(seed)
    var uarr = new Uint8Array(file)
    var before = sjcl.codec.bytes.toBits(uarr)
    var prp = new sjcl.cipher.aes(params.key)
    var after = sjcl.mode.ccm.encrypt(prp, before, params.iv)
    var afterarray = new Uint8Array(sjcl.codec.bytes.fromBits(after))
    postMessage({
        'id': id,
        'seed': sjcl.codec.base64url.fromBits(params.seed),
        'ident': sjcl.codec.base64url.fromBits(params.ident),
        'encrypted': new Blob([afterarray], { type: 'application/octet-stream' })
    })
}

function decode_utf8(s) {
    return decodeURIComponent(escape(s));
}

function decrypt(file, seed, id) {
    var params = parameters(seed)
    var uarr = new Uint8Array(file)
    var before = sjcl.codec.bytes.toBits(uarr);
    var prp = new sjcl.cipher.aes(params.key);
    var after = sjcl.mode.ccm.decrypt(prp, before, params.iv);
    var afterarray = new Uint8Array(sjcl.codec.bytes.fromBits(after));

    var header = ''

    var headerview = new DataView(afterarray.buffer)

    var i = 0;
    for (; ; i++) {
        var num = headerview.getUint16(i * 2, false)
        if (num == 0) {
            break;
        }
        header += String.fromCharCode(num);
    }

    console.log(header)

    var header = JSON.parse(header)

    var data = new Blob([afterarray])

    postMessage({
        'id': id,
        'header': header,
        'decrypted': data.slice((i * 2) + 2, data.size, header.mime)
    })
}

function ident(seed, id) {
    var params = parameters(seed)
    postMessage({
        'id': id,
        'ident': sjcl.codec.base64url.fromBits(params.ident)
    })
}


onmessage = function (e) {
    if (e.data.action == 'decrypt') {
        decrypt(e.data.data, e.data.seed, e.data.id)
    } else if (e.data.action == 'ident') {
        ident(e.data.seed, e.data.id);
    } else {
        sjcl.random.addEntropy(e.data.entropy, 2048, 'runtime')
        encrypt(e.data.data, e.data.seed, e.data.id)
    }
}