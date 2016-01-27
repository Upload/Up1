(function(window) {
  "use strict";
  window.upload = {}
}(window));


(function(upload) {
  upload.config = {}

  upload.load = {
    loaded: 0,
    doneloaded: function() {
      this.loaded -= 1
      if (this.loaded <= 0) {
        this.cb()
      }
    },
    load: function(filename, test, onload) {
      if (test && test()) {
        return false
      }
      var head = document.getElementsByTagName('head')[0]
      var script = document.createElement('script')
      script.src = './' + filename
      script.async = true
      script.onload = onload
      head.appendChild(script)
      return true
    },
    needsome: function() {
      this.loaded += 1
      return this
    },
    done: function(callback) {
      this.loaded -= 1
      this.cb = callback
      return this
    },
    then: function(callback) {
      this.deferred.then(callback)
      return this
    },
    need: function(filename, test) {
      this.loaded += 1
      if(!this.load(filename, test, this.doneloaded.bind(this))) {
        this.loaded -= 1
      }
      return this
    }
  }

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
      name: 'footer',
      init: function() {
          $('#footer').html(upload.config.footer)
      }
  })

  upload.modules.addmodule({
      name: 'route',
      init: function () {
          window.addEventListener('hashchange', this.hashchange.bind(this))
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
              view.id = 'module_' + module.name
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
}(window.upload));


(function () {
upload.load.needsome().need('config.js').need('js/shims.js').need('deps/zepto.min.js').done(function() {
    upload.load.needsome().need('js/home.js', function() {return upload.home}).done(function() {
      if (typeof upload.config != 'undefined') {
          upload.modules.init()
      } else {
          alert("Please configure with config.js (see config.js.example)")
      }
    })
})
}(upload))
