package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"sync"
)

type Config struct {
	Listen      string `json:"listen"`
	ApiKey      string `json:"api_key"`
	DeleteKey   string `json:"delete_key"`
	MaxFileSize int64  `json:"maximum_file_size"`

	Http struct {
		Enabled bool   `json:"enabled"`
		Listen  string `json:"listen"`
	} `json:"http"`

	Https struct {
		Enabled bool   `json:"enabled"`
		Listen  string `json:"listen"`
		Cert    string `json:"cert"`
		Key     string `json:"key"`
	} `json:"https"`

	CfCacheInvalidate struct {
		Enabled bool   `json:"enabled"`
		Token   string `json:"token"`
		Email   string `json:"email"`
		Domain  string `json:"domain"`
		Url     string `json:"url"`
	} `json:"cloudflare-cache-invalidate"`
}

var config Config

type ErrorMessage struct {
	Error string `json:"error"`
	Code  int    `json:"code"`
}

type SuccessMessage struct {
	Delkey string `json:"delkey"`
}

func readConfig() Config {
	file, _ := os.Open("server.conf")
	decoder := json.NewDecoder(file)
	config := Config{}
	err := decoder.Decode(&config)
	if err != nil {
		fmt.Println("Error reading config: ", err)
	}
	return config
}

func validateConfig(config Config) {
	if !config.Http.Enabled && !config.Https.Enabled {
		log.Fatal("At least one of http or https must be enabled!")
	}
	if len(config.ApiKey) == 0 {
		log.Fatal("A static key must be defined in the configuration!")
	}
	if len(config.DeleteKey) == 0 {
		log.Fatal("A static delete key must be defined in the configuration!")
	}
}

func makeDelkey(ident string) string {
	key := []byte(config.DeleteKey)
	h := hmac.New(sha256.New, key)
	h.Write([]byte(ident))
	return hex.EncodeToString(h.Sum(nil))
}

func index(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/" {
		http.ServeFile(w, r, "index.html")
	} else if r.URL.Path == "/config.js" {
		http.ServeFile(w, r, "config.js")
	} else {
		http.NotFound(w, r)
	}
}

func upload(w http.ResponseWriter, r *http.Request) {
	if r.ContentLength > config.MaxFileSize {
		msg, _ := json.Marshal(&ErrorMessage{Error: "File size too large", Code: 1})
		w.Write(msg)
		return
	}

	r.ParseMultipartForm(50000000)
	file, _, err := r.FormFile("file")

	if err != nil {
		msg, _ := json.Marshal(&ErrorMessage{Error: err.Error(), Code: 5})
		w.Write(msg)
		return
	}

	defer file.Close()

	apikey := r.FormValue("api_key")
	if apikey != config.ApiKey {
		msg, _ := json.Marshal(&ErrorMessage{Error: "API key doesn't match", Code: 2})
		w.Write(msg)
		return
	}

	ident := r.FormValue("ident")
	if len(ident) != 22 {
		msg, _ := json.Marshal(&ErrorMessage{Error: "Ident filename length is incorrect", Code: 3})
		w.Write(msg)
		return
	}

	identPath := path.Join("i", path.Base(ident))
	if _, err := os.Stat(identPath); err == nil {
		msg, _ := json.Marshal(&ErrorMessage{Error: "Ident is already taken.", Code: 4})
		w.Write(msg)
		return
	}

	out, err := os.Create(identPath)
	if err != nil {
		msg, _ := json.Marshal(&ErrorMessage{Error: err.Error(), Code: 6})
		w.Write(msg)
		return
	}

	defer out.Close()

	out.Write([]byte{'U', 'P', '!', 0})
	_, err = io.Copy(out, file)
	if err != nil {
		msg, _ := json.Marshal(&ErrorMessage{Error: err.Error(), Code: 7})
		w.Write(msg)
		return
	}

	delkey := makeDelkey(ident)

	result, err := json.Marshal(&SuccessMessage{Delkey: delkey})
	if err != nil {
		msg, _ := json.Marshal(&ErrorMessage{Error: err.Error(), Code: 8})
		w.Write(msg)
	}
	w.Write(result)
}

func delfile(w http.ResponseWriter, r *http.Request) {
	ident := r.FormValue("ident")
	delkey := r.FormValue("delkey")

	if len(ident) != 22 {
		msg, _ := json.Marshal(&ErrorMessage{Error: "Ident filename length is incorrect", Code: 3})
		w.Write(msg)
		return
	}

	identPath := path.Join("i", ident)
	if _, err := os.Stat(identPath); os.IsNotExist(err) {
		msg, _ := json.Marshal(&ErrorMessage{Error: "Ident does not exist.", Code: 9})
		w.Write(msg)
		return
	}

	if delkey != makeDelkey(ident) {
		msg, _ := json.Marshal(&ErrorMessage{Error: "Incorrect delete key", Code: 10})
		w.Write(msg)
		return
	}

	if config.CfCacheInvalidate.Enabled {
		if config.Http.Enabled {
			cfInvalidate(ident, false)
		}
		if config.Https.Enabled {
			cfInvalidate(ident, true)
		}
	}

	os.Remove(identPath)
	http.Redirect(w, r, "/", 301)
}

func cfInvalidate(ident string, https bool) {
	var invUrl string
	if https {
		invUrl = "https://" + config.CfCacheInvalidate.Url
	} else {
		invUrl = "http://" + config.CfCacheInvalidate.Url
	}
	invUrl += "/i/" + ident

	if _, err := http.PostForm("https://www.cloudflare.com/api_json.html", url.Values{
		"a":     {"zone_file_purge"},
		"tkn":   {config.CfCacheInvalidate.Token},
		"email": {config.CfCacheInvalidate.Email},
		"z":     {config.CfCacheInvalidate.Domain},
		"url":   {invUrl},
	}); err != nil {
		log.Printf("Cache invalidate failed for '%s': '%s'", ident, err.Error())
	}
}

func main() {
	http.HandleFunc("/", index)
	http.HandleFunc("/up", upload)
	http.HandleFunc("/del", delfile)
	http.Handle("/static/", http.StripPrefix("/static", http.FileServer(http.Dir("static"))))
	http.Handle("/i/", http.StripPrefix("/i", http.FileServer(http.Dir("i"))))

	config = readConfig()
	validateConfig(config)

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		if config.Http.Enabled {
			log.Printf("Starting HTTP server on %s\n", config.Http.Listen)
			log.Println(http.ListenAndServe(config.Http.Listen, nil))
		}
	}()

	go func() {
		defer wg.Done()
		if config.Https.Enabled {
			log.Printf("Starting HTTPS server on %s\n", config.Https.Listen)
			log.Println(http.ListenAndServeTLS(config.Https.Listen, config.Https.Cert, config.Https.Key, nil))
		}
	}()

	wg.Wait()
}
