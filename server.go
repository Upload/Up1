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
	"os"
	"path"
)

type Config struct {
	Listen      string `json:"listen"`
	StaticKey   string `json:"static_key"`
	DeleteKey   string `json:"static_delete_key"`
	MaxFileSize int64  `json:"maximum_file_size"`

	Ssl struct {
		Enabled bool `json:"enabled"`
		Listen string `json:"listen"`
		Cert string `json:"cert"`
		Key string `json:"key"`
	} `json:"ssl"`

	CfCacheInvalidate struct {
		Enabled bool `json:"enabled"`
		Token string `json:"token"`
		Email string `json:"email"`
		Domain string `json:"domain"`
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
	fmt.Printf("%+v\n", config)
	return config
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

	privkey := r.FormValue("privkey")
	if privkey != config.StaticKey {
		msg, _ := json.Marshal(&ErrorMessage{Error: "Static key doesn't match", Code: 2})
		w.Write(msg)
		return
	}

	ident := r.FormValue("ident")
	if len(ident) != 22 {
		msg, _ := json.Marshal(&ErrorMessage{Error: "Ident filename length is incorrect", Code: 3})
		w.Write(msg)
		return
	}

	identPath := path.Join("i", ident)
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

	os.Remove(identPath)
	http.Redirect(w, r, "/", 301)
}

func main() {
	http.HandleFunc("/", index)
	http.HandleFunc("/up", upload)
	http.HandleFunc("/del", delfile)
	http.Handle("/static/", http.StripPrefix("/static", http.FileServer(http.Dir("static"))))
	http.Handle("/i/", http.StripPrefix("/i", http.FileServer(http.Dir("i"))))
	config = readConfig()
	fmt.Printf("Listening on %s\n", config.Listen)
	log.Fatal(http.ListenAndServe(config.Listen, nil))
}
