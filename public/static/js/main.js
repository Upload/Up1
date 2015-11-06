upload = {}
// Configure in config.js
upload.config = {}

upload.modules = {
    modules: [],
    addmodule: function (module) {
        this.modules.unshift(module)
        upload[module.name] = module
    },
    initmodule: function (module) {
        module.init()
    },
    setdefault: function (module) {
        this.default = module
    },
    init: function () {
        this.modules.forEach(this.initmodule.bind(this))
    }
}

upload.modules.addmodule({
    name: 'contactlink',
    init: function() {
        $('#contact').prop('href', upload.config.contact_link)
    }
})

upload.modules.addmodule({
    name: 'route',
    init: function () {
        $(window).on('hashchange', this.hashchange.bind(this))
        this.hashchange()
    },
    setroute: function (module, routeroot, route) {
        view = $('.modulecontent.modulearea')
        if (!this.currentmodule || this.currentmodule != module) {
            // TODO: better
            if (this.currentmodule) {
                this.currentmodule.unrender()
            }
            this.currentmodule = module
            view.prop('id', 'module_' + module.name)
            module.render(view)
        }
        module.initroute(route, routeroot)
    },
    tryroute: function (route) {
        var isroot = route.startsWith('/')
        var normalroute = isroot ? route.substring(1) : route
        var route = normalroute.substr(normalroute.indexOf('/') + 1)
        var routeroot = normalroute.substr(0, normalroute.indexOf('/'))
        var chosenmodule
        if (!normalroute) {
            chosenmodule = upload.modules.default
        } else {
            upload.modules.modules.every(function (module) {
                if (!module.route) {
                    return true
                }
                if (module.route(routeroot, route)) {
                    chosenmodule = module
                    return false
                }
                return true
            })
        }
        if (!chosenmodule) {
            chosenmodule = upload.modules.default
        }
        setTimeout(this.setroute.bind(this, chosenmodule, routeroot, route), 0)
    },
    hashchange: function () {
        this.tryroute(window.location.hash.substring(1))
    }
})

$(function () {
    if (typeof upload.config.api_key != 'undefined') {
        upload.modules.init()
    } else {
        alert("Please configure with config.js (see config.js.example) - No API key")
    }
})
